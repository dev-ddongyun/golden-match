import type { HospitalCandidate } from "./schema/index.js";

const W_AVAIL = 2;
const W_DEPT = 1.5;
const W_ACCEPT = 1;
const W_ETA = 0.2;

export interface ScoreOpts {
  maxBeds: number;
  hasCoords: boolean;
}

export function scoreCandidate(c: HospitalCandidate, opts: ScoreOpts): number {
  const bedsNorm = opts.maxBeds > 0 ? c.available_beds / opts.maxBeds : 0;
  const dept = c.dept_match ? 1 : 0;
  const accept = c.accepts_severe ? 1 : 0;
  const etaPenalty = opts.hasCoords && typeof c.eta_min === "number" ? c.eta_min : 0;
  const wEta = opts.hasCoords ? W_ETA : 0;
  return W_AVAIL * bedsNorm + W_DEPT * dept + W_ACCEPT * accept - wEta * etaPenalty;
}

export function rankCandidates(
  list: HospitalCandidate[],
  opts: { hasCoords: boolean },
): HospitalCandidate[] {
  if (list.length === 0) return [];

  // 가용 병상이 있는 응급실만 후보로 (없으면 fallback)
  const available = list.filter((c) => c.available_beds > 0);
  const working = available.length > 0 ? available : list;

  const maxBeds = working.reduce((m, c) => Math.max(m, c.available_beds), 0);
  const sopts: ScoreOpts = { maxBeds, hasCoords: opts.hasCoords };

  const scored = working.map((c) => ({ c, s: scoreCandidate(c, sopts) }));

  scored.sort((a, b) => {
    if (b.s !== a.s) return b.s - a.s;
    if (b.c.available_beds !== a.c.available_beds)
      return b.c.available_beds - a.c.available_beds;
    const aE = a.c.eta_min ?? Number.POSITIVE_INFINITY;
    const bE = b.c.eta_min ?? Number.POSITIVE_INFINITY;
    return aE - bE;
  });

  return scored.map((x) => x.c);
}
