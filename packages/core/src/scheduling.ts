// Story 2.2 — Scheduling substrate (free-space slotting + relative placement).
//
// Pure, side-effect-free domain logic. Times are modelled internally as
// MINUTES-OF-DAY (0..1440) for correctness — string HH:mm math is error-prone
// (CODING_CONVENTIONS §5: pure where possible, isolate side effects).
import type { RoutineAnchor } from "@otto/schemas";

/** Inclusive lower / exclusive upper bound of a single day, in minutes. */
export const DAY_START_MINUTES = 0;
export const DAY_END_MINUTES = 24 * 60; // 1440 — exclusive end of day.

/**
 * A span of the day the user is occupied, in minutes-of-day.
 * `start` is inclusive, `end` is exclusive. `end` may equal DAY_END_MINUTES.
 */
export type BusyInterval = {
  /** Minutes from midnight, inclusive. 0..1440. */
  start: number;
  /** Minutes from midnight, exclusive. 0..1440, and > start. */
  end: number;
  /** Optional human label (e.g. a calendar event title) for diagnostics. */
  label?: string;
};

/** A contiguous free span of the day, in minutes-of-day (start inclusive, end exclusive). */
export type TimeSlot = {
  start: number;
  end: number;
  /** Convenience: end - start. */
  durationMinutes: number;
};

/** How a new item is positioned relative to a named anchor. */
export type PlacementRelation = "before" | "after" | "at" | "next-free";

/** A request to place a new item relative to the routine. */
export type PlacementRequest = {
  relation: PlacementRelation;
  /**
   * The anchor to position against. Required for before/after/at.
   * Ignored for "next-free" (which uses `fromMinutes`).
   */
  anchorId?: string;
  /**
   * How long the item needs, in minutes. Defaults to 0 (a point in time).
   * Used to ensure the placement fits inside a free slot.
   */
  durationMinutes?: number;
  /**
   * For "next-free": the earliest minute-of-day to search from. Defaults to
   * DAY_START_MINUTES. Also used as a lower bound for before/after searches.
   */
  fromMinutes?: number;
  /**
   * Gap to leave between the item and the reference anchor for before/after,
   * in minutes. Defaults to 0 (immediately adjacent).
   */
  gapMinutes?: number;
};

/** The resolved concrete placement of an item. */
export type PlacementResult = {
  /** Concrete start minute-of-day for the placed item. */
  startMinutes: number;
  /** Concrete end minute-of-day (= startMinutes + durationMinutes). */
  endMinutes: number;
  /** The free slot the item was placed into. */
  slot: TimeSlot;
};

const MINUTES_PER_HOUR = 60;
const TIME_OF_DAY_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Convert an `HH:mm` (24h) string into minutes-of-day (0..1439).
 * Throws on malformed input — callers pass schema-validated `timeOfDay` values,
 * so a throw here signals a programming error, not user input (no silent catch).
 */
export function timeToMinutes(time: string): number {
  const match = TIME_OF_DAY_PATTERN.exec(time);
  if (!match) {
    throw new Error(`Invalid time-of-day "${time}": expected HH:mm (24h).`);
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours * MINUTES_PER_HOUR + minutes;
}

/** Convert minutes-of-day into an `HH:mm` (24h) string. Clamps within the day. */
export function minutesToTime(totalMinutes: number): string {
  if (!Number.isFinite(totalMinutes)) {
    throw new Error(`Invalid minutes "${totalMinutes}".`);
  }
  // DAY_END_MINUTES (1440) maps back to 00:00 of the next day; clamp to 23:59
  // for a stable in-day representation.
  const clamped = Math.max(DAY_START_MINUTES, Math.min(totalMinutes, DAY_END_MINUTES - 1));
  const hours = Math.floor(clamped / MINUTES_PER_HOUR);
  const minutes = clamped % MINUTES_PER_HOUR;
  const pad = (n: number): string => n.toString().padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}`;
}

/**
 * Merge overlapping or back-to-back busy intervals into a normalized,
 * sorted, non-overlapping set. Out-of-range bounds are clamped to the day;
 * zero/negative-length intervals are dropped.
 */
export function normalizeBusyIntervals(intervals: readonly BusyInterval[]): BusyInterval[] {
  const cleaned = intervals
    .map((interval) => ({
      start: Math.max(DAY_START_MINUTES, Math.min(interval.start, DAY_END_MINUTES)),
      end: Math.max(DAY_START_MINUTES, Math.min(interval.end, DAY_END_MINUTES)),
      label: interval.label,
    }))
    .filter((interval) => interval.end > interval.start)
    .sort((a, b) => a.start - b.start);

  const merged: BusyInterval[] = [];
  for (const interval of cleaned) {
    const last = merged[merged.length - 1];
    // Merge when overlapping OR exactly back-to-back (last.end === interval.start).
    if (last && interval.start <= last.end) {
      last.end = Math.max(last.end, interval.end);
    } else {
      merged.push({ ...interval });
    }
  }
  return merged;
}

/**
 * Build the busy intervals contributed by routine anchors. An anchor is a
 * moment in time (single `time`), so each becomes a point/short block. Pass
 * `anchorDurationMinutes` to treat each anchor as occupying a fixed block
 * (e.g. a 30-minute meal); defaults to 0 (a point, which still splits slots).
 */
export function anchorsToBusyIntervals(
  anchors: readonly RoutineAnchor[],
  anchorDurationMinutes = 0,
): BusyInterval[] {
  return anchors.map((anchor) => {
    const start = timeToMinutes(anchor.time);
    return {
      start,
      end: Math.min(start + anchorDurationMinutes, DAY_END_MINUTES),
      label: anchor.label,
    };
  });
}

/**
 * Compute the FREE time slots of a day given the busy intervals.
 *
 * Free slots have a positive duration; zero-length gaps (back-to-back busy
 * blocks) produce no slot. The whole day is free when there are no busy
 * intervals. Day bounds default to the full day but can be narrowed (e.g. to
 * waking hours) via `dayStart` / `dayEnd`.
 */
export function computeFreeSlots(
  busy: readonly BusyInterval[],
  dayStart: number = DAY_START_MINUTES,
  dayEnd: number = DAY_END_MINUTES,
): TimeSlot[] {
  if (dayEnd <= dayStart) {
    return [];
  }
  const normalized = normalizeBusyIntervals(busy).filter(
    (interval) => interval.end > dayStart && interval.start < dayEnd,
  );

  const slots: TimeSlot[] = [];
  let cursor = dayStart;
  for (const interval of normalized) {
    const blockStart = Math.max(interval.start, dayStart);
    if (blockStart > cursor) {
      slots.push(makeSlot(cursor, blockStart));
    }
    cursor = Math.max(cursor, Math.min(interval.end, dayEnd));
  }
  if (cursor < dayEnd) {
    slots.push(makeSlot(cursor, dayEnd));
  }
  return slots;
}

function makeSlot(start: number, end: number): TimeSlot {
  return { start, end, durationMinutes: end - start };
}

/**
 * Find the next free slot at/after `fromMinutes` that can fit `durationMinutes`.
 * Returns `null` when no slot is large enough.
 */
export function findNextFreeSlot(
  freeSlots: readonly TimeSlot[],
  fromMinutes: number = DAY_START_MINUTES,
  durationMinutes = 0,
): TimeSlot | null {
  for (const slot of freeSlots) {
    const candidateStart = Math.max(slot.start, fromMinutes);
    if (candidateStart + durationMinutes <= slot.end) {
      return slot;
    }
  }
  return null;
}

/**
 * Place a new item relative to the routine, resolving to a concrete time.
 *
 * Supports:
 *  - "before" / "after" a named anchor (fits the item into the free slot on the
 *    relevant side, respecting `gapMinutes` and `durationMinutes`);
 *  - "at" a named anchor (snaps to the anchor's exact time if it fits a slot);
 *  - "next-free": the next free slot at/after `fromMinutes`.
 *
 * Returns `null` when the request can't be satisfied (anchor missing, no free
 * space, slot too small). The caller (per CLAUDE.md §1.11) turns a non-null
 * result into a *proposal* the user confirms — this function never writes back.
 */
export function placeRelativeToAnchor(
  request: PlacementRequest,
  anchors: readonly RoutineAnchor[],
  freeSlots: readonly TimeSlot[],
): PlacementResult | null {
  const duration = request.durationMinutes ?? 0;
  const gap = request.gapMinutes ?? 0;
  const from = request.fromMinutes ?? DAY_START_MINUTES;

  if (request.relation === "next-free") {
    const slot = findNextFreeSlot(freeSlots, from, duration);
    if (!slot) return null;
    const start = Math.max(slot.start, from);
    return buildResult(start, duration, slot);
  }

  const anchor = anchors.find((candidate) => candidate.id === request.anchorId);
  if (!anchor) return null;
  const anchorMinutes = timeToMinutes(anchor.time);

  if (request.relation === "at") {
    const slot = slotContaining(freeSlots, anchorMinutes, duration);
    if (!slot) return null;
    return buildResult(anchorMinutes, duration, slot);
  }

  if (request.relation === "before") {
    // The item must END at or before the anchor (minus gap). Search the slot
    // that ends nearest to, but not past, the anchor.
    const deadline = anchorMinutes - gap;
    const slot = latestSlotEndingBy(freeSlots, deadline, duration, from);
    if (!slot) return null;
    const start = Math.min(slot.end, deadline) - duration;
    if (start < slot.start || start < from) return null;
    return buildResult(start, duration, slot);
  }

  // relation === "after": item must START at or after anchor (plus gap).
  const earliest = Math.max(anchorMinutes + gap, from);
  const slot = findNextFreeSlot(freeSlots, earliest, duration);
  if (!slot) return null;
  const start = Math.max(slot.start, earliest);
  if (start + duration > slot.end) return null;
  return buildResult(start, duration, slot);
}

function buildResult(start: number, duration: number, slot: TimeSlot): PlacementResult {
  return { startMinutes: start, endMinutes: start + duration, slot };
}

/** The free slot that contains `minute` with room for `duration`, or null. */
function slotContaining(
  freeSlots: readonly TimeSlot[],
  minute: number,
  duration: number,
): TimeSlot | null {
  for (const slot of freeSlots) {
    if (minute >= slot.start && minute + duration <= slot.end) {
      return slot;
    }
  }
  return null;
}

/**
 * The latest free slot (at/after `from`) into which a `duration`-long item can
 * be placed so it ends at or before `deadline`.
 */
function latestSlotEndingBy(
  freeSlots: readonly TimeSlot[],
  deadline: number,
  duration: number,
  from: number,
): TimeSlot | null {
  let best: TimeSlot | null = null;
  for (const slot of freeSlots) {
    if (slot.end <= from) continue;
    const usableEnd = Math.min(slot.end, deadline);
    const start = usableEnd - duration;
    if (start >= slot.start && start >= from) {
      best = slot; // slots are sorted ascending, so the last match is latest.
    }
  }
  return best;
}
