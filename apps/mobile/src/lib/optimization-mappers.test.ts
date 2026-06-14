import { describe, expect, it } from "vitest";
import type { Recurrence, Routine, ScheduleChange } from "@otto/schemas";
import {
  addedAnchor,
  describeChange,
  movedAnchor,
  type ApplyOptimizationContext,
} from "./optimization-mappers";

function makeCtx(overrides: Partial<ApplyOptimizationContext> = {}): ApplyOptimizationContext {
  let n = 0;
  return {
    newId: () => `00000000-0000-4000-8000-00000000000${(n += 1)}`,
    now: "2026-06-15T08:00:00+08:00",
    ...overrides,
  };
}

const ANCHOR_ID = "11111111-1111-4111-8111-111111111111";

function makeRoutine(): Routine {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    userId: "00000000-0000-4000-8000-000000000002",
    mode: "fixed",
    timezone: "Asia/Manila",
    anchors: [
      {
        id: ANCHOR_ID,
        label: "Lunch",
        kind: "meal",
        time: "11:30",
        recurrence: { freq: "daily" },
        createdAt: "2026-06-10T08:00:00+08:00",
        updatedAt: "2026-06-10T08:00:00+08:00",
      },
    ],
    createdAt: "2026-06-10T08:00:00+08:00",
    updatedAt: "2026-06-10T08:00:00+08:00",
  };
}

describe("movedAnchor", () => {
  it("sets the matched anchor's time to toTime and re-stamps updatedAt", () => {
    const change: ScheduleChange = {
      action: "move",
      label: "Lunch",
      kind: "meal",
      anchorId: ANCHOR_ID,
      fromTime: "11:30",
      toTime: "12:30",
      reason: "Make room for the run.",
    };
    const result = movedAnchor(change, makeRoutine(), makeCtx());
    expect(result).toBeDefined();
    expect(result?.id).toBe(ANCHOR_ID);
    expect(result?.time).toBe("12:30");
    expect(result?.updatedAt).toBe("2026-06-15T08:00:00+08:00");
    // Identity preserved — same label/kind/recurrence/createdAt.
    expect(result?.label).toBe("Lunch");
    expect(result?.createdAt).toBe("2026-06-10T08:00:00+08:00");
  });

  it("returns undefined when the change has no anchorId", () => {
    const change: ScheduleChange = {
      action: "move",
      label: "Lunch",
      kind: "meal",
      toTime: "12:30",
      reason: "x",
    };
    expect(movedAnchor(change, makeRoutine(), makeCtx())).toBeUndefined();
  });

  it("returns undefined when no anchor matches the id", () => {
    const change: ScheduleChange = {
      action: "move",
      label: "Lunch",
      kind: "meal",
      anchorId: "22222222-2222-4222-8222-222222222222",
      toTime: "12:30",
      reason: "x",
    };
    expect(movedAnchor(change, makeRoutine(), makeCtx())).toBeUndefined();
  });
});

describe("addedAnchor", () => {
  const recurrence: Recurrence = { freq: "weekdays" };

  it("builds a fresh anchor from the change carrying the new routine's recurrence", () => {
    const change: ScheduleChange = {
      action: "add",
      label: "Morning run",
      kind: "exercise",
      toTime: "06:00",
      reason: "A quiet slot before work.",
    };
    const anchor = addedAnchor(change, recurrence, makeCtx());
    expect(anchor.label).toBe("Morning run");
    expect(anchor.kind).toBe("exercise");
    expect(anchor.time).toBe("06:00");
    expect(anchor.recurrence.freq).toBe("weekdays");
    expect(anchor.createdAt).toBe("2026-06-15T08:00:00+08:00");
    expect(anchor.id).toBe("00000000-0000-4000-8000-000000000001");
    expect("userId" in anchor).toBe(false);
  });

  it("rejects a malformed time at the schema boundary", () => {
    const change: ScheduleChange = {
      action: "add",
      label: "x",
      kind: "custom",
      toTime: "25:99",
      reason: "x",
    };
    expect(() => addedAnchor(change, recurrence, makeCtx())).toThrow();
  });
});

describe("describeChange", () => {
  it("reads a move as 'Move <label> <from> → <to>'", () => {
    expect(
      describeChange({
        action: "move",
        label: "Lunch",
        kind: "meal",
        fromTime: "11:30",
        toTime: "12:30",
        reason: "x",
      }),
    ).toBe("Move Lunch 11:30 → 12:30");
  });

  it("reads an add as 'Add <label> at <to>'", () => {
    expect(
      describeChange({
        action: "add",
        label: "Run",
        kind: "exercise",
        toTime: "06:00",
        reason: "x",
      }),
    ).toBe("Add Run at 06:00");
  });

  it("reads a keep as 'Keep <label> at <to>'", () => {
    expect(
      describeChange({
        action: "keep",
        label: "Sleep",
        kind: "sleep",
        toTime: "22:30",
        reason: "x",
      }),
    ).toBe("Keep Sleep at 22:30");
  });
});
