import { describe, expect, it } from "vitest";
import type { ProposalAction } from "@otto/schemas";
import { initialExpenseWallet, withExpenseWallet } from "./expense-wallet";

const CASH = "00000000-0000-4000-8000-0000000000ca";
const GCASH = "11111111-1111-4111-8111-111111111111";
const OLD = "22222222-2222-4222-8222-222222222222";

const expense = (accountId?: string): ProposalAction => ({
  type: "log_expense",
  expense: {
    amount: { amountMinor: 18000, currency: "PHP" },
    description: "Lunch",
    occurredAt: "2026-10-08T12:40:00+08:00",
    ...(accountId ? { accountId } : {}),
  },
});

describe("initialExpenseWallet", () => {
  it("keeps the wallet Otto proposed when it is one of the user's active wallets", () => {
    expect(initialExpenseWallet(GCASH, [CASH, GCASH], CASH)).toBe(GCASH);
  });

  it("falls back to the last-used wallet for an unknown or archived wallet", () => {
    expect(initialExpenseWallet(OLD, [CASH, GCASH], GCASH)).toBe(GCASH);
    expect(initialExpenseWallet(undefined, [CASH, GCASH], CASH)).toBe(CASH);
  });
});

describe("withExpenseWallet", () => {
  it("sets the chosen wallet on an expense proposal", () => {
    const next = withExpenseWallet(expense(), GCASH);
    expect(next.type === "log_expense" && next.expense.accountId).toBe(GCASH);
  });

  it("leaves other proposals untouched", () => {
    const note: ProposalAction = { type: "add_note", note: { body: "x" } };
    expect(withExpenseWallet(note, GCASH)).toBe(note);
  });
});
