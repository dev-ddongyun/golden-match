import { z } from "zod";
import { DeptEnum } from "./dept";

export const ChatMessage = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string(),
});
export type ChatMessage = z.infer<typeof ChatMessage>;

export const ChatRequest = z.object({
  messages: z.array(ChatMessage).min(1),
  location_text: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});
export type ChatRequest = z.infer<typeof ChatRequest>;

export const EscalateReasonLabel = z.enum([
  "의식",
  "호흡",
  "출혈",
  "경련",
  "외상",
  "영유아",
  "임신후기",
  "기타",
]);
export type EscalateReasonLabel = z.infer<typeof EscalateReasonLabel>;

export const FinalizeQueryArgs = z.object({
  location_text: z.string().min(1),
  suspected_dept: DeptEnum,
  severity_hints: z.array(z.string()).default([]),
});
export type FinalizeQueryArgs = z.infer<typeof FinalizeQueryArgs>;

export const EscalateArgs = z.object({
  reason_label: EscalateReasonLabel,
  location_text: z.string().default(""),
});
export type EscalateArgs = z.infer<typeof EscalateArgs>;

export const ToolDecision = z.discriminatedUnion("name", [
  z.object({ name: z.literal("finalize_query"), args: FinalizeQueryArgs }),
  z.object({ name: z.literal("escalate_to_119"), args: EscalateArgs }),
]);
export type ToolDecision = z.infer<typeof ToolDecision>;
