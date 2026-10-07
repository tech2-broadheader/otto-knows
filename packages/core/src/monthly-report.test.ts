import { describe, expect, it } from "vitest";
import type { BudgetCategory, Transaction } from "@otto/schemas";
import { computeMonthlyReport, previousMonth } from "./monthly-report";

const ISO = "2026-09-01T08:00:00+08:00";
const USER = "00000000-0000-4000-8000-000000000001";
const WALLET = "00000000-0000-4000-8000-000000000050";
const CARD = "00000000-0000-4000-8000-000000000051";
const U = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const category = (n: number, name: string): BudgetCategory => ({
  id: U(n),
  userId: USER,
  name,
  createdAt: ISO,
  updatedAt: ISO,
});
const FOOD = category(1, "Food");
const TRANSPORT = category(2, "Transport");

let seq = 100;
function tx(
  type: Transaction["type"],
  amountMinor: number,
  occurredAt: string,
  categoryId?: string,
): Transaction {
  return {
    id: U((seq += 1)),
    userId: USER,
    type,
    amount: { amountMinor, currency: "PHP" },
    accountId: WALLET,
    toAccountId: type === "transfer" ? CARD : undefined,
    categoryId,
    occurredAt,
    createdAt: ISO,
    updatedAt: ISO,
  };
}

describe("previousMonth", () => {
  it("steps back a month, across years", () => {
    expect(previousMonth("2026-10")).toBe("2026-09");
    expect(previousMonth("2026-01")).toBe("2025-12");
  });
});

describe("computeMonthlyReport", () => {
  const transactions = [
    // September
    tx("expense", 40000, "2026-09-05T12:00:00+08:00", FOOD.id),
    tx("income", 2500000, "2026-09-15T09:00:00+08:00"),
    // October
    tx("expense", 60000, "2026-10-03T12:00:00+08:00", FOOD.id),
    tx("expense", 15000, "2026-10-04T08:00:00+08:00", TRANSPORT.id),
    tx("expense", 5000, "2026-10-05T08:00:00+08:00"), // uncategorized
    tx("income", 2500000, "2026-10-15T09:00:00+08:00"),
    tx("transfer", 900000, "2026-10-16T09:00:00+08:00"), // card payment — not spending
  ];

  it("totals income, spending and net for the month, excluding transfers", () => {
    const report = computeMonthlyReport([FOOD, TRANSPORT], transactions, "2026-10");
    expect(report.incomeMinor).toBe(2500000);
    expect(report.spendingMinor).toBe(80000);
    expect(report.netMinor).toBe(2420000);
    expect(report.previous).toEqual({ incomeMinor: 2500000, spendingMinor: 40000 });
  });

  it("lists spending by category, largest first, with change vs last month", () => {
    const report = computeMonthlyReport([FOOD, TRANSPORT], transactions, "2026-10");
    expect(report.categories).toEqual([
      {
        categoryId: FOOD.id,
        name: "Food",
        spentMinor: 60000,
        previousMinor: 40000,
        changeMinor: 20000,
        changePct: 50,
      },
      {
        categoryId: TRANSPORT.id,
        name: "Transport",
        spentMinor: 15000,
        previousMinor: 0,
        changeMinor: 15000,
        changePct: null, // new this month — never divide by zero
      },
      {
        categoryId: null,
        name: "Uncategorized",
        spentMinor: 5000,
        previousMinor: 0,
        changeMinor: 5000,
        changePct: null,
      },
    ]);
  });

  it("keeps a category that was spent last month but not this month", () => {
    const report = computeMonthlyReport([FOOD], [transactions[0]!], "2026-10");
    expect(report.categories).toEqual([
      {
        categoryId: FOOD.id,
        name: "Food",
        spentMinor: 0,
        previousMinor: 40000,
        changeMinor: -40000,
        changePct: -100,
      },
    ]);
  });

  it("files spending under a deleted category as Uncategorized", () => {
    const orphan = tx("expense", 7000, "2026-10-09T08:00:00+08:00", U(99));
    const report = computeMonthlyReport([FOOD], [orphan], "2026-10");
    expect(report.categories.map((c) => [c.categoryId, c.spentMinor])).toEqual([[null, 7000]]);
  });

  it("has no comparison in the first month with data", () => {
    const report = computeMonthlyReport([FOOD], [transactions[2]!], "2026-10");
    expect(report.previous).toBeNull();
  });

  it("breaks ties by name so the order is stable", () => {
    const a = category(3, "Zebra");
    const b = category(4, "Apple");
    const report = computeMonthlyReport(
      [a, b],
      [
        tx("expense", 100, "2026-10-01T08:00:00+08:00", a.id),
        tx("expense", 100, "2026-10-01T08:00:00+08:00", b.id),
      ],
      "2026-10",
    );
    expect(report.categories.map((c) => c.name)).toEqual(["Apple", "Zebra"]);
  });

  it("rounds the percentage to one decimal", () => {
    const report = computeMonthlyReport(
      [FOOD],
      [
        tx("expense", 30000, "2026-09-02T08:00:00+08:00", FOOD.id),
        tx("expense", 40000, "2026-10-02T08:00:00+08:00", FOOD.id),
      ],
      "2026-10",
    );
    expect(report.categories[0]?.changePct).toBe(33.3);
  });
});
