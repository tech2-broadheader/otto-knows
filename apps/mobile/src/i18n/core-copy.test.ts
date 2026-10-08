import { describe, expect, it } from "vitest";
import { EN_CORE_COPY } from "@otto/core";
import { CORE_COPY } from "./core-copy";

describe("CORE_COPY (story 13.3)", () => {
  it("says exactly what @otto/core says in English, so the two never drift", () => {
    const sample = (c: typeof EN_CORE_COPY): unknown => ({
      greeting: c.briefing.greeting,
      openDay: c.briefing.openDay,
      things: [1, 4].map((count) => c.briefing.things({ count, preview: "08:00 Gym" })),
      more: c.briefing.more({ count: 2 }),
      safe: c.safeToSpend.safe({ amount: "$3", payday: "Oct 15", perDay: "$1" }),
      shortfall: c.safeToSpend.shortfall({ amount: "$3", payday: "Oct 15" }),
      bill: c.paydayBill({ bill: "Rent", amount: "$9", due: "Oct 10", payday: "Oct 15" }),
      repeat: c.repeat,
      until: [
        c.timeUntil.underAMinute,
        c.timeUntil.minutes(5),
        c.timeUntil.hours(2),
        c.timeUntil.hoursMinutes(7, 20),
        c.timeUntil.days(3),
        c.timeUntil.daysHours(6, 1),
      ],
    });
    expect(sample(CORE_COPY)).toEqual(sample(EN_CORE_COPY));
  });
});
