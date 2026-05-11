import { handle } from "hono/vercel";
import { app } from "../apps/api/src/app";

export const config = {
  runtime: "nodejs",
};

export default handle(app);
