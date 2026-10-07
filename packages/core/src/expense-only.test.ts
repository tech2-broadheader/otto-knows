// Story 11.3 AC4: income and transfers must never count as spending.
import { describe, expect, it } from "vitest";
import type { BudgetCategory, Transaction } from "@otto/schemas";
import { computeBudgetSummary } from "./budget";
import { detectOverspendNudges } from "./forecasts";

const ISO = "2026-10-01T08:00:00+08:00";
const U = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const food: BudgetCategory = {
  id: U(1),
  userId: U(99),
  name: "Food",
  monthlyLimit: { amountMinor: 100000, currency: "PHP" },
  createdAt: ISO,
  updatedAt: ISO,
};

function tx(n: number, type: Transaction["type"], amountMinor: number): Transaction {
  return {
    id: U(n),
    userId: U(99),
    type,
    amount: { amountMinor, currency: "PHP" },
    accountId: U(50),
    toAccountId: type === "transfer" ? U(51) : undefined,
    categoryId: type === "expense" ? U(1) : undefined,
    occurredAt: "2026-10-05T12:00:00+08:00",
    createdAt: ISO,
    updatedAt: ISO,
  };
}

const mixed = [tx(10, "expense", 20000), tx(11, "income", 5000000), tx(12, "transfer", 900000)];

describe("expenses only", () => {
  it("computeBudgetSummary ignores income and transfers", () => {
    const summary = computeBudgetSummary([food], mixed, "2026-10");
    expect(summary.totalSpentMinor).toBe(20000);
    expect(summary.uncategorizedMinor).toBe(0);
  });

  it("detectOverspendNudges is not triggered by a large transfer or income", () => {
    const nudges = detectOverspendNudges([food], mixed, "2026-10", 15, 31, () => U(77));
    expect(nudges).toEqual([]);
  });
});
