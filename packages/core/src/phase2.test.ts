import { describe, expect, it } from "vitest";
import type { BudgetCategory, ContextItem, Medication, Routine, Transaction } from "@otto/schemas";
import { serializeContextForLlm } from "./llm-context";
import { medicationDaysRemaining, detectMedRefillNudges, detectOverspendNudges } from "./forecasts";

const U = (n: number) => `${n.toString().padStart(8, "0")}-1111-4111-8111-111111111111`;
const ISO = "2026-06-14T08:00:00+08:00";

describe("serializeContextForLlm", () => {
  const routine: Routine = {
    id: U(1),
    userId: U(99),
    mode: "fixed",
    timezone: "Asia/Manila",
    anchors: [
      {
        id: U(2),
        label: "Lunch",
        kind: "meal",
        time: "12:30",
        recurrence: { freq: "daily" },
        createdAt: ISO,
        updatedAt: ISO,
      },
      {
        id: U(3),
        label: "Wake",
        kind: "wake",
        time: "06:30",
        recurrence: { freq: "daily" },
        createdAt: ISO,
        updatedAt: ISO,
      },
    ],
    createdAt: ISO,
    updatedAt: ISO,
  };
  const items: ContextItem[] = [
    {
      id: U(10),
      userId: U(99),
      kind: "event",
      refId: U(11),
      source: "calendar",
      title: "Dentist",
      at: "2026-06-14T14:00:00+08:00",
    },
    {
      id: U(12),
      userId: U(99),
      kind: "medication",
      refId: U(13),
      source: "health",
      title: "Take meds",
      at: "2026-06-14T08:00:00+08:00",
    },
  ];

  it("renders a stable, time-sorted block", () => {
    const text = serializeContextForLlm({ date: "2026-06-14", routine, items });
    // Anchors sorted by time (Wake before Lunch); items sorted by time (08:00 before 14:00)
    expect(text.indexOf("06:30 Wake")).toBeLessThan(text.indexOf("12:30 Lunch"));
    expect(text.indexOf("08:00 [medication]")).toBeLessThan(text.indexOf("14:00 [event]"));
    expect(text).toContain("timezone: Asia/Manila");
  });

  it("handles an empty day", () => {
    expect(serializeContextForLlm({ date: "2026-06-14", items: [] })).toContain(
      "(nothing scheduled)",
    );
  });
});

describe("forecasts", () => {
  it("computes medication days remaining from doses/day", () => {
    expect(medicationDaysRemaining({ times: ["08:00", "20:00"], quantityRemaining: 10 })).toBe(5);
    expect(medicationDaysRemaining({ times: ["08:00"], quantityRemaining: undefined })).toBeNull();
  });

  it("warns on a medication about to run out", () => {
    const meds: Medication[] = [
      {
        id: U(20),
        userId: U(99),
        name: "Metformin",
        times: ["08:00", "20:00"],
        quantityRemaining: 4,
        recurrence: { freq: "daily" },
        createdAt: ISO,
        updatedAt: ISO,
      },
      {
        id: U(21),
        userId: U(99),
        name: "Plenty",
        times: ["08:00"],
        quantityRemaining: 90,
        recurrence: { freq: "daily" },
        createdAt: ISO,
        updatedAt: ISO,
      },
    ];
    let n = 0;
    const nudges = detectMedRefillNudges(meds, () => U(100 + n++));
    expect(nudges).toHaveLength(1);
    expect(nudges[0]?.kind).toBe("med-refill");
    expect(nudges[0]?.severity).toBe("gentle");
  });

  it("predicts overspend from the month's pace", () => {
    const cats: BudgetCategory[] = [
      {
        id: U(30),
        userId: U(99),
        name: "Food",
        monthlyLimit: { amountMinor: 1000000, currency: "PHP" },
        createdAt: ISO,
        updatedAt: ISO,
      },
    ];
    // Spent 600k by day 10 of 30 → projected 1.8M > 1M limit.
    const tx: Transaction[] = [
      {
        id: U(31),
        userId: U(99),
        type: "expense",
        accountId: U(50),
        amount: { amountMinor: 600000, currency: "PHP" },
        categoryId: U(30),
        occurredAt: "2026-06-05T12:00:00+08:00",
        createdAt: ISO,
        updatedAt: ISO,
      },
    ];
    let n = 0;
    const nudges = detectOverspendNudges(cats, tx, "2026-06", 10, 30, () => U(200 + n++));
    expect(nudges).toHaveLength(1);
    expect(nudges[0]?.kind).toBe("overspend");
  });
});
