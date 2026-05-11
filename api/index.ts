import { handle } from "@hono/node-server/vercel";
import { app } from "../apps/api/src/app";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default handle(app);
