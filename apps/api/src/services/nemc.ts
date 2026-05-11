// 공공데이터 응급의료정보 (NEMC) — 3 operations
const BASE = "https://apis.data.go.kr/B552657/ErmctInfoInqireService";

function ensureArray<T = any>(v: any): T[] {
  if (v == null) return [];
  if (Array.isArray(v)) return v as T[];
  return [v as T];
}

// NOTE: getEgytListInfoInqire uses Q0/Q1; the other two use STAGE1/STAGE2.
async function callOp(
  op: string,
  stage1: string,
  stage2: string,
  paramNames: { s1: string; s2: string } = { s1: "STAGE1", s2: "STAGE2" },
): Promise<any[]> {
  const key = process.env.DATA_GO_KR_SERVICE_KEY;
  if (!key) return [];
  const url = `${BASE}${op}?serviceKey=${key}&${paramNames.s1}=${encodeURIComponent(stage1)}&${paramNames.s2}=${encodeURIComponent(stage2)}&pageNo=1&numOfRows=50&_type=json`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const text = await res.text();
    // some responses come back as XML on error; guard
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      return [];
    }
    const items = data?.response?.body?.items;
    if (!items) return [];
    return ensureArray(items.item);
  } catch {
    return [];
  }
}

export function getEgytList(stage1: string, stage2: string) {
  return callOp("/getEgytListInfoInqire", stage1, stage2, {
    s1: "Q0",
    s2: "Q1",
  });
}
export function getUsefulSickbed(stage1: string, stage2: string) {
  return callOp("/getEmrrmRltmUsefulSckbdInfoInqire", stage1, stage2);
}
export function getSevereAcceptance(stage1: string, stage2: string) {
  return callOp("/getSrsillDissAceptncPosblInfoInqire", stage1, stage2);
}
