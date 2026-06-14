// Briefings & nudges — the one coherent voice, spoken at routine-anchored moments.
import { z } from "zod";
import { idSchema, dateSchema, isoDateTimeSchema } from "./common";
import { contextItemSchema } from "./context";

export const briefingSlotSchema = z.enum(["morning", "midday", "evening"]);
export type BriefingSlot = z.infer<typeof briefingSlotSchema>;

export const nudgeKindSchema = z.enum([
  "payday-vs-bill",
  "med-refill",
  "overspend",
  "deviation",
  "general",
]);
export type NudgeKind = z.infer<typeof nudgeKindSchema>;

/**
 * A proactive cross-domain nudge. Tone stays supportive — `severity` never
 * escalates past "gentle" (spec §6.2: a kind nudge, never a scold).
 */
export const nudgeSchema = z.object({
  id: idSchema,
  kind: nudgeKindSchema,
  message: z.string().min(1).max(500),
  severity: z.enum(["info", "gentle"]).default("info"),
  relatedIds: z.array(idSchema).default([]),
});
export type Nudge = z.infer<typeof nudgeSchema>;

/** Free briefings are template-built; Pro briefings are LLM-reasoned. */
export const briefingSourceSchema = z.enum(["template", "llm"]);
export type BriefingSource = z.infer<typeof briefingSourceSchema>;

export const briefingSchema = z.object({
  id: idSchema,
  userId: idSchema,
  slot: briefingSlotSchema,
  date: dateSchema,
  summary: z.string().min(1),
  items: z.array(contextItemSchema).default([]),
  nudges: z.array(nudgeSchema).default([]),
  source: briefingSourceSchema,
  generatedAt: isoDateTimeSchema,
});
export type Briefing = z.infer<typeof briefingSchema>;
