import { app } from "./_lib/app.js";

const port = Number(process.env.PORT ?? 8787);

Bun.serve({
  port,
  fetch: app.fetch,
});

console.log(`[api] dev server listening on http://localhost:${port}`);
