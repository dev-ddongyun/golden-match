import { Hono } from "hono";
import { cors } from "hono/cors";
import { ratelimit } from "./middleware/ratelimit";
import chat from "./routes/chat";
import match from "./routes/match";
import escalate from "./routes/escalate";
import geo from "./routes/geo";

export const app = new Hono();

app.use(
  "*",
  cors({
    origin: process.env.CORS_ORIGIN ?? "*",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use("*", ratelimit);

app.get("/health", (c) => c.json({ ok: true }));
app.route("/api/chat", chat);
app.route("/api/match", match);
app.route("/api/escalate", escalate);
app.route("/api/geo", geo);

app.onError((err, c) => {
  console.error("[api] unhandled", err);
  return c.json({ error: "서버 내부 오류가 발생했습니다." }, 500);
});
