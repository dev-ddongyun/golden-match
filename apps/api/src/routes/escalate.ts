import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  EscalateRequest,
  type EscalateResponse,
  ESCALATE_MESSAGE,
  DISCLAIMER,
} from "@goldenmatch/schema";
import { coord2regioncode, searchAddress, searchKeyword } from "../services/kakao";
import { getEgytList } from "../services/nemc";

const app = new Hono();

const FALLBACK = {
  name: "가까운 권역응급의료센터",
  address: "위치 확인 어려움",
  phone: "119",
};

function fallbackStage(loc: string): { stage1: string; stage2: string } {
  const tokens = loc.split(/[\s,]+/).filter(Boolean);
  let stage1 = "";
  let stage2 = "";
  for (const t of tokens) {
    if (/(특별시|광역시|특별자치시|특별자치도|도)$/.test(t)) stage1 = t;
    else if (/(시|군|구)$/.test(t) && !stage2) stage2 = t;
  }
  return { stage1, stage2 };
}

app.post("/", zValidator("json", EscalateRequest), async (c) => {
  const body = c.req.valid("json");

  let stage1 = "";
  let stage2 = "";

  if (typeof body.lat === "number" && typeof body.lng === "number") {
    const r = await coord2regioncode(body.lng, body.lat);
    if (r) {
      stage1 = r.stage1;
      stage2 = r.stage2;
    }
  } else if (body.location_text) {
    const a =
      (await searchAddress(body.location_text)) ??
      (await searchKeyword(body.location_text));
    if (a) {
      const r = await coord2regioncode(a.lng, a.lat);
      if (r) {
        stage1 = r.stage1;
        stage2 = r.stage2;
      }
    }
    if (!stage1 && !stage2) {
      const fb = fallbackStage(body.location_text);
      stage1 = fb.stage1;
      stage2 = fb.stage2;
    }
  }

  let list = await getEgytList(stage1, stage2);
  if (list.length === 0 && stage2) list = await getEgytList(stage1, "");

  let ref = FALLBACK;
  if (list.length > 0) {
    const region = list.find((r: any) =>
      String(r.dutyName ?? "").includes("권역"),
    );
    const pick = region ?? list[0];
    ref = {
      name: pick.dutyName ?? FALLBACK.name,
      address: pick.dutyAddr ?? FALLBACK.address,
      phone: pick.dutyTel1 ?? pick.dutyTel3 ?? "119",
    };
  }

  const resp: EscalateResponse = {
    reason_label: body.reason_label,
    reference_center: ref,
    message: ESCALATE_MESSAGE,
    disclaimer: DISCLAIMER,
  };
  return c.json(resp);
});

export default app;
