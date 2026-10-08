import { describe, expect, it } from "vitest";
import type { Bill, Income } from "@otto/schemas";
import { describeRepeat, formatTimeUntil } from "./alarms";
import { composeBriefing } from "./briefing-composer";
import { EN_CORE_COPY, type CoreCopy } from "./copy";
import { detectPaydayVsBillNudges } from "./insights";
import { safeToSpendNudge } from "./safe-to-spend";

// A marked copy: every message is visibly "translated" so tests can tell.
const MARKED: CoreCopy = {
  briefing: {
    greeting: { morning: "[GM]", midday: "[MD]", evening: "[EV]" },
    openDay: "[open]",
    things: ({ count, preview }) => `[${count}: ${preview}]`,
    more: ({ count }) => `[+${count}]`,
  },
  safeToSpend: {
    safe: (p) => `[safe ${p.amount} ${p.payday} ${p.perDay}]`,
    shortfall: (p) => `[short ${p.amount} ${p.payday}]`,
  },
  paydayBill: (p) => `[bill ${p.bill} ${p.amount} ${p.due} ${p.payday}]`,
  repeat: {
    once: "[once]",
    everyDay: "[daily]",
    weekdays: "[wk]",
    days: { mon: "Lu", tue: "Ma", wed: "Mi", thu: "Ju", fri: "Vi", sat: "Sá", sun: "Do" },
    separator: " · ",
  },
  timeUntil: {
    underAMinute: "[now]",
    minutes: (m) => `[${m}m]`,
    hours: (h) => `[${h}h]`,
    hoursMinutes: (h, m) => `[${h}h${m}m]`,
    days: (d) => `[${d}d]`,
    daysHours: (d, h) => `[${d}d${h}h]`,
  },
};

describe("core copy (story 13.3): English by default, app wording when given", () => {
  it("alarm labels", () => {
    expect(describeRepeat(["sat", "sun"])).toBe("Sat, Sun");
    expect(describeRepeat(["sun", "sat"], MARKED)).toBe("Sá · Do");
    expect(describeRepeat([], MARKED)).toBe("[once]");
    expect(formatTimeUntil(440, MARKED)).toBe("[7h20m]");
    expect(formatTimeUntil(440)).toBe("7 h 20 min");
  });

  it("template briefing", () => {
    const input = {
      id: "11111111-1111-4111-8111-111111111111",
      userId: "22222222-2222-4222-8222-222222222222",
      slot: "morning" as const,
      date: "2026-10-08",
      items: [],
      generatedAt: "2026-10-08T07:00:00+08:00",
    };
    expect(composeBriefing(input).summary).toBe("Good morning. Nothing scheduled — an open day.");
    expect(composeBriefing({ ...input, copy: MARKED }).summary).toBe("[GM] [open]");
  });

  it("safe-to-spend and payday nudges", () => {
    const result = {
      status: "ok" as const,
      currency: "USD" as const,
      asOf: "2026-10-09",
      onHandMinor: 50000,
      billsBeforePaydayMinor: 0,
      cardOwedMinor: 0,
      safeMinor: 30000,
      perDayMinor: 5000,
      nextPayday: "2026-10-15",
      daysUntilPayday: 6,
    };
    const id = () => "33333333-3333-4333-8333-333333333333";
    expect(safeToSpendNudge(result, id, "en-US", MARKED)?.message).toBe(
      "[safe $300.00 Oct 15 $50.00]",
    );
    const income: Income = {
      id: "44444444-4444-4444-8444-444444444444",
      userId: "22222222-2222-4222-8222-222222222222",
      source: "Salary",
      amount: { amountMinor: 100000, currency: "USD" },
      cadence: "monthly",
      nextPayDate: "2026-10-15",
      createdAt: "2026-10-01T00:00:00+00:00",
      updatedAt: "2026-10-01T00:00:00+00:00",
    };
    const bill: Bill = {
      id: "55555555-5555-4555-8555-555555555555",
      userId: "22222222-2222-4222-8222-222222222222",
      name: "Rent",
      amount: { amountMinor: 120000, currency: "USD" },
      dueDate: "2026-10-10",
      recurrence: { freq: "monthly" },
      isPaid: false,
      isAutopay: false,
      createdAt: "2026-10-01T00:00:00+00:00",
      updatedAt: "2026-10-01T00:00:00+00:00",
    };
    const nudges = detectPaydayVsBillNudges([income], [bill], "2026-10-08", id, {
      locale: "en-US",
      copy: MARKED,
    });
    expect(nudges[0]?.message).toBe("[bill Rent $1,200.00 Oct 10 Oct 15]");
  });

  it("the English default matches what the functions said before", () => {
    expect(EN_CORE_COPY.safeToSpend.shortfall({ payday: "Oct 15", amount: "$4.00" })).toBe(
      "Heads up — bills before payday on Oct 15 are $4.00 more than what's on hand.",
    );
  });
});
