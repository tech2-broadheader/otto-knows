import { describe, expect, it } from "vitest";
import type { Alarm } from "@otto/schemas";
import { reconcileAlarms, toNativeAlarm } from "./alarm-sync";

const alarm = (over: Partial<Alarm>): Alarm => ({
  id: "11111111-1111-4111-8111-111111111111",
  userId: "22222222-2222-4222-8222-222222222222",
  time: "06:05",
  repeatDays: [],
  enabled: true,
  vibrate: true,
  snoozeMinutes: 5,
  createdAt: "2026-10-08T10:00:00+08:00",
  updatedAt: "2026-10-08T10:00:00+08:00",
  ...over,
});

describe("toNativeAlarm", () => {
  it("hands the module hour, minute and ISO weekdays (Mon = 1 … Sun = 7)", () => {
    expect(
      toNativeAlarm(alarm({ repeatDays: ["sun", "mon"], label: "Wake up", snoozeMinutes: 10 })),
    ).toEqual({
      id: "11111111-1111-4111-8111-111111111111",
      hour: 6,
      minute: 5,
      days: [1, 7],
      label: "Wake up",
      snoozeMinutes: 10,
      vibrate: true,
    });
  });

  it("labels an unnamed alarm plainly", () => {
    expect(toNativeAlarm(alarm({})).label).toBe("Alarm");
  });
});

describe("reconcileAlarms", () => {
  const weekly = alarm({ id: "33333333-3333-4333-8333-333333333333", repeatDays: ["mon"] });
  const once = alarm({ id: "44444444-4444-4444-8444-444444444444" });
  const off = alarm({ id: "55555555-5555-4555-8555-555555555555", enabled: false });

  it("re-arms enabled repeating alarms the phone lost, and switches off one-offs that already rang", () => {
    expect(reconcileAlarms([weekly, once, off], [])).toEqual({
      rearm: [weekly],
      switchOff: [once],
      cancel: [],
    });
  });

  it("leaves armed alarms alone and cancels ones Otto no longer has enabled", () => {
    expect(reconcileAlarms([weekly, once, off], [weekly.id, once.id, off.id, "gone"])).toEqual({
      rearm: [],
      switchOff: [],
      cancel: [off.id, "gone"],
    });
  });
});
