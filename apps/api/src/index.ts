import { app } from "./app";

const port = Number(process.env.PORT ?? 8787);

// Bun.serve (local dev only)
// @ts-expect-error Bun global
Bun.serve({
  port,
  fetch: app.fetch,
});

console.log(`[api] listening on http://localhost:${port}`);
