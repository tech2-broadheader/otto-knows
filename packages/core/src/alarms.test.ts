import { describe, expect, it } from "vitest";
import type { Alarm } from "@otto/schemas";
import { describeRepeat, formatTimeUntil, nextAlarm, nextAlarmAt } from "./alarms";

const alarm = (over: Partial<Alarm>): Alarm => ({
  id: "11111111-1111-4111-8111-111111111111",
  userId: "22222222-2222-4222-8222-222222222222",
  time: "06:00",
  repeatDays: [],
  enabled: true,
  vibrate: true,
  snoozeMinutes: 5,
  createdAt: "2026-10-08T10:00:00+08:00",
  updatedAt: "2026-10-08T10:00:00+08:00",
  ...over,
});

// Thursday 8 Oct 2026, 22:40 local time.
const NOW = { date: "2026-10-08", time: "22:40" };

describe("nextAlarmAt", () => {
  it("rings later today when the time hasn't passed, else tomorrow (one-off)", () => {
    expect(nextAlarmAt(alarm({ time: "23:00" }), NOW)).toEqual({
      date: "2026-10-08",
      time: "23:00",
    });
    expect(nextAlarmAt(alarm({ time: "06:00" }), NOW)).toEqual({
      date: "2026-10-09",
      time: "06:00",
    });
    expect(nextAlarmAt(alarm({ time: "22:40" }), NOW)).toEqual({
      date: "2026-10-09",
      time: "22:40",
    });
  });

  it("skips to the next chosen weekday", () => {
    const weekend = alarm({ time: "07:30", repeatDays: ["sat", "sun"] });
    expect(nextAlarmAt(weekend, NOW)).toEqual({ date: "2026-10-10", time: "07:30" });
    const thursdays = alarm({ time: "06:00", repeatDays: ["thu"] });
    expect(nextAlarmAt(thursdays, NOW)).toEqual({ date: "2026-10-15", time: "06:00" });
  });

  it("is null for a switched-off alarm", () => {
    expect(nextAlarmAt(alarm({ enabled: false }), NOW)).toBeNull();
  });
});

describe("nextAlarm", () => {
  it("picks the soonest enabled alarm and how long until it rings", () => {
    const wake = alarm({ id: "33333333-3333-4333-8333-333333333333", time: "06:00" });
    const late = alarm({ id: "44444444-4444-4444-8444-444444444444", time: "23:10" });
    const off = alarm({
      id: "55555555-5555-4555-8555-555555555555",
      time: "22:50",
      enabled: false,
    });
    expect(nextAlarm([wake, late, off], NOW)).toEqual({
      alarm: late,
      at: { date: "2026-10-08", time: "23:10" },
      minutesUntil: 30,
    });
    expect(nextAlarm([off], NOW)).toBeNull();
  });
});

describe("describeRepeat", () => {
  it("names common patterns and lists the rest in week order", () => {
    expect(describeRepeat([])).toBe("Once");
    expect(describeRepeat(["fri", "mon", "tue", "wed", "thu"])).toBe("Mon–Fri");
    expect(describeRepeat(["sun", "sat"])).toBe("Sat, Sun");
    expect(describeRepeat(["mon", "tue", "wed", "thu", "fri", "sat", "sun"])).toBe("Every day");
    expect(describeRepeat(["fri", "mon", "wed"])).toBe("Mon, Wed, Fri");
  });
});

describe("formatTimeUntil", () => {
  it("reads naturally", () => {
    expect(formatTimeUntil(0)).toBe("less than a minute");
    expect(formatTimeUntil(45)).toBe("45 min");
    expect(formatTimeUntil(440)).toBe("7 h 20 min");
    expect(formatTimeUntil(120)).toBe("2 h");
    expect(formatTimeUntil(60 * 24 * 6 + 90)).toBe("6 d 1 h");
  });
});
