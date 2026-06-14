import { describe, expect, it } from "vitest";
import type { Routine } from "@otto/schemas";
import {
  medianTime,
  suggestAnchorAdjustment,
  adaptRoutine,
  detectRoutineDriftNudges,
} from "./adaptive";

const U = (n: number) => `${n.toString().padStart(8, "0")}-1111-4111-8111-111111111111`;
const ISO = "2026-06-14T08:00:00+08:00";

describe("medianTime", () => {
  it("returns the median HH:mm", () => {
    expect(medianTime(["12:00", "12:30", "13:00"])).toBe("12:30");
    expect(medianTime(["12:00", "13:00"])).toBe("12:30");
    expect(medianTime([])).toBeNull();
  });
});

describe("suggestAnchorAdjustment", () => {
  const anchor = { id: U(1), label: "Lunch", time: "11:30" };

  it("suggests a shift when drift exceeds tolerance with enough samples", () => {
    const adj = suggestAnchorAdjustment(anchor, ["12:30", "12:30", "12:45", "12:15"]);
    expect(adj?.suggestedTime).toBe("12:30");
    expect(adj?.deltaMinutes).toBe(60);
  });

  it("returns null with too few samples or drift within tolerance", () => {
    expect(suggestAnchorAdjustment(anchor, ["12:30", "12:30"])).toBeNull(); // < minSamples
    expect(suggestAnchorAdjustment(anchor, ["11:35", "11:30", "11:40", "11:25"])).toBeNull(); // < 20m
  });
});

describe("adaptRoutine + drift nudges", () => {
  const routine: Routine = {
    id: U(9),
    userId: U(99),
    mode: "adaptive",
    timezone: "Asia/Manila",
    anchors: [
      {
        id: U(1),
        label: "Lunch",
        kind: "meal",
        time: "11:30",
        recurrence: { freq: "daily" },
        createdAt: ISO,
        updatedAt: ISO,
      },
    ],
    createdAt: ISO,
    updatedAt: ISO,
  };
  const observations = { [U(1)]: ["12:30", "12:30", "12:45", "12:15"] };

  it("collects adjustments and emits gentle deviation nudges", () => {
    expect(adaptRoutine(routine, observations)).toHaveLength(1);
    let n = 0;
    const nudges = detectRoutineDriftNudges(routine, observations, () => U(100 + n++));
    expect(nudges[0]?.kind).toBe("deviation");
    expect(nudges[0]?.severity).toBe("gentle");
    expect(nudges[0]?.message).toContain("later");
  });
});
