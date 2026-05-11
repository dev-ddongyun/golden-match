import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { ChatRequest } from "@goldenmatch/schema";
import { streamGroqChat, GroqConfigError } from "../services/groq.js";
import { SYSTEM_PROMPT } from "../prompts.js";

const app = new Hono();

app.post("/", zValidator("json", ChatRequest), async (c) => {
  const body = c.req.valid("json");

  // Build a location-aware system prompt addendum
  const locParts: string[] = [];
  if (body.location_text) locParts.push(`사용자 위치(주소): ${body.location_text}`);
  if (typeof body.lat === "number" && typeof body.lng === "number") {
    locParts.push(
      `사용자 좌표: lat=${body.lat.toFixed(6)}, lng=${body.lng.toFixed(6)}`,
    );
  }
  const locationContext =
    locParts.length > 0
      ? `\n\n[사용자 컨텍스트]\n${locParts.join("\n")}\n위 위치 정보가 이미 제공되어 있으므로 "어디 계신가요"를 다시 묻지 말고, finalize_query 도구의 location_text 인자에 위 주소를 그대로 사용하세요.`
      : "";

  // Inject system prompt if not present
  const hasSystem = body.messages[0]?.role === "system";
  const systemContent = SYSTEM_PROMPT + locationContext;
  const messages = hasSystem
    ? body.messages
    : [{ role: "system", content: systemContent }, ...body.messages];

  let upstream: Response;
  try {
    upstream = await streamGroqChat(messages);
  } catch (e) {
    if (e instanceof GroqConfigError) {
      return c.json({ error: e.message }, e.status as any);
    }
    return c.json({ error: "AI 호출 중 오류가 발생했습니다." }, 502);
  }

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const dec = new TextDecoder();
      const reader = upstream.body!.getReader();
      let buffer = "";

      // Accumulated tool call state
      const toolCalls: Record<
        number,
        { name: string; argsBuf: string }
      > = {};
      let toolEmitted = false;
      let finishReason: string | null = null;

      const send = (data: string) => {
        controller.enqueue(enc.encode(data));
      };

      const tryEmitTool = (force = false) => {
        if (toolEmitted) return;
        const indices = Object.keys(toolCalls).map((n) => parseInt(n, 10));
        for (const idx of indices) {
          const tc = toolCalls[idx]!;
          if (!tc.name) continue;
          try {
            const parsed = JSON.parse(tc.argsBuf || "{}");
            if (force || finishReason === "tool_calls") {
              send(
                `event: tool\ndata: ${JSON.stringify({ name: tc.name, args: parsed })}\n\n`,
              );
              toolEmitted = true;
              return;
            }
          } catch {
            // not yet complete JSON
          }
        }
      };

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += dec.decode(value, { stream: true });

          // Process complete SSE lines
          let nlIdx: number;
          while ((nlIdx = buffer.indexOf("\n")) !== -1) {
            const line = buffer.slice(0, nlIdx).replace(/\r$/, "");
            buffer = buffer.slice(nlIdx + 1);
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload) continue;
            if (payload === "[DONE]") {
              tryEmitTool(true);
              continue;
            }
            let evt: any;
            try {
              evt = JSON.parse(payload);
            } catch {
              continue;
            }
            const choice = evt.choices?.[0];
            if (!choice) continue;
            const delta = choice.delta ?? {};
            if (typeof delta.content === "string" && delta.content.length > 0) {
              send(`data: ${delta.content}\n\n`);
            }
            if (Array.isArray(delta.tool_calls)) {
              for (const tc of delta.tool_calls) {
                const idx = tc.index ?? 0;
                if (!toolCalls[idx]) toolCalls[idx] = { name: "", argsBuf: "" };
                if (tc.function?.name) toolCalls[idx]!.name = tc.function.name;
                if (typeof tc.function?.arguments === "string")
                  toolCalls[idx]!.argsBuf += tc.function.arguments;
              }
            }
            if (choice.finish_reason) {
              finishReason = choice.finish_reason;
              if (finishReason === "tool_calls") tryEmitTool();
            }
          }
        }
        // Stream ended
        tryEmitTool(true);
      } catch (err) {
        send(`event: error\ndata: ${JSON.stringify({ error: String(err) })}\n\n`);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});

export default app;
