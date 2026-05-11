export interface SSEHandlers {
  onText?: (text: string) => void;
  onTool?: (tool: { name: string; args: Record<string, unknown> }) => void;
  onDone?: () => void;
}

/**
 * Parses an SSE stream from a fetch Response per the project convention:
 * - Plain `data: <chunk>` blocks → onText(chunk)
 * - Blocks with `event: tool` + `data: <json>` → onTool({name, args})
 *
 * Blocks are separated by a blank line (\n\n).
 */
export async function readSSE(
  response: Response,
  handlers: SSEHandlers,
): Promise<void> {
  if (!response.body) {
    throw new Error("응답에 본문이 없습니다.");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let sepIdx: number;
      while ((sepIdx = buffer.indexOf("\n\n")) !== -1) {
        const block = buffer.slice(0, sepIdx);
        buffer = buffer.slice(sepIdx + 2);
        processBlock(block, handlers);
      }
    }
    // flush any remaining block
    if (buffer.trim().length > 0) {
      processBlock(buffer, handlers);
    }
  } finally {
    handlers.onDone?.();
    reader.releaseLock();
  }
}

function processBlock(block: string, handlers: SSEHandlers) {
  const lines = block.split(/\r?\n/);
  let eventName: string | null = null;
  const dataLines: string[] = [];
  for (const raw of lines) {
    if (!raw) continue;
    if (raw.startsWith(":")) continue; // comment
    if (raw.startsWith("event:")) {
      eventName = raw.slice(6).trim();
    } else if (raw.startsWith("data:")) {
      dataLines.push(raw.slice(5).replace(/^ /, ""));
    }
  }
  if (dataLines.length === 0) return;
  const data = dataLines.join("\n");

  if (eventName === "tool") {
    try {
      const parsed = JSON.parse(data) as {
        name: string;
        args: Record<string, unknown>;
      };
      handlers.onTool?.(parsed);
    } catch (e) {
      console.warn("tool 이벤트 파싱 실패", e, data);
    }
    return;
  }

  // default text event
  if (data === "[DONE]") return;
  handlers.onText?.(data);
}
