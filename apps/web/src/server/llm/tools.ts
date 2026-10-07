import { proposalActionSchema, proposalSchema, type Proposal } from "@otto/schemas";
import type { LlmToolCall, LlmToolDef } from "./client";

/**
 * Write-back tools the LLM may CALL to propose an action. Each call becomes a
 * confirmable Proposal — the proxy never executes it (CLAUDE.md §1.11). Input
 * schemas mirror the draft schemas in @otto/schemas; every tool also takes a
 * `rationale` so Otto explains, in plain language, why it's suggesting this.
 */

const recurrence = {
  type: "object",
  properties: {
    freq: {
      type: "string",
      enum: ["once", "daily", "weekdays", "weekends", "weekly", "monthly", "custom"],
    },
    daysOfWeek: {
      type: "array",
      items: { type: "string", enum: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] },
    },
    dayOfMonth: { type: "integer", minimum: 1, maximum: 31 },
  },
  required: ["freq"],
} as const;

const money = {
  type: "object",
  description: "Amount in MINOR units (centavos). ₱100.50 → amountMinor 10050.",
  properties: {
    amountMinor: { type: "integer" },
    currency: { type: "string", enum: ["PHP"] },
  },
  required: ["amountMinor"],
} as const;

const RATIONALE = {
  rationale: {
    type: "string",
    description: "One short, warm sentence explaining why you're suggesting this.",
  },
} as const;

export const PROPOSAL_TOOLS: LlmToolDef[] = [
  {
    name: "create_reminder",
    description:
      "Propose a reminder. Use either dueAt (absolute ISO time) or anchorId (a routine anchor).",
    inputSchema: {
      type: "object",
      properties: {
        ...RATIONALE,
        title: { type: "string" },
        notes: { type: "string" },
        dueAt: {
          type: "string",
          description: "ISO-8601 with offset, e.g. 2026-06-14T09:00:00+08:00",
        },
        anchorId: { type: "string" },
        recurrence,
      },
      required: ["rationale", "title"],
    },
  },
  {
    name: "log_expense",
    description: "Propose logging a spending transaction.",
    inputSchema: {
      type: "object",
      properties: {
        ...RATIONALE,
        amount: money,
        categoryId: { type: "string" },
        description: { type: "string" },
        occurredAt: { type: "string", description: "ISO-8601 with offset" },
      },
      required: ["rationale", "amount", "occurredAt"],
    },
  },
  {
    name: "add_bill",
    description: "Propose tracking a bill with a due date.",
    inputSchema: {
      type: "object",
      properties: {
        ...RATIONALE,
        name: { type: "string" },
        amount: money,
        dueDate: { type: "string", description: "YYYY-MM-DD" },
        recurrence,
      },
      required: ["rationale", "name", "amount", "dueDate", "recurrence"],
    },
  },
  {
    name: "add_medication",
    description: "Propose a medication schedule.",
    inputSchema: {
      type: "object",
      properties: {
        ...RATIONALE,
        name: { type: "string" },
        dosage: { type: "string" },
        times: { type: "array", items: { type: "string", description: "HH:mm 24h" } },
        recurrence,
      },
      required: ["rationale", "name", "times", "recurrence"],
    },
  },
  {
    name: "block_time",
    description: "Propose blocking time on the calendar.",
    inputSchema: {
      type: "object",
      properties: {
        ...RATIONALE,
        title: { type: "string" },
        startAt: { type: "string", description: "ISO-8601 with offset" },
        endAt: { type: "string", description: "ISO-8601 with offset" },
      },
      required: ["rationale", "title", "startAt", "endAt"],
    },
  },
  {
    name: "add_routine_anchor",
    description: "Propose a new fixed routine anchor (a recurring moment in the day).",
    inputSchema: {
      type: "object",
      properties: {
        ...RATIONALE,
        label: { type: "string" },
        kind: {
          type: "string",
          enum: ["wake", "meds", "meal", "work", "exercise", "wind-down", "sleep", "custom"],
        },
        time: { type: "string", description: "HH:mm 24h" },
        recurrence,
      },
      required: ["rationale", "label", "kind", "time", "recurrence"],
    },
  },
  {
    name: "add_note",
    description:
      "Propose saving a plain note (something to remember, not a timed task). Use create_reminder instead when there is a time or deadline.",
    inputSchema: {
      type: "object",
      properties: {
        ...RATIONALE,
        title: { type: "string", description: "Optional short title (max 120 chars)." },
        body: { type: "string", description: "The note text (max 10,000 chars)." },
      },
      required: ["rationale", "body"],
    },
  },
  {
    name: "create_event",
    description:
      "Propose an appointment or meeting at a specific time (e.g. dentist Tuesday 3pm). Give endAt or durationMinutes. Use create_reminder for tasks without a set duration.",
    inputSchema: {
      type: "object",
      properties: {
        ...RATIONALE,
        title: { type: "string" },
        startAt: { type: "string", description: "ISO-8601 with offset" },
        endAt: { type: "string", description: "ISO-8601 with offset" },
        durationMinutes: { type: "integer", minimum: 1, maximum: 1440 },
        location: { type: "string" },
        notes: { type: "string" },
        remindMinutesBefore: {
          type: "integer",
          minimum: 0,
          maximum: 10080,
          description: "Heads-up reminder this many minutes before, if the user asked for one.",
        },
      },
      required: ["rationale", "title", "startAt"],
    },
  },
];

/**
 * Build the unvalidated action object + rationale for a tool call. The model
 * puts `rationale` alongside the draft fields; we split it out so the rest can
 * be validated against the draft schema. Returns null for unknown tools.
 */
function toActionAndRationale(call: LlmToolCall): { action: unknown; rationale: string } | null {
  const input = (call.input ?? {}) as Record<string, unknown>;
  const rationale = typeof input.rationale === "string" ? input.rationale : "";
  const { rationale: _omit, ...payload } = input;

  switch (call.name) {
    case "create_reminder":
      return { action: { type: "create_reminder", reminder: payload }, rationale };
    case "log_expense":
      return { action: { type: "log_expense", expense: payload }, rationale };
    case "add_bill":
      return { action: { type: "add_bill", bill: payload }, rationale };
    case "add_medication":
      return { action: { type: "add_medication", medication: payload }, rationale };
    case "block_time":
      return { action: { type: "block_time", block: payload }, rationale };
    case "add_routine_anchor":
      return { action: { type: "add_routine_anchor", anchor: payload }, rationale };
    case "add_note":
      return { action: { type: "add_note", note: payload }, rationale };
    case "create_event":
      return { action: { type: "create_event", event: payload }, rationale };
    default:
      return null;
  }
}

/**
 * Validate a tool call against our contract and turn it into a Proposal.
 * Returns null for unknown tools or inputs that fail Zod — we never trust the
 * model's output without parsing it (CLAUDE.md §6, §11).
 */
export function toolCallToProposal(call: LlmToolCall, makeId: () => string): Proposal | null {
  const built = toActionAndRationale(call);
  if (!built) return null;

  const actionResult = proposalActionSchema.safeParse(built.action);
  if (!actionResult.success) return null;

  const proposal = proposalSchema.safeParse({
    id: makeId(),
    action: actionResult.data,
    rationale: built.rationale || "Suggested from your request.",
    status: "proposed",
  });
  return proposal.success ? proposal.data : null;
}
