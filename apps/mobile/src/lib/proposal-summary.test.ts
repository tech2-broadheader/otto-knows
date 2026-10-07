import { describe, expect, it } from "vitest";
import { summarizeAction } from "./proposal-summary";

describe("summarizeAction", () => {
  it("formats money and dates in the user's locale", () => {
    const bill = {
      type: "add_bill" as const,
      bill: {
        name: "Electric",
        amount: { amountMinor: 248000, currency: "USD" as const },
        dueDate: "2026-10-15",
        recurrence: { freq: "monthly" as const },
      },
    };
    expect(summarizeAction(bill, "en-US")).toBe("Electric — $2,480.00, due Oct 15");
    expect(summarizeAction(bill, "en-GB")).toBe("Electric — US$2,480.00, due 15 Oct");
  });

  it("summarizes an expense with its note", () => {
    const expense = {
      type: "log_expense" as const,
      expense: {
        amount: { amountMinor: 1250, currency: "EUR" as const },
        description: "Lunch",
        occurredAt: "2026-10-08T12:00:00+02:00",
      },
    };
    expect(summarizeAction(expense, "en-IE")).toBe("€12.50 · Lunch");
  });

  it("uses a note's title, else its first line", () => {
    expect(summarizeAction({ type: "add_note", note: { body: "Line one\nLine two" } }, "en")).toBe(
      "Line one",
    );
    expect(summarizeAction({ type: "add_note", note: { title: "Gifts", body: "x" } }, "en")).toBe(
      "Gifts",
    );
  });
});
