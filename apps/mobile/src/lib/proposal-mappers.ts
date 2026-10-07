// PURE draft → entity mappers for accepted proposals (Phase 2 — "the brain").
//
// Kept in their own module (schemas + constants only, NO native/db imports) so
// they are unit-tested in Node. Each stamps id/userId/createdAt/updatedAt and
// parses through the shared Zod schema, rejecting a malformed draft at the
// boundary. The side-effecting persistence lives in apply-proposal.ts, which
// re-exports these.
import {
  appointmentSchema,
  billSchema,
  medicationSchema,
  noteSchema,
  reminderSchema,
  routineAnchorSchema,
  transactionSchema,
  type Appointment,
  type Bill,
  type CurrencyCode,
  type Medication,
  type Note,
  type ProposalAction,
  type Reminder,
  type RoutineAnchor,
  type Transaction,
} from "@otto/schemas";
import { addMinutesToIso } from "@otto/core";
import { LOCAL_USER_ID, DEFAULT_CASH_ACCOUNT_ID } from "./constants";
import { timeLabel } from "./datetime";

/** Injected context so the mappers stay pure (no `Date.now`/native id inside). */
export type ApplyContext = {
  /** RFC-4122 v4 UUID factory (e.g. newUuid). */
  newId: () => string;
  /** Current instant as an ISO-8601 string with offset (e.g. nowIso()). */
  now: string;
  /** Owner of the created entity. Defaults to the local free-tier user. */
  userId?: string;
  /** Wallet for an expense whose draft names none (last-used, else Cash). */
  defaultAccountId?: string;
  /**
   * The user's home currency (ADR-007). Money from the LLM is recorded in it —
   * one currency per user, never converted.
   */
  currency?: CurrencyCode;
};

/** Stamp fields every persisted entity carries. */
function stamp(ctx: ApplyContext): {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
} {
  return {
    id: ctx.newId(),
    userId: ctx.userId ?? LOCAL_USER_ID,
    createdAt: ctx.now,
    updatedAt: ctx.now,
  };
}

/** `create_reminder` draft → a validated Reminder. */
export function reminderFromDraft(
  draft: Extract<ProposalAction, { type: "create_reminder" }>["reminder"],
  ctx: ApplyContext,
): Reminder {
  return reminderSchema.parse({
    ...stamp(ctx),
    title: draft.title,
    notes: draft.notes,
    dueAt: draft.dueAt,
    anchorId: draft.anchorId,
    recurrence: draft.recurrence,
    status: "pending",
  });
}

/** `log_expense` draft → a validated spending Transaction. */
export function transactionFromExpenseDraft(
  draft: Extract<ProposalAction, { type: "log_expense" }>["expense"],
  ctx: ApplyContext,
): Transaction {
  return transactionSchema.parse({
    ...stamp(ctx),
    type: "expense",
    amount: { ...draft.amount, currency: ctx.currency ?? draft.amount.currency },
    accountId: draft.accountId ?? ctx.defaultAccountId ?? DEFAULT_CASH_ACCOUNT_ID,
    categoryId: draft.categoryId,
    description: draft.description,
    occurredAt: draft.occurredAt,
  });
}

/** `add_note` draft → a validated, unpinned Note (story 12.1). */
export function noteFromDraft(
  draft: Extract<ProposalAction, { type: "add_note" }>["note"],
  ctx: ApplyContext,
): Note {
  return noteSchema.parse({
    ...stamp(ctx),
    title: draft.title,
    body: draft.body,
    pinned: false,
  });
}

/** `create_event` draft → a validated Otto appointment (story 12.4). */
export function appointmentFromDraft(
  draft: Extract<ProposalAction, { type: "create_event" }>["event"],
  ctx: ApplyContext,
): Appointment {
  return appointmentSchema.parse({
    ...stamp(ctx),
    title: draft.title,
    startAt: draft.startAt,
    // The draft schema guarantees one of the two is present.
    endAt: draft.endAt ?? addMinutesToIso(draft.startAt, draft.durationMinutes ?? 0),
    location: draft.location,
    notes: draft.notes,
    remindMinutesBefore: draft.remindMinutesBefore,
    destination: "otto",
  });
}

/**
 * The heads-up reminder before an appointment, or null when none was asked
 * for. A normal reminder, so existing notification scheduling fires it.
 */
export function reminderBeforeAppointment(
  appointment: Appointment,
  ctx: ApplyContext,
): Reminder | null {
  if (appointment.remindMinutesBefore === undefined) return null;
  return reminderSchema.parse({
    ...stamp(ctx),
    title: `${appointment.title} at ${timeLabel(appointment.startAt)}`.slice(0, 140),
    notes: appointment.location,
    dueAt: addMinutesToIso(appointment.startAt, -appointment.remindMinutesBefore),
    status: "pending",
  });
}

/** `add_bill` draft → a validated Bill. */
export function billFromDraft(
  draft: Extract<ProposalAction, { type: "add_bill" }>["bill"],
  ctx: ApplyContext,
): Bill {
  return billSchema.parse({
    ...stamp(ctx),
    name: draft.name,
    amount: { ...draft.amount, currency: ctx.currency ?? draft.amount.currency },
    dueDate: draft.dueDate,
    recurrence: draft.recurrence,
    isAutopay: false,
    isPaid: false,
  });
}

/** `add_medication` draft → a validated Medication. */
export function medicationFromDraft(
  draft: Extract<ProposalAction, { type: "add_medication" }>["medication"],
  ctx: ApplyContext,
): Medication {
  return medicationSchema.parse({
    ...stamp(ctx),
    name: draft.name,
    dosage: draft.dosage,
    times: draft.times,
    recurrence: draft.recurrence,
  });
}

/** `add_routine_anchor` draft → a validated RoutineAnchor (keyed by routine, no userId). */
export function anchorFromDraft(
  draft: Extract<ProposalAction, { type: "add_routine_anchor" }>["anchor"],
  ctx: ApplyContext,
): RoutineAnchor {
  return routineAnchorSchema.parse({
    id: ctx.newId(),
    label: draft.label,
    kind: draft.kind,
    time: draft.time,
    recurrence: draft.recurrence,
    createdAt: ctx.now,
    updatedAt: ctx.now,
  });
}

/**
 * `block_time` draft → a validated, timed Reminder. The local free tier has no
 * calendar write-back entity (calendar is read-only), so a blocked slot becomes
 * a one-off reminder pinned to its start, with the end time in `notes`.
 */
export function reminderFromTimeBlock(
  draft: Extract<ProposalAction, { type: "block_time" }>["block"],
  ctx: ApplyContext,
): Reminder {
  return reminderSchema.parse({
    ...stamp(ctx),
    title: draft.title,
    notes: `Blocked time until ${draft.endAt}`,
    dueAt: draft.startAt,
    recurrence: { freq: "once" },
    status: "pending",
  });
}
