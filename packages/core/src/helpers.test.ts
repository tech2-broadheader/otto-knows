import { describe, expect, it } from "vitest";
import type { Bill, BudgetCategory, ContextItem, Income, Transaction } from "@otto/schemas";
import { occursOnDate, dayOfWeekFor } from "./recurrence";
import { computeBudgetSummary } from "./budget";
import { detectPaydayVsBillNudges } from "./insights";
import { composeBriefing } from "./briefing-composer";

const UUID = (n: number) => `${n.toString().padStart(8, "0")}-1111-4111-8111-111111111111`;
const ISO = "2026-06-14T08:00:00+08:00";

describe("recurrence", () => {
  it("knows the weekday of a date", () => {
    expect(dayOfWeekFor("2026-06-14")).toBe("sun");
    expect(dayOfWeekFor("2026-06-15")).toBe("mon");
  });

  it("evaluates weekday/weekend/custom/monthly rules", () => {
    expect(occursOnDate({ freq: "weekdays" }, "2026-06-15")).toBe(true); // Mon
    expect(occursOnDate({ freq: "weekdays" }, "2026-06-14")).toBe(false); // Sun
    expect(occursOnDate({ freq: "weekends" }, "2026-06-14")).toBe(true);
    expect(occursOnDate({ freq: "custom", daysOfWeek: ["mon", "wed"] }, "2026-06-15")).toBe(true);
    expect(occursOnDate({ freq: "custom", daysOfWeek: ["mon", "wed"] }, "2026-06-16")).toBe(false);
    expect(occursOnDate({ freq: "monthly", dayOfMonth: 14 }, "2026-06-14")).toBe(true);
    expect(occursOnDate({ freq: "monthly", dayOfMonth: 1 }, "2026-06-14")).toBe(false);
    expect(occursOnDate({ freq: "daily" }, "2026-06-14")).toBe(true);
  });
});

describe("budget", () => {
  const cats: BudgetCategory[] = [
    {
      id: UUID(1),
      userId: UUID(99),
      name: "Food",
      monthlyLimit: { amountMinor: 500000, currency: "PHP" },
      createdAt: ISO,
      updatedAt: ISO,
    },
    { id: UUID(2), userId: UUID(99), name: "Transport", createdAt: ISO, updatedAt: ISO },
  ];
  const tx: Transaction[] = [
    {
      id: UUID(10),
      userId: UUID(99),
      type: "expense",
      accountId: UUID(50),
      amount: { amountMinor: 600000, currency: "PHP" },
      categoryId: UUID(1),
      occurredAt: "2026-06-03T12:00:00+08:00",
      createdAt: ISO,
      updatedAt: ISO,
    },
    {
      id: UUID(11),
      userId: UUID(99),
      type: "expense",
      accountId: UUID(50),
      amount: { amountMinor: 5000, currency: "PHP" },
      occurredAt: "2026-06-05T09:00:00+08:00",
      createdAt: ISO,
      updatedAt: ISO,
    },
    {
      id: UUID(12),
      userId: UUID(99),
      type: "expense",
      accountId: UUID(50),
      amount: { amountMinor: 9999, currency: "PHP" },
      categoryId: UUID(1),
      occurredAt: "2026-05-30T09:00:00+08:00",
      createdAt: ISO,
      updatedAt: ISO,
    },
  ];

  it("sums by category within the month and flags over-budget", () => {
    const summary = computeBudgetSummary(cats, tx, "2026-06");
    const food = summary.categories.find((c) => c.categoryId === UUID(1));
    expect(food?.spentMinor).toBe(600000); // May tx excluded
    expect(food?.isOverBudget).toBe(true);
    expect(food?.remainingMinor).toBe(-100000);
    expect(summary.uncategorizedMinor).toBe(5000);
    expect(summary.totalSpentMinor).toBe(605000);
  });
});

describe("payday-vs-bill nudges", () => {
  const incomes: Income[] = [
    {
      id: UUID(20),
      userId: UUID(99),
      source: "Salary",
      amount: { amountMinor: 3000000, currency: "PHP" },
      cadence: "monthly",
      nextPayDate: "2026-06-19",
      createdAt: ISO,
      updatedAt: ISO,
    },
  ];
  const bills: Bill[] = [
    {
      id: UUID(30),
      userId: UUID(99),
      name: "Electric",
      amount: { amountMinor: 250000, currency: "PHP" },
      dueDate: "2026-06-18",
      recurrence: { freq: "monthly", dayOfMonth: 18 },
      isAutopay: false,
      isPaid: false,
      createdAt: ISO,
      updatedAt: ISO,
    },
    {
      id: UUID(31),
      userId: UUID(99),
      name: "Internet",
      amount: { amountMinor: 199900, currency: "PHP" },
      dueDate: "2026-06-25",
      recurrence: { freq: "monthly", dayOfMonth: 25 },
      isAutopay: false,
      isPaid: false,
      createdAt: ISO,
      updatedAt: ISO,
    },
  ];

  it("flags a bill due before payday, within the window", () => {
    let n = 0;
    const nudges = detectPaydayVsBillNudges(incomes, bills, "2026-06-14", () => UUID(100 + n++));
    expect(nudges).toHaveLength(1);
    expect(nudges[0]?.kind).toBe("payday-vs-bill");
    expect(nudges[0]?.severity).toBe("gentle");
    expect(nudges[0]?.relatedIds).toContain(UUID(30));
  });

  it("ignores paid bills and bills outside the window", () => {
    const paid = bills.map((b) => ({ ...b, isPaid: true }));
    expect(detectPaydayVsBillNudges(incomes, paid, "2026-06-14", () => UUID(200))).toHaveLength(0);
  });
});

describe("briefing composer", () => {
  const items: ContextItem[] = [
    {
      id: UUID(40),
      userId: UUID(99),
      kind: "medication",
      refId: UUID(41),
      source: "health",
      title: "Take meds",
      at: "2026-06-14T08:00:00+08:00",
    },
    {
      id: UUID(42),
      userId: UUID(99),
      kind: "event",
      refId: UUID(43),
      source: "calendar",
      title: "Dentist",
      at: "2026-06-14T14:00:00+08:00",
    },
  ];

  it("composes one coherent template summary including nudges", () => {
    const briefing = composeBriefing({
      id: UUID(50),
      userId: UUID(99),
      slot: "morning",
      date: "2026-06-14",
      items,
      nudges: [
        {
          id: UUID(51),
          kind: "general",
          message: "Stay hydrated.",
          severity: "info",
          relatedIds: [],
        },
      ],
      generatedAt: ISO,
    });
    expect(briefing.source).toBe("template");
    expect(briefing.summary).toContain("Good morning.");
    expect(briefing.summary).toContain("2 things on today");
    expect(briefing.summary).toContain("08:00 Take meds");
    expect(briefing.summary).toContain("Stay hydrated.");
    expect(briefing.items).toHaveLength(2);
  });

  it("handles an empty day", () => {
    const briefing = composeBriefing({
      id: UUID(60),
      userId: UUID(99),
      slot: "evening",
      date: "2026-06-14",
      items: [],
      generatedAt: ISO,
    });
    expect(briefing.summary).toContain("open day");
  });
});
