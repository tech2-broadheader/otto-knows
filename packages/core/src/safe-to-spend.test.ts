import { describe, expect, it } from "vitest";
import type { Account, Bill, Income, Transaction } from "@otto/schemas";
import { computeSafeToSpend, safeToSpendNudge } from "./safe-to-spend";

const ISO = "2026-10-01T08:00:00+08:00";
const USER = "00000000-0000-4000-8000-000000000001";
let n = 100;
const id = (): string => `00000000-0000-4000-8000-${String((n += 1)).padStart(12, "0")}`;

const wallet = (type: Account["type"], openingMinor: number, archivedAt?: string): Account => ({
  id: id(),
  userId: USER,
  name: type,
  type,
  openingBalance: { amountMinor: openingMinor, currency: "PHP" },
  archivedAt,
  createdAt: ISO,
  updatedAt: ISO,
});
const bill = (amountMinor: number, dueDate: string, isPaid = false): Bill => ({
  id: id(),
  userId: USER,
  name: "Bill",
  amount: { amountMinor, currency: "PHP" },
  dueDate,
  recurrence: { freq: "monthly" },
  isAutopay: false,
  isPaid,
  createdAt: ISO,
  updatedAt: ISO,
});
const salary = (nextPayDate: string, cadence: Income["cadence"] = "semi-monthly"): Income => ({
  id: id(),
  userId: USER,
  source: "Salary",
  amount: { amountMinor: 2500000, currency: "PHP" },
  cadence,
  nextPayDate,
  createdAt: ISO,
  updatedAt: ISO,
});
const noTx: Transaction[] = [];

describe("computeSafeToSpend", () => {
  it("subtracts bills due before payday and card debt from money on hand", () => {
    const result = computeSafeToSpend({
      accounts: [wallet("cash", 500000), wallet("bank", 1000000), wallet("credit_card", -200000)],
      transactions: noTx,
      bills: [bill(300000, "2026-10-12"), bill(99999, "2026-10-20")], // 2nd is after payday
      incomes: [salary("2026-10-15")],
      asOfDate: "2026-10-08",
    });
    expect(result).toEqual({
      status: "ok",
      asOf: "2026-10-08",
      nextPayday: "2026-10-15",
      daysUntilPayday: 7,
      onHandMinor: 1500000,
      billsBeforePaydayMinor: 300000,
      cardOwedMinor: 200000,
      safeMinor: 1000000,
      perDayMinor: 142857, // floor(1,000,000 / 7)
      currency: "PHP",
    });
  });

  it("includes overdue unpaid bills and ignores paid ones", () => {
    const result = computeSafeToSpend({
      accounts: [wallet("cash", 100000)],
      transactions: noTx,
      bills: [bill(20000, "2026-10-01"), bill(50000, "2026-10-10", true)],
      incomes: [salary("2026-10-15")],
      asOfDate: "2026-10-08",
    });
    expect(result.billsBeforePaydayMinor).toBe(20000);
    expect(result.safeMinor).toBe(80000);
  });

  it("ignores archived wallets", () => {
    const result = computeSafeToSpend({
      accounts: [wallet("cash", 100000), wallet("bank", 900000, ISO)],
      transactions: noTx,
      bills: [],
      incomes: [salary("2026-10-15")],
      asOfDate: "2026-10-08",
    });
    expect(result.onHandMinor).toBe(100000);
  });

  it("on payday itself divides by one day, not zero", () => {
    const result = computeSafeToSpend({
      accounts: [wallet("cash", 10000)],
      transactions: noTx,
      bills: [],
      incomes: [salary("2026-10-15")],
      asOfDate: "2026-10-15",
    });
    expect(result.daysUntilPayday).toBe(0);
    expect(result.perDayMinor).toBe(10000);
  });

  it("allows a negative result and reports no per-day budget", () => {
    const result = computeSafeToSpend({
      accounts: [wallet("cash", 10000)],
      transactions: noTx,
      bills: [bill(50000, "2026-10-12")],
      incomes: [salary("2026-10-15")],
      asOfDate: "2026-10-08",
    });
    expect(result.safeMinor).toBe(-40000);
    expect(result.perDayMinor).toBe(0);
  });

  it("asks for income when none is set up", () => {
    const result = computeSafeToSpend({
      accounts: [wallet("cash", 10000)],
      transactions: noTx,
      bills: [bill(5000, "2026-10-12")],
      incomes: [],
      asOfDate: "2026-10-08",
    });
    expect(result.status).toBe("no-income");
    expect(result.nextPayday).toBeUndefined();
  });

  it("asks to update a passed custom payday", () => {
    const result = computeSafeToSpend({
      accounts: [],
      transactions: noTx,
      bills: [],
      incomes: [salary("2026-10-01", "custom")],
      asOfDate: "2026-10-08",
    });
    expect(result.status).toBe("needs-payday-update");
  });
});

describe("safeToSpendNudge", () => {
  const base = {
    asOf: "2026-10-08",
    onHandMinor: 0,
    billsBeforePaydayMinor: 0,
    cardOwedMinor: 0,
    currency: "PHP" as const,
  };

  it("states the amount, payday and per-day figure", () => {
    const nudge = safeToSpendNudge(
      {
        ...base,
        status: "ok",
        nextPayday: "2026-10-15",
        daysUntilPayday: 7,
        safeMinor: 320000,
        perDayMinor: 45714,
      },
      () => id(),
      "en-PH",
    );
    expect(nudge?.kind).toBe("safe-to-spend");
    expect(nudge?.severity).toBe("info");
    expect(nudge?.message).toBe(
      "₱3,200.00 is safe to spend until payday on Oct 15 — about ₱457.14 a day.",
    );
  });

  it("is gentle, never scolding, when bills exceed money on hand", () => {
    const nudge = safeToSpendNudge(
      {
        ...base,
        status: "ok",
        nextPayday: "2026-10-15",
        daysUntilPayday: 7,
        safeMinor: -40000,
        perDayMinor: 0,
      },
      () => id(),
      "en-PH",
    );
    expect(nudge?.severity).toBe("gentle");
    expect(nudge?.message).toBe(
      "Heads up — bills before payday on Oct 15 are ₱400.00 more than what's on hand.",
    );
  });

  it("stays quiet when there is no payday to plan against", () => {
    expect(
      safeToSpendNudge({ ...base, status: "no-income", safeMinor: 0 }, () => id(), "en-PH"),
    ).toBeNull();
  });
});
