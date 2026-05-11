import { z } from "zod";
import { EscalateReasonLabel } from "./chat.js";

export const EscalateRequest = z.object({
  reason_label: EscalateReasonLabel,
  location_text: z.string().default(""),
  lat: z.number().optional(),
  lng: z.number().optional(),
});
export type EscalateRequest = z.infer<typeof EscalateRequest>;

export const EscalateResponse = z.object({
  reason_label: EscalateReasonLabel,
  reference_center: z.object({
    name: z.string(),
    address: z.string(),
    phone: z.string(),
  }),
  message: z.string(),
  disclaimer: z.string(),
});
export type EscalateResponse = z.infer<typeof EscalateResponse>;
