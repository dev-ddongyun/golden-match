import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@goldenmatch/schema": path.resolve(
        __dirname,
        "../../packages/schema/src/index.ts",
      ),
    },
  },
  server: {
    port: 5175,
    proxy: {
      "/api": "http://localhost:8787",
    },
  },
});
