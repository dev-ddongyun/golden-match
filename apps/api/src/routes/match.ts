import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  MatchRequest,
  type HospitalCandidate,
  type MatchResponse,
  DISCLAIMER,
} from "@goldenmatch/schema";
import {
  searchAddress,
  searchKeyword,
  coord2regioncode,
  directions,
  buildRouteUrl,
} from "../services/kakao.js";
import {
  getEgytList,
  getUsefulSickbed,
  getSevereAcceptance,
} from "../services/nemc.js";
import { rankCandidates } from "../scoring.js";

const app = new Hono();

// Best-effort tokenizer for "○○동/구/시" when Kakao can't resolve.
function fallbackStage(loc: string): { stage1: string; stage2: string } {
  const tokens = loc.split(/[\s,]+/).filter(Boolean);
  let stage1 = "";
  let stage2 = "";
  for (const t of tokens) {
    if (/(특별시|광역시|특별자치시|특별자치도|도)$/.test(t)) stage1 = t;
    else if (/(시|군|구)$/.test(t) && !stage2) stage2 = t;
    else if (/동$/.test(t) && !stage2) {
      // 동 자체로는 STAGE2가 안 되지만, 일단 비워두고 STAGE1만 시도하게 함
    }
  }
  return { stage1, stage2 };
}

// Hospital dept keyword heuristic (very rough for MVP).
const DEPT_KEYWORDS: Record<string, string[]> = {
  "심정지/순환": ["대학", "권역", "센터"],
  호흡: ["대학", "권역"],
  외상: ["권역외상", "외상센터", "대학"],
  신경: ["신경", "대학", "권역"],
  "흉통/심장": ["심", "대학", "권역"],
  소아: ["소아", "어린이", "아동"],
  산부인과: ["산부", "여성", "모자"],
  화상: ["화상", "한강성심"],
  중독: ["대학", "권역"],
  정신: ["정신", "마음"],
  일반: [],
};

function deptMatch(name: string, dept: string): boolean {
  if (dept === "일반") return true;
  const kws = DEPT_KEYWORDS[dept] ?? [];
  if (kws.length === 0) return false;
  return kws.some((k) => name.includes(k));
}

function pickLatLng(rec: any): { lat: number; lng: number } | null {
  const latRaw = rec.wgs84Lat ?? rec.WGS84LAT ?? rec.latitude ?? rec.lat;
  const lngRaw = rec.wgs84Lon ?? rec.WGS84LON ?? rec.longitude ?? rec.lng;
  const lat = parseFloat(latRaw);
  const lng = parseFloat(lngRaw);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng };
}

function pickName(rec: any): string {
  return rec.dutyName ?? rec.hpName ?? rec.duty_name ?? "(이름 미상)";
}
function pickAddress(rec: any): string {
  return rec.dutyAddr ?? rec.addr ?? "";
}
function pickPhone(rec: any): string {
  return rec.dutyTel1 ?? rec.dutyTel3 ?? rec.tel ?? "";
}

function pickAvailableBeds(rec: any): number {
  // hvec: 응급실 가용 병상. fallback to general fields.
  const candidates = [rec.hvec, rec.hv27, rec.hv29, rec.hv30, rec.hv28];
  for (const v of candidates) {
    const n = parseInt(v, 10);
    if (!Number.isNaN(n)) return n;
  }
  return 0;
}

function pickSevereAccept(rec: any): boolean {
  // Severe op typically has many Y/N fields like MKioskTy* — true if any "Y"
  for (const [k, v] of Object.entries(rec)) {
    if (typeof v === "string" && v.trim().toUpperCase() === "Y") {
      if (k === "rnum" || k === "hpid") continue;
      return true;
    }
  }
  return false;
}

app.post("/", zValidator("json", MatchRequest), async (c) => {
  const body = c.req.valid("json");

  if (!process.env.DATA_GO_KR_SERVICE_KEY) {
    return c.json(
      { error: "공공데이터 응급의료 서비스 키가 설정되지 않았습니다." },
      400,
    );
  }

  // 1) Resolve coords + region
  let lat = body.lat;
  let lng = body.lng;
  let stage1 = "";
  let stage2 = "";

  if (typeof lat === "number" && typeof lng === "number") {
    const r = await coord2regioncode(lng, lat);
    if (r) {
      stage1 = r.stage1;
      stage2 = r.stage2;
    }
  } else {
    const a = await searchAddress(body.location_text);
    const k = a ?? (await searchKeyword(body.location_text));
    if (k) {
      lat = k.lat;
      lng = k.lng;
      const r = await coord2regioncode(k.lng, k.lat);
      if (r) {
        stage1 = r.stage1;
        stage2 = r.stage2;
      }
    }
  }

  if (!stage1 && !stage2) {
    const fb = fallbackStage(body.location_text);
    stage1 = fb.stage1;
    stage2 = fb.stage2;
  }

  // 2) Fetch NEMC 3 ops in parallel
  let [list, beds, severe] = await Promise.all([
    getEgytList(stage1, stage2),
    getUsefulSickbed(stage1, stage2),
    getSevereAcceptance(stage1, stage2),
  ]);
  // retry STAGE1 only
  if (list.length === 0 && stage2) {
    [list, beds, severe] = await Promise.all([
      getEgytList(stage1, ""),
      getUsefulSickbed(stage1, ""),
      getSevereAcceptance(stage1, ""),
    ]);
  }

  if (list.length === 0) {
    return c.json(
      { error: "해당 지역의 응급실 정보를 찾을 수 없습니다." },
      404,
    );
  }

  // 3) Build map by hpid
  const bedsByHpid = new Map<string, any>();
  for (const b of beds) bedsByHpid.set(String(b.hpid), b);
  const severeByHpid = new Map<string, any>();
  for (const s of severe) severeByHpid.set(String(s.hpid), s);

  const baseRecords = list.map((rec) => {
    const hpid = String(rec.hpid ?? "");
    const merged = {
      ...rec,
      ...(bedsByHpid.get(hpid) ?? {}),
    };
    const sevRec = severeByHpid.get(hpid);
    return { hpid, rec, merged, sevRec };
  });

  // 4) Top-10 directions (only those with coords + we have user coords)
  const hasUserCoords = typeof lat === "number" && typeof lng === "number";
  const top = baseRecords.slice(0, 10);
  const etaResults = await Promise.allSettled(
    top.map(async ({ rec }) => {
      const ll = pickLatLng(rec);
      if (!ll || !hasUserCoords) return null;
      return await directions(lng!, lat!, ll.lng, ll.lat);
    }),
  );
  const etaByIdx = new Map<number, { duration_sec: number; distance_m: number }>();
  etaResults.forEach((r, i) => {
    if (r.status === "fulfilled" && r.value) etaByIdx.set(i, r.value);
  });

  // 5) Map to HospitalCandidate
  const candidates: HospitalCandidate[] = baseRecords.map((b, i) => {
    const name = pickName(b.rec);
    const ll = pickLatLng(b.rec);
    const eta = etaByIdx.get(i);
    const accepts = b.sevRec ? pickSevereAccept(b.sevRec) : undefined;
    return {
      name,
      address: pickAddress(b.rec),
      phone: pickPhone(b.rec),
      available_beds: pickAvailableBeds(b.merged),
      dept_match: deptMatch(name, body.suspected_dept),
      accepts_severe: accepts,
      distance_km: eta ? +(eta.distance_m / 1000).toFixed(2) : undefined,
      eta_min: eta ? +(eta.duration_sec / 60).toFixed(1) : undefined,
      kakao_route_url: ll
        ? buildRouteUrl(name, ll.lat, ll.lng)
        : buildRouteUrl(name, 0, 0),
    };
  });

  const ranked = rankCandidates(candidates, { hasCoords: hasUserCoords });
  if (ranked.length === 0) {
    return c.json({ error: "후보 병원을 찾지 못했습니다." }, 404);
  }
  const primary = ranked[0]!;
  const alternatives = ranked.slice(1, 3);

  const resp: MatchResponse = {
    primary,
    alternatives,
    patient: {
      location_text: body.location_text,
      lat,
      lng,
      suspected_dept: body.suspected_dept,
    },
    disclaimer: DISCLAIMER,
  };
  return c.json(resp);
});

export default app;
