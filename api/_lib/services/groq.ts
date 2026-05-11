import { TOOLS } from "../prompts.js";

export class GroqConfigError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function streamGroqChat(
  messages: Array<{ role: string; content: string }>,
): Promise<Response> {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    throw new GroqConfigError("GROQ_API_KEY 환경 변수가 설정되지 않았습니다.", 400);
  }

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "openai/gpt-oss-20b",
      reasoning_effort: "low",
      temperature: 0.2,
      max_tokens: 160,
      stream: true,
      tools: TOOLS,
      tool_choice: "auto",
      messages,
    }),
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new GroqConfigError(
      `Groq API 호출에 실패했습니다. (${res.status}) ${text.slice(0, 200)}`,
      res.status >= 400 && res.status < 500 ? res.status : 502,
    );
  }

  return res;
}
