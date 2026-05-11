import { Hono } from "hono";
import { coord2address, coord2regioncode } from "../services/kakao.js";

const app = new Hono();

app.get("/reverse", async (c) => {
  const lng = Number(c.req.query("lng"));
  const lat = Number(c.req.query("lat"));
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    return c.json({ error: "lng, lat 쿼리가 필요합니다." }, 400);
  }
  const [addr, region] = await Promise.all([
    coord2address(lng, lat),
    coord2regioncode(lng, lat),
  ]);
  const road = addr?.road_address_name?.trim();
  const jibun = addr?.address_name?.trim();
  const fallback = region ? `${region.stage1} ${region.stage2}`.trim() : "";
  const display = road || jibun || fallback || "";
  return c.json({
    display,
    road_address: road ?? "",
    jibun_address: jibun ?? "",
    region: fallback,
  });
});

export default app;
