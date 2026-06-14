import { describe, expect, it } from "vitest";
import type { RoutineAnchor } from "@otto/schemas";
import {
  DAY_END_MINUTES,
  DAY_START_MINUTES,
  anchorsToBusyIntervals,
  computeFreeSlots,
  findNextFreeSlot,
  minutesToTime,
  normalizeBusyIntervals,
  placeRelativeToAnchor,
  timeToMinutes,
  type BusyInterval,
  type TimeSlot,
} from "./scheduling";

const ISO = "2026-06-14T08:00:00+08:00";

/** Build a RoutineAnchor with sensible defaults for scheduling tests. */
function anchor(id: string, time: string, label = id): RoutineAnchor {
  return {
    id,
    label,
    kind: "custom",
    time,
    recurrence: { freq: "daily" },
    createdAt: ISO,
    updatedAt: ISO,
  };
}

describe("timeToMinutes / minutesToTime", () => {
  it("converts HH:mm to minutes-of-day", () => {
    expect(timeToMinutes("00:00")).toBe(0);
    expect(timeToMinutes("01:30")).toBe(90);
    expect(timeToMinutes("23:59")).toBe(1439);
  });

  it("round-trips through minutesToTime", () => {
    expect(minutesToTime(0)).toBe("00:00");
    expect(minutesToTime(90)).toBe("01:30");
    expect(minutesToTime(timeToMinutes("14:05"))).toBe("14:05");
  });

  it("clamps end-of-day minutes to 23:59", () => {
    expect(minutesToTime(DAY_END_MINUTES)).toBe("23:59");
  });

  it("throws on malformed time (programming error, not user input)", () => {
    expect(() => timeToMinutes("8:30")).toThrow();
    expect(() => timeToMinutes("24:00")).toThrow();
  });
});

describe("normalizeBusyIntervals", () => {
  it("merges overlapping intervals", () => {
    // Arrange
    const intervals: BusyInterval[] = [
      { start: 540, end: 660 }, // 09:00–11:00
      { start: 600, end: 720 }, // 10:00–12:00
    ];
    // Act
    const merged = normalizeBusyIntervals(intervals);
    // Assert
    expect(merged).toEqual([{ start: 540, end: 720, label: undefined }]);
  });

  it("merges exactly back-to-back intervals", () => {
    const merged = normalizeBusyIntervals([
      { start: 540, end: 600 },
      { start: 600, end: 660 },
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ start: 540, end: 660 });
  });

  it("drops zero/negative-length intervals and clamps to the day", () => {
    const merged = normalizeBusyIntervals([
      { start: 100, end: 100 }, // zero length, dropped
      { start: -50, end: 60 }, // clamped to 0..60
      { start: 1400, end: 2000 }, // clamped end to 1440
    ]);
    expect(merged).toEqual([
      { start: 0, end: 60, label: undefined },
      { start: 1400, end: 1440, label: undefined },
    ]);
  });

  it("sorts unordered input", () => {
    const merged = normalizeBusyIntervals([
      { start: 700, end: 800 },
      { start: 100, end: 200 },
    ]);
    expect(merged.map((i) => i.start)).toEqual([100, 700]);
  });
});

describe("computeFreeSlots", () => {
  it("returns the whole day when nothing is busy", () => {
    const slots = computeFreeSlots([]);
    expect(slots).toEqual([
      { start: DAY_START_MINUTES, end: DAY_END_MINUTES, durationMinutes: 1440 },
    ]);
  });

  it("returns no slots when the whole day is busy", () => {
    const slots = computeFreeSlots([{ start: 0, end: DAY_END_MINUTES }]);
    expect(slots).toEqual([]);
  });

  it("splits the day around a busy block", () => {
    // Busy 09:00–10:00.
    const slots = computeFreeSlots([{ start: 540, end: 600 }]);
    expect(slots).toEqual([
      { start: 0, end: 540, durationMinutes: 540 },
      { start: 600, end: 1440, durationMinutes: 840 },
    ]);
  });

  it("produces no zero-length slot between back-to-back blocks", () => {
    const slots = computeFreeSlots([
      { start: 540, end: 600 },
      { start: 600, end: 660 },
    ]);
    // Only the gaps before 09:00 and after 11:00 remain.
    expect(slots).toEqual([
      { start: 0, end: 540, durationMinutes: 540 },
      { start: 660, end: 1440, durationMinutes: 780 },
    ]);
  });

  it("handles overlapping busy blocks (via normalization)", () => {
    const slots = computeFreeSlots([
      { start: 540, end: 660 },
      { start: 600, end: 720 },
    ]);
    expect(slots).toEqual([
      { start: 0, end: 540, durationMinutes: 540 },
      { start: 720, end: 1440, durationMinutes: 720 },
    ]);
  });

  it("respects narrowed day bounds (e.g. waking hours)", () => {
    // Waking 07:00–22:00, lunch 12:00–13:00.
    const slots = computeFreeSlots([{ start: 720, end: 780 }], 420, 1320);
    expect(slots).toEqual([
      { start: 420, end: 720, durationMinutes: 300 },
      { start: 780, end: 1320, durationMinutes: 540 },
    ]);
  });

  it("returns no slots when bounds are inverted", () => {
    expect(computeFreeSlots([], 600, 600)).toEqual([]);
    expect(computeFreeSlots([], 700, 600)).toEqual([]);
  });
});

describe("anchorsToBusyIntervals", () => {
  it("maps anchors to point intervals by default (no slot consumed)", () => {
    const intervals = anchorsToBusyIntervals([anchor("a1", "12:30", "Lunch")]);
    expect(intervals).toEqual([{ start: 750, end: 750, label: "Lunch" }]);
  });

  it("treats anchors as fixed blocks when a duration is given", () => {
    const intervals = anchorsToBusyIntervals([anchor("a1", "12:30", "Lunch")], 30);
    expect(intervals).toEqual([{ start: 750, end: 780, label: "Lunch" }]);
  });
});

describe("findNextFreeSlot", () => {
  const slots: TimeSlot[] = [
    { start: 0, end: 540, durationMinutes: 540 },
    { start: 600, end: 660, durationMinutes: 60 },
    { start: 720, end: 1440, durationMinutes: 720 },
  ];

  it("finds the next slot at/after a cursor", () => {
    expect(findNextFreeSlot(slots, 580, 30)).toEqual(slots[1]);
  });

  it("skips slots too small for the duration", () => {
    // From 580 needing 120 min: 600–660 (60) too small; falls to 720–1440.
    expect(findNextFreeSlot(slots, 580, 120)).toEqual(slots[2]);
  });

  it("returns null when nothing fits", () => {
    expect(findNextFreeSlot(slots, 1430, 60)).toBeNull();
  });
});

describe("placeRelativeToAnchor", () => {
  // Day: lunch anchor at 12:00 (720), a fixed 2pm block 14:00–15:00 (840–900).
  const anchors = [anchor("lunch", "12:00", "Lunch")];
  const busy: BusyInterval[] = [
    { start: 720, end: 720, label: "Lunch" }, // lunch as a point
    { start: 840, end: 900, label: "2pm block" },
  ];
  const freeSlots = computeFreeSlots(busy);

  it("places an item AFTER lunch, BEFORE the 2pm block (the AC scenario)", () => {
    // Arrange: "after lunch" → start >= 12:00; fits in the 12:00–14:00 slot.
    // Act
    const result = placeRelativeToAnchor(
      { relation: "after", anchorId: "lunch", durationMinutes: 30 },
      anchors,
      freeSlots,
    );
    // Assert
    expect(result).not.toBeNull();
    expect(result?.startMinutes).toBe(720);
    expect(result?.endMinutes).toBe(750);
    expect(minutesToTime(result?.startMinutes ?? -1)).toBe("12:00");
  });

  it("places an item BEFORE an anchor, ending by the anchor time", () => {
    const result = placeRelativeToAnchor(
      { relation: "before", anchorId: "lunch", durationMinutes: 30 },
      anchors,
      freeSlots,
    );
    expect(result).not.toBeNull();
    // Latest fit ending by 12:00 in the 00:00–12:00 slot.
    expect(result?.endMinutes).toBe(720);
    expect(result?.startMinutes).toBe(690);
  });

  it("honours gapMinutes for before/after", () => {
    const after = placeRelativeToAnchor(
      { relation: "after", anchorId: "lunch", durationMinutes: 15, gapMinutes: 30 },
      anchors,
      freeSlots,
    );
    expect(after?.startMinutes).toBe(750); // 12:00 + 30 gap

    const before = placeRelativeToAnchor(
      { relation: "before", anchorId: "lunch", durationMinutes: 15, gapMinutes: 30 },
      anchors,
      freeSlots,
    );
    expect(before?.endMinutes).toBe(690); // ends 30 min before 12:00
  });

  it("places AT an anchor when the moment is free", () => {
    const result = placeRelativeToAnchor(
      { relation: "at", anchorId: "lunch", durationMinutes: 0 },
      anchors,
      freeSlots,
    );
    expect(result?.startMinutes).toBe(720);
  });

  it("places in the next free slot from a cursor", () => {
    const result = placeRelativeToAnchor(
      { relation: "next-free", durationMinutes: 30, fromMinutes: 800 },
      anchors,
      freeSlots,
    );
    // 800 is inside the 720–840 slot; placed there.
    expect(result?.startMinutes).toBe(800);
    expect(result?.endMinutes).toBe(830);
  });

  it("returns null when the named anchor is missing", () => {
    const result = placeRelativeToAnchor(
      { relation: "after", anchorId: "does-not-exist" },
      anchors,
      freeSlots,
    );
    expect(result).toBeNull();
  });

  it("returns null when there is no free space after the anchor", () => {
    // Whole day busy from lunch onward.
    const noSpace = computeFreeSlots([{ start: 720, end: DAY_END_MINUTES }]);
    const result = placeRelativeToAnchor(
      { relation: "after", anchorId: "lunch", durationMinutes: 30 },
      anchors,
      noSpace,
    );
    expect(result).toBeNull();
  });

  it("returns null when the item is too large for any slot before the anchor", () => {
    // Only a tiny slot before lunch: 11:50–12:00 (10 min) needing 30.
    const tight = computeFreeSlots([
      { start: 0, end: 710 },
      { start: 720, end: DAY_END_MINUTES },
    ]);
    const result = placeRelativeToAnchor(
      { relation: "before", anchorId: "lunch", durationMinutes: 30 },
      anchors,
      tight,
    );
    expect(result).toBeNull();
  });
});
