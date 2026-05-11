import type { MiddlewareHandler } from "hono";

// Simple sliding-window in-memory rate limiter: 60 req / 60s per IP.
const WINDOW_MS = 60_000;
const LIMIT = 60;
const bucket = new Map<string, number[]>();

function getIp(c: Parameters<MiddlewareHandler>[0]): string {
  const xff = c.req.header("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  // Bun adapter exposes raw request; remote addr is not standardized — fallback to UA hash
  const ua = c.req.header("user-agent") ?? "anon";
  return `ua:${ua}`;
}

export const ratelimit: MiddlewareHandler = async (c, next) => {
  const ip = getIp(c);
  const now = Date.now();
  const arr = (bucket.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (arr.length >= LIMIT) {
    return c.json(
      { error: "요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요." },
      429,
    );
  }
  arr.push(now);
  bucket.set(ip, arr);
  await next();
};
