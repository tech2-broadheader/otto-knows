import { describe, expect, it } from "vitest";
import {
  briefingSlotForHour,
  currentMonth,
  isoFromDateTime,
  timeLabel,
  todayDate,
} from "./datetime";

describe("datetime helpers", () => {
  it("formats a date as YYYY-MM-DD", () => {
    expect(todayDate(new Date(2026, 5, 14))).toBe("2026-06-14");
  });
  it("derives the current month", () => {
    expect(currentMonth(new Date(2026, 0, 3))).toBe("2026-01");
  });
  it("composes an ISO datetime from parts", () => {
    expect(isoFromDateTime("2026-06-14", "08:30", "+08:00")).toBe("2026-06-14T08:30:00+08:00");
  });
  it("normalizes a Z offset", () => {
    expect(isoFromDateTime("2026-06-14", "08:30", "Z")).toBe("2026-06-14T08:30:00+00:00");
  });
  it("extracts the time label from an ISO datetime", () => {
    expect(timeLabel("2026-06-14T08:30:00+08:00")).toBe("08:30");
  });
  it("returns empty time label when absent", () => {
    expect(timeLabel("2026-06-14")).toBe("");
  });
  it("picks briefing slots by hour", () => {
    expect(briefingSlotForHour(7)).toBe("morning");
    expect(briefingSlotForHour(13)).toBe("midday");
    expect(briefingSlotForHour(20)).toBe("evening");
  });
});
