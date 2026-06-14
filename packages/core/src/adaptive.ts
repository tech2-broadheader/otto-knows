// Adaptive routine (7.1) + deviation radar (7.2). Light heuristics, not ML — you
// don't need a model to notice someone logs lunch at 12:30, not 11 (spec §7).
// Pure: the app feeds in observed action times; these suggest adjustments and
// emit gentle drift nudges (propose-and-confirm; never auto-applied).
import type { Nudge, Routine, RoutineAnchor } from "@otto/schemas";
import type { IdFactory } from "./insights";

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function toTime(minutes: number): string {
  const clamped = Math.max(0, Math.min(1439, Math.round(minutes)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Median of a set of HH:mm times, returned as HH:mm. Null if empty. */
export function medianTime(times: readonly string[]): string | null {
  if (times.length === 0) return null;
  const mins = times.map(toMinutes).sort((a, b) => a - b);
  const mid = Math.floor(mins.length / 2);
  const median =
    mins.length % 2 === 0 ? ((mins[mid - 1] ?? 0) + (mins[mid] ?? 0)) / 2 : (mins[mid] ?? 0);
  return toTime(median);
}

export type AnchorAdjustment = {
  anchorId: string;
  label: string;
  currentTime: string;
  suggestedTime: string;
  deltaMinutes: number;
};

export type AdaptiveOptions = {
  /** Min minutes of drift before we suggest a change. */
  minDeltaMinutes?: number;
  /** Min observations before we trust the pattern. */
  minSamples?: number;
};

/**
 * Suggest a time adjustment for one anchor from observed action times. Returns
 * null when there's too little data or the drift is within tolerance.
 */
export function suggestAnchorAdjustment(
  anchor: Pick<RoutineAnchor, "id" | "label" | "time">,
  observedTimes: readonly string[],
  options: AdaptiveOptions = {},
): AnchorAdjustment | null {
  const minDelta = options.minDeltaMinutes ?? 20;
  const minSamples = options.minSamples ?? 4;
  if (observedTimes.length < minSamples) return null;

  const suggested = medianTime(observedTimes);
  if (!suggested) return null;

  const deltaMinutes = Math.round(toMinutes(suggested) - toMinutes(anchor.time));
  if (Math.abs(deltaMinutes) < minDelta) return null;

  return {
    anchorId: anchor.id,
    label: anchor.label,
    currentTime: anchor.time,
    suggestedTime: suggested,
    deltaMinutes,
  };
}

/** All adjustments worth suggesting across a routine, given per-anchor observations. */
export function adaptRoutine(
  routine: Routine,
  observationsByAnchorId: Readonly<Record<string, readonly string[]>>,
  options: AdaptiveOptions = {},
): AnchorAdjustment[] {
  const adjustments: AnchorAdjustment[] = [];
  for (const anchor of routine.anchors) {
    const observed = observationsByAnchorId[anchor.id] ?? [];
    const adjustment = suggestAnchorAdjustment(anchor, observed, options);
    if (adjustment) adjustments.push(adjustment);
  }
  return adjustments;
}

/**
 * Deviation radar: turn routine drift into gentle nudges — a kind observation,
 * never a nag. "You've been doing lunch closer to 1pm — want to move it?"
 */
export function detectRoutineDriftNudges(
  routine: Routine,
  observationsByAnchorId: Readonly<Record<string, readonly string[]>>,
  makeId: IdFactory,
  options: AdaptiveOptions = {},
): Nudge[] {
  return adaptRoutine(routine, observationsByAnchorId, options).map((adj) => {
    const direction = adj.deltaMinutes > 0 ? "later" : "earlier";
    return {
      id: makeId(),
      kind: "deviation",
      message: `You've been doing ${adj.label} a bit ${direction} — around ${adj.suggestedTime} rather than ${adj.currentTime}. Want to move it?`,
      severity: "gentle",
      relatedIds: [adj.anchorId],
    };
  });
}
