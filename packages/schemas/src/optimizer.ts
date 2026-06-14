// Routine optimizer (Phase 3 / FR-O1) — the most assistant-like feature.
// Inputs: the current routine + fixed commitments + a new routine to insert.
// Output: a PROPOSED reshaped day with per-change reasoning. It proposes; the
// user confirms. Otto never silently rewrites the day (CLAUDE.md §1.11, spec §6.1).
import { z } from "zod";
import { idSchema, timeOfDaySchema, recurrenceSchema } from "./common";
import { routineSchema, routineAnchorKindSchema } from "./routine";

/** A new habit the user wants Otto to fit into their day. */
export const newRoutineRequestSchema = z.object({
  label: z.string().min(1).max(80),
  kind: routineAnchorKindSchema.default("custom"),
  durationMinutes: z.number().int().min(5).max(480),
  /** Free-text preference, e.g. "mornings, 4x a week, not before 6am". */
  preference: z.string().max(280).optional(),
  recurrence: recurrenceSchema,
});
export type NewRoutineRequest = z.infer<typeof newRoutineRequestSchema>;

/** A fixed, immovable commitment for the day (e.g. a work block). */
export const commitmentSchema = z.object({
  label: z.string().min(1).max(80),
  startTime: timeOfDaySchema,
  endTime: timeOfDaySchema,
});
export type Commitment = z.infer<typeof commitmentSchema>;

/** One change in the reshaped day. `move` shifts an existing anchor; `add` inserts the new one. */
export const scheduleChangeSchema = z.object({
  action: z.enum(["add", "move", "keep"]),
  label: z.string().min(1).max(80),
  kind: routineAnchorKindSchema,
  anchorId: idSchema.optional(),
  fromTime: timeOfDaySchema.optional(),
  toTime: timeOfDaySchema,
  reason: z.string().min(1).max(280),
});
export type ScheduleChange = z.infer<typeof scheduleChangeSchema>;

/** The optimizer's proposal: a short rationale plus the concrete changes. */
export const optimizationProposalSchema = z.object({
  summary: z.string().min(1).max(600),
  changes: z.array(scheduleChangeSchema).min(1),
});
export type OptimizationProposal = z.infer<typeof optimizationProposalSchema>;

export const optimizeRequestSchema = z.object({
  routine: routineSchema,
  newRoutine: newRoutineRequestSchema,
  commitments: z.array(commitmentSchema).max(50).optional(),
});
export type OptimizeRequest = z.infer<typeof optimizeRequestSchema>;

export const optimizeResponseSchema = z.object({
  proposal: optimizationProposalSchema,
});
export type OptimizeResponse = z.infer<typeof optimizeResponseSchema>;
