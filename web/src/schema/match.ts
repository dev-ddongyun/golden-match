import { z } from "zod";
import { DeptEnum } from "./dept.js";

export const HospitalCandidate = z.object({
  name: z.string(),
  address: z.string(),
  phone: z.string(),
  available_beds: z.number().int(),
  dept_match: z.boolean(),
  accepts_severe: z.boolean().optional(),
  dept_severe_label: z.string().optional(),
  dept_severe_available: z.boolean().optional(),
  distance_km: z.number().optional(),
  eta_min: z.number().optional(),
  kakao_route_url: z.string(),
});
export type HospitalCandidate = z.infer<typeof HospitalCandidate>;

export const MatchRequest = z.object({
  location_text: z.string().min(1),
  lat: z.number().optional(),
  lng: z.number().optional(),
  suspected_dept: DeptEnum.default("일반"),
  severity_hints: z.array(z.string()).default([]),
  requires_severe: z.boolean().default(false),
});
export type MatchRequest = z.infer<typeof MatchRequest>;

export const MatchResponse = z.object({
  primary: HospitalCandidate,
  alternatives: z.array(HospitalCandidate).max(2),
  patient: z.object({
    location_text: z.string(),
    lat: z.number().optional(),
    lng: z.number().optional(),
    suspected_dept: DeptEnum,
  }),
  disclaimer: z.string(),
});
export type MatchResponse = z.infer<typeof MatchResponse>;
