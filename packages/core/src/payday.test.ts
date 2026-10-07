import { describe, expect, it } from "vitest";
import type { Income, IncomeCadence } from "@otto/schemas";
import { effectiveNextPayDate, nextPayday } from "./payday";

const ISO = "2026-01-01T08:00:00+08:00";
function income(cadence: IncomeCadence, nextPayDate: string): Income {
  return {
    id: "00000000-0000-4000-8000-000000000010",
    userId: "00000000-0000-4000-8000-000000000001",
    source: "Salary",
    amount: { amountMinor: 2500000, currency: "PHP" },
    cadence,
    nextPayDate,
    createdAt: ISO,
    updatedAt: ISO,
  };
}

describe("effectiveNextPayDate", () => {
  it("keeps a stored payday that is today or later", () => {
    expect(effectiveNextPayDate(income("monthly", "2026-10-15"), "2026-10-08")).toBe("2026-10-15");
    expect(effectiveNextPayDate(income("weekly", "2026-10-08"), "2026-10-08")).toBe("2026-10-08");
  });

  it("rolls weekly and biweekly paydays forward", () => {
    expect(effectiveNextPayDate(income("weekly", "2026-09-25"), "2026-10-08")).toBe("2026-10-09");
    expect(effectiveNextPayDate(income("biweekly", "2026-09-04"), "2026-10-08")).toBe("2026-10-16");
  });

  it("rolls monthly paydays forward, clamping to short months", () => {
    expect(effectiveNextPayDate(income("monthly", "2026-08-10"), "2026-10-08")).toBe("2026-10-10");
    expect(effectiveNextPayDate(income("monthly", "2026-01-31"), "2026-02-05")).toBe("2026-02-28");
    expect(effectiveNextPayDate(income("monthly", "2026-01-31"), "2026-03-01")).toBe("2026-03-31");
  });

  it("uses the 15th and 30th for semi-monthly pay (last day in short months)", () => {
    expect(effectiveNextPayDate(income("semi-monthly", "2026-09-30"), "2026-10-08")).toBe(
      "2026-10-15",
    );
    expect(effectiveNextPayDate(income("semi-monthly", "2026-09-30"), "2026-10-16")).toBe(
      "2026-10-30",
    );
    expect(effectiveNextPayDate(income("semi-monthly", "2026-01-30"), "2026-02-16")).toBe(
      "2026-02-28",
    );
    expect(effectiveNextPayDate(income("semi-monthly", "2028-01-30"), "2028-02-16")).toBe(
      "2028-02-29",
    );
    expect(effectiveNextPayDate(income("semi-monthly", "2026-10-15"), "2026-10-31")).toBe(
      "2026-11-15",
    );
  });

  it("keeps the user's own semi-monthly pair when it is not the 15th/30th", () => {
    // Paid on the 10th and 25th.
    expect(effectiveNextPayDate(income("semi-monthly", "2026-10-10"), "2026-10-11")).toBe(
      "2026-10-25",
    );
    expect(effectiveNextPayDate(income("semi-monthly", "2026-10-10"), "2026-10-26")).toBe(
      "2026-11-10",
    );
    // Stored on the later day of the pair (the 20th → the 5th and 20th).
    expect(effectiveNextPayDate(income("semi-monthly", "2026-09-20"), "2026-10-08")).toBe(
      "2026-10-20",
    );
    expect(effectiveNextPayDate(income("semi-monthly", "2026-09-20"), "2026-10-21")).toBe(
      "2026-11-05",
    );
  });

  it("treats a month-end semi-monthly date as the 15th / 30th pair", () => {
    expect(effectiveNextPayDate(income("semi-monthly", "2026-02-28"), "2026-03-16")).toBe(
      "2026-03-30",
    );
    expect(effectiveNextPayDate(income("semi-monthly", "2026-08-31"), "2026-09-16")).toBe(
      "2026-09-30",
    );
  });

  it("never guesses a passed custom payday", () => {
    expect(effectiveNextPayDate(income("custom", "2026-10-01"), "2026-10-08")).toBeNull();
    expect(effectiveNextPayDate(income("custom", "2026-10-20"), "2026-10-08")).toBe("2026-10-20");
  });

  it("crosses year boundaries", () => {
    expect(effectiveNextPayDate(income("monthly", "2026-11-30"), "2027-01-02")).toBe("2027-01-30");
  });
});

describe("nextPayday", () => {
  it("picks the soonest payday across incomes", () => {
    expect(
      nextPayday([income("monthly", "2026-10-25"), income("weekly", "2026-10-02")], "2026-10-08"),
    ).toBe("2026-10-09");
  });

  it("returns null with no usable income", () => {
    expect(nextPayday([], "2026-10-08")).toBeNull();
    expect(nextPayday([income("custom", "2026-10-01")], "2026-10-08")).toBeNull();
  });
});
