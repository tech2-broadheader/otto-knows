// LLM write-back proposals (Phase 2 — "the brain"). The LLM never acts directly:
// it emits a proposal, the user confirms, and only then does the app apply it
// (CLAUDE.md §1.11 "proposes, you confirm"). These are the draft payloads the
// model produces (no id/userId/timestamps — the app stamps those on accept).
import { z } from "zod";
import {
  dateSchema,
  idSchema,
  isoDateTimeSchema,
  moneySchema,
  recurrenceSchema,
  timeOfDaySchema,
} from "./common";
import { NOTE_BODY_MAX, NOTE_TITLE_MAX } from "./notes";
import { eventDraftSchema } from "./appointments";
import { routineAnchorKindSchema } from "./routine";
import { aiUserContextSchema } from "./locale";

export const reminderDraftSchema = z.object({
  title: z.string().min(1).max(140),
  notes: z.string().max(2000).optional(),
  dueAt: isoDateTimeSchema.optional(),
  anchorId: idSchema.optional(),
  recurrence: recurrenceSchema.optional(),
});

export const expenseDraftSchema = z.object({
  amount: moneySchema.refine((m) => m.amountMinor > 0, { message: "amount must be positive" }),
  /** Optional wallet; when absent the app picks the last-used wallet, else Cash. */
  accountId: idSchema.optional(),
  categoryId: idSchema.optional(),
  description: z.string().max(280).optional(),
  occurredAt: isoDateTimeSchema,
});

export const billDraftSchema = z.object({
  name: z.string().min(1).max(140),
  amount: moneySchema,
  dueDate: dateSchema,
  recurrence: recurrenceSchema,
});

export const medicationDraftSchema = z.object({
  name: z.string().min(1).max(140),
  dosage: z.string().max(120).optional(),
  times: z.array(timeOfDaySchema).nonempty(),
  recurrence: recurrenceSchema,
});

export const timeBlockDraftSchema = z.object({
  title: z.string().min(1).max(140),
  startAt: isoDateTimeSchema,
  endAt: isoDateTimeSchema,
});

export const routineAnchorDraftSchema = z.object({
  label: z.string().min(1).max(80),
  kind: routineAnchorKindSchema,
  time: timeOfDaySchema,
  recurrence: recurrenceSchema,
});

/** A note to save (story 12.1). */
export const noteDraftSchema = z.object({
  title: z.string().min(1).max(NOTE_TITLE_MAX).optional(),
  body: z.string().min(1).max(NOTE_BODY_MAX),
});

/** Discriminated by `type` — one variant per write-back the LLM may propose. */
export const proposalActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("create_reminder"), reminder: reminderDraftSchema }),
  z.object({ type: z.literal("log_expense"), expense: expenseDraftSchema }),
  z.object({ type: z.literal("add_bill"), bill: billDraftSchema }),
  z.object({ type: z.literal("add_medication"), medication: medicationDraftSchema }),
  z.object({ type: z.literal("block_time"), block: timeBlockDraftSchema }),
  z.object({ type: z.literal("add_routine_anchor"), anchor: routineAnchorDraftSchema }),
  z.object({ type: z.literal("add_note"), note: noteDraftSchema }),
  z.object({ type: z.literal("create_event"), event: eventDraftSchema }),
]);
export type ProposalAction = z.infer<typeof proposalActionSchema>;
export type ProposalActionType = ProposalAction["type"];

export const proposalStatusSchema = z.enum(["proposed", "accepted", "rejected"]);
export type ProposalStatus = z.infer<typeof proposalStatusSchema>;

/** A single confirmable action with the model's plain-language rationale. */
export const proposalSchema = z.object({
  id: idSchema,
  action: proposalActionSchema,
  rationale: z.string().min(1).max(500),
  status: proposalStatusSchema.default("proposed"),
});
export type Proposal = z.infer<typeof proposalSchema>;

// --- Quick-add (natural language → proposals) ---
export const quickAddRequestSchema = z.object({
  text: z.string().min(1).max(1000),
  /** The user's timezone, currency and locale (story 13.2); absent from older apps. */
  user: aiUserContextSchema.optional(),
});
export type QuickAddRequest = z.infer<typeof quickAddRequestSchema>;

export const quickAddResponseSchema = z.object({
  proposals: z.array(proposalSchema).default([]),
});
export type QuickAddResponse = z.infer<typeof quickAddResponseSchema>;
