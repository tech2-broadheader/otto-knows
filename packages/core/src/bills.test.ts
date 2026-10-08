import { describe, expect, it } from "vitest";
import type { Bill, Recurrence } from "@otto/schemas";
import { markBillPaid, nextBillDueDate } from "./bills";

const bill = (dueDate: string, recurrence: Recurrence): Bill => ({
  id: "11111111-1111-4111-8111-111111111111",
  userId: "22222222-2222-4222-8222-222222222222",
  name: "Electric",
  amount: { amountMinor: 248000, currency: "PHP" },
  dueDate,
  recurrence,
  isAutopay: false,
  isPaid: false,
  createdAt: "2026-10-01T00:00:00+08:00",
  updatedAt: "2026-10-01T00:00:00+08:00",
});
const NOW = "2026-10-08T09:00:00+08:00";

describe("nextBillDueDate", () => {
  it("moves a monthly bill to the same day next month", () => {
    expect(nextBillDueDate(bill("2026-10-15", { freq: "monthly" }))).toBe("2026-11-15");
    expect(nextBillDueDate(bill("2026-12-20", { freq: "monthly" }))).toBe("2027-01-20");
  });

  it("clamps to the month's last day without drifting (31st → Feb 28 → Mar 31)", () => {
    const jan = bill("2027-01-31", { freq: "monthly", dayOfMonth: 31 });
    expect(nextBillDueDate(jan)).toBe("2027-02-28");
    const feb = bill("2027-02-28", { freq: "monthly", dayOfMonth: 31 });
    expect(nextBillDueDate(feb)).toBe("2027-03-31");
  });

  it("handles weekly, daily and weekday-only repeats", () => {
    expect(nextBillDueDate(bill("2026-10-08", { freq: "weekly" }))).toBe("2026-10-15");
    expect(nextBillDueDate(bill("2026-10-08", { freq: "daily" }))).toBe("2026-10-09");
    // Fri 9 Oct 2026 → Mon 12 Oct
    expect(nextBillDueDate(bill("2026-10-09", { freq: "weekdays" }))).toBe("2026-10-12");
    expect(nextBillDueDate(bill("2026-10-08", { freq: "custom", daysOfWeek: ["sat"] }))).toBe(
      "2026-10-10",
    );
  });

  it("has no next date for a one-time bill", () => {
    expect(nextBillDueDate(bill("2026-10-15", { freq: "once" }))).toBeNull();
  });
});

describe("markBillPaid", () => {
  it("rolls a repeating bill to its next due date, unpaid, and pins the monthly day", () => {
    const paid = markBillPaid(bill("2027-01-31", { freq: "monthly" }), NOW);
    expect(paid).toMatchObject({
      dueDate: "2027-02-28",
      isPaid: false,
      recurrence: { freq: "monthly", dayOfMonth: 31 },
      updatedAt: NOW,
    });
  });

  it("marks a one-time bill paid and keeps its date", () => {
    expect(markBillPaid(bill("2026-10-15", { freq: "once" }), NOW)).toMatchObject({
      dueDate: "2026-10-15",
      isPaid: true,
    });
  });
});
