import { describe, expect, it } from "vitest";
import type { PlannedNotification } from "@otto/core";
import { diffSchedule, planKey } from "./schedule-diff";

const plan = (
  sourceKind: "reminder" | "medication",
  id: string,
  fireAt: string,
): PlannedNotification => ({
  sourceKind,
  sourceId: id,
  title: `${sourceKind}-${id}`,
  fireAt,
});

describe("planKey", () => {
  it("is stable for the same source + fire-time and distinct otherwise", () => {
    const a = plan("medication", "m1", "2026-06-14T08:00:00+08:00");
    const b = plan("medication", "m1", "2026-06-14T08:00:00+08:00");
    const c = plan("medication", "m1", "2026-06-14T20:00:00+08:00");
    expect(planKey(a)).toBe(planKey(b));
    expect(planKey(a)).not.toBe(planKey(c));
  });
});

describe("diffSchedule", () => {
  it("schedules new plans and leaves matching ones untouched (no double-fire)", () => {
    const desired = [
      plan("medication", "m1", "2026-06-14T08:00:00+08:00"),
      plan("reminder", "r1", "2026-06-14T10:00:00+08:00"),
    ];
    // m1 already scheduled; r1 is new.
    const existing = [{ id: "n1", key: planKey(desired[0]) }];
    const { toSchedule, toCancel } = diffSchedule(desired, existing, (e) => e.key);
    expect(toSchedule.map((p) => p.sourceId)).toEqual(["r1"]);
    expect(toCancel).toEqual([]);
  });

  it("cancels scheduled items no longer in the desired plan", () => {
    const desired = [plan("medication", "m1", "2026-06-14T08:00:00+08:00")];
    const existing = [
      { id: "n1", key: planKey(desired[0]) },
      { id: "n2", key: "medication:gone:2026-06-14T20:00:00+08:00" },
    ];
    const { toSchedule, toCancel } = diffSchedule(desired, existing, (e) => e.key);
    expect(toSchedule).toEqual([]);
    expect(toCancel.map((e) => e.id)).toEqual(["n2"]);
  });

  it("cancels existing items whose key cannot be read (untracked)", () => {
    const desired = [plan("medication", "m1", "2026-06-14T08:00:00+08:00")];
    const existing = [{ id: "orphan", key: undefined as string | undefined }];
    const { toSchedule, toCancel } = diffSchedule(desired, existing, (e) => e.key);
    expect(toSchedule.map((p) => p.sourceId)).toEqual(["m1"]);
    expect(toCancel.map((e) => e.id)).toEqual(["orphan"]);
  });
});
