// PURE schedule-diffing for routine-timed notifications (Story 4.1). Kept
// native-free (no expo imports) so it is unit-testable in Node.
//
// A planned notification is identified by a stable key derived from its source
// and fire-time. Diffing the desired plan against what is already scheduled lets
// the app schedule only what's new and cancel only what's stale — so a reschedule
// on boot / after an edit never double-fires the same dose or reminder.
import type { PlannedNotification } from "@otto/core";

/**
 * Stable identity for a planned notification: source kind + source id + fire-time.
 * Two plans with the same key are the same scheduled item (don't reschedule).
 */
export function planKey(
  plan: Pick<PlannedNotification, "sourceKind" | "sourceId" | "fireAt">,
): string {
  return `${plan.sourceKind}:${plan.sourceId}:${plan.fireAt}`;
}

export type ScheduleDiff<T> = {
  /** Items in the desired plan that are not already scheduled — schedule these. */
  toSchedule: PlannedNotification[];
  /** Already-scheduled items no longer in the desired plan — cancel these. */
  toCancel: T[];
};

/**
 * Diff the desired plan against currently-scheduled items.
 *
 * `existing` is the list of already-scheduled items; `keyOf` extracts each one's
 * plan key (e.g. read back from the notification's `data`). Items whose key is in
 * both sets are left untouched (no double-fire); new keys are scheduled and
 * dropped keys are cancelled.
 */
export function diffSchedule<T>(
  desired: readonly PlannedNotification[],
  existing: readonly T[],
  keyOf: (item: T) => string | undefined,
): ScheduleDiff<T> {
  const existingKeys = new Set<string>();
  for (const item of existing) {
    const key = keyOf(item);
    if (key !== undefined) existingKeys.add(key);
  }

  const desiredKeys = new Set(desired.map(planKey));

  const toSchedule = desired.filter((plan) => !existingKeys.has(planKey(plan)));
  const toCancel = existing.filter((item) => {
    const key = keyOf(item);
    return key === undefined || !desiredKeys.has(key);
  });

  return { toSchedule, toCancel };
}
