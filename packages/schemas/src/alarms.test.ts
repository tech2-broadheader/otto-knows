import { describe, expect, it } from "vitest";
import { alarmSchema } from "./alarms";

const base = {
  id: "11111111-1111-4111-8111-111111111111",
  userId: "22222222-2222-4222-8222-222222222222",
  time: "06:00",
  createdAt: "2026-10-08T10:00:00+08:00",
  updatedAt: "2026-10-08T10:00:00+08:00",
};

describe("alarmSchema", () => {
  it("defaults to a one-off, enabled, vibrating alarm with a 5-minute snooze", () => {
    expect(alarmSchema.parse(base)).toMatchObject({
      repeatDays: [],
      enabled: true,
      vibrate: true,
      snoozeMinutes: 5,
    });
  });

  it("accepts repeat days and a label", () => {
    const alarm = alarmSchema.parse({ ...base, repeatDays: ["mon", "fri"], label: "Wake up" });
    expect(alarm.repeatDays).toEqual(["mon", "fri"]);
  });

  it("rejects a bad time, a repeated day and an unsupported snooze", () => {
    expect(alarmSchema.safeParse({ ...base, time: "24:00" }).success).toBe(false);
    expect(alarmSchema.safeParse({ ...base, repeatDays: ["mon", "mon"] }).success).toBe(false);
    expect(alarmSchema.safeParse({ ...base, snoozeMinutes: 7 }).success).toBe(false);
  });

  it("rejects an empty or too-long label", () => {
    expect(alarmSchema.safeParse({ ...base, label: "" }).success).toBe(false);
    expect(alarmSchema.safeParse({ ...base, label: "x".repeat(61) }).success).toBe(false);
  });
});
