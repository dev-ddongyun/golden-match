import { z } from "zod";

export const DeptEnum = z.enum([
  "심정지/순환",
  "호흡",
  "외상",
  "신경",
  "흉통/심장",
  "소아",
  "산부인과",
  "화상",
  "중독",
  "정신",
  "일반",
]);
export type Dept = z.infer<typeof DeptEnum>;
