import type { VercelRequest, VercelResponse } from "@vercel/node";
import { app } from "./_lib/app.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  const host = req.headers.host ?? "localhost";
  const url = new URL(req.url ?? "/", `https://${host}`);

  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (Array.isArray(v)) headers.set(k, v.join(", "));
    else if (typeof v === "string") headers.set(k, v);
  }

  let body: BodyInit | undefined;
  const method = req.method ?? "GET";
  if (method !== "GET" && method !== "HEAD") {
    const b = (req as any).body;
    if (b !== undefined && b !== null) {
      if (typeof b === "string") body = b;
      else if (Buffer.isBuffer(b)) body = new Uint8Array(b);
      else body = JSON.stringify(b);
    }
  }

  let response: Response;
  try {
    response = await app.fetch(
      new Request(url.toString(), { method, headers, body }),
    );
  } catch (err) {
    console.error("[api] handler error", err);
    res.status(500).json({ error: "서버 내부 오류가 발생했습니다." });
    return;
  }

  res.status(response.status);
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  if (!response.body) {
    res.end();
    return;
  }

  const reader = response.body.getReader();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
      const flush = (res as any).flush;
      if (typeof flush === "function") flush.call(res);
    }
  } catch (err) {
    console.error("[api] stream error", err);
  } finally {
    res.end();
  }
}
