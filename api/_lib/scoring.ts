import type { HospitalCandidate } from "./schema/index.js";

const W_AVAIL = 2;
const W_DEPT_NAME = 0.5; // weak signal (heuristic by name)
const W_ACCEPT_ANY = 0.3; // weak signal (any MKioskTy=Y → almost always true)
const W_DEPT_SEVERE = 5; // strong signal (real per-dept Y from NEMC)
const W_ETA = 0.2;

export interface ScoreOpts {
  maxBeds: number;
  hasCoords: boolean;
  /** True if suspected_dept maps to specific MKioskTy codes (i.e., dept_severe_label exists). */
  hasDeptSevereSignal: boolean;
}

export function scoreCandidate(c: HospitalCandidate, opts: ScoreOpts): number {
  const bedsNorm = opts.maxBeds > 0 ? c.available_beds / opts.maxBeds : 0;
  const deptName = c.dept_match ? 1 : 0;
  const acceptAny = c.accepts_severe ? 1 : 0;
  const deptSevere = c.dept_severe_available ? 1 : 0;
  const etaPenalty = opts.hasCoords && typeof c.eta_min === "number" ? c.eta_min : 0;
  const wEta = opts.hasCoords ? W_ETA : 0;
  const wDeptSevere = opts.hasDeptSevereSignal ? W_DEPT_SEVERE : 0;
  return (
    W_AVAIL * bedsNorm +
    W_DEPT_NAME * deptName +
    W_ACCEPT_ANY * acceptAny +
    wDeptSevere * deptSevere -
    wEta * etaPenalty
  );
}

export function rankCandidates(
  list: HospitalCandidate[],
  opts: { hasCoords: boolean },
): HospitalCandidate[] {
  if (list.length === 0) return [];

  // 가용 병상이 있는 응급실만 후보로 (없으면 fallback)
  const available = list.filter((c) => c.available_beds > 0);
  const working = available.length > 0 ? available : list;

  // Detect whether per-dept severe signal is available on any candidate.
  const hasDeptSevereSignal = working.some(
    (c) => typeof c.dept_severe_available === "boolean",
  );

  // Hard split: when the dept severe signal exists for the requested category,
  // prefer hospitals that actually accept it (true) over those that don't (false/unknown).
  let primaryPool = working;
  let fallbackPool: HospitalCandidate[] = [];
  if (hasDeptSevereSignal) {
    const yes = working.filter((c) => c.dept_severe_available === true);
    const rest = working.filter((c) => c.dept_severe_available !== true);
    if (yes.length > 0) {
      primaryPool = yes;
      fallbackPool = rest;
    }
  }

  const rank = (pool: HospitalCandidate[]) => {
    const maxBeds = pool.reduce((m, c) => Math.max(m, c.available_beds), 0);
    const sopts: ScoreOpts = { maxBeds, hasCoords: opts.hasCoords, hasDeptSevereSignal };
    const scored = pool.map((c) => ({ c, s: scoreCandidate(c, sopts) }));
    scored.sort((a, b) => {
      if (b.s !== a.s) return b.s - a.s;
      if (b.c.available_beds !== a.c.available_beds)
        return b.c.available_beds - a.c.available_beds;
      const aE = a.c.eta_min ?? Number.POSITIVE_INFINITY;
      const bE = b.c.eta_min ?? Number.POSITIVE_INFINITY;
      return aE - bE;
    });
    return scored.map((x) => x.c);
  };

  return [...rank(primaryPool), ...rank(fallbackPool)];
}
