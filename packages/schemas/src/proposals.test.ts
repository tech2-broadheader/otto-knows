import { describe, expect, it } from "vitest";
import { proposalSchema, proposalActionSchema, quickAddRequestSchema } from "./index";

const UUID = "11111111-1111-4111-8111-111111111111";

describe("proposal actions", () => {
  it("accepts a create_reminder action", () => {
    const result = proposalActionSchema.safeParse({
      type: "create_reminder",
      reminder: { title: "Pay electric bill", dueAt: "2026-06-18T09:00:00+08:00" },
    });
    expect(result.success).toBe(true);
  });

  it("accepts a log_expense action with money in centavos", () => {
    const result = proposalActionSchema.safeParse({
      type: "log_expense",
      expense: {
        amount: { amountMinor: 25000, currency: "PHP" },
        occurredAt: "2026-06-14T13:00:00+08:00",
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown action type", () => {
    expect(proposalActionSchema.safeParse({ type: "delete_everything" }).success).toBe(false);
  });
});

describe("proposal", () => {
  it("defaults status to proposed and requires a rationale", () => {
    const parsed = proposalSchema.parse({
      id: UUID,
      action: {
        type: "add_routine_anchor",
        anchor: { label: "Gym", kind: "exercise", time: "06:30", recurrence: { freq: "weekdays" } },
      },
      rationale: "Mornings are your only consistent free block.",
    });
    expect(parsed.status).toBe("proposed");
  });

  it("rejects an empty rationale", () => {
    const result = proposalSchema.safeParse({
      id: UUID,
      action: { type: "create_reminder", reminder: { title: "x" } },
      rationale: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("quick-add request", () => {
  it("rejects empty and over-long text", () => {
    expect(quickAddRequestSchema.safeParse({ text: "" }).success).toBe(false);
    expect(quickAddRequestSchema.safeParse({ text: "buy meds at 8pm" }).success).toBe(true);
    expect(quickAddRequestSchema.safeParse({ text: "x".repeat(1001) }).success).toBe(false);
  });
});
