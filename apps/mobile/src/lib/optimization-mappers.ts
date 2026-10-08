// PURE change → anchor mappers for an accepted OptimizationProposal (Phase 3 /
// FR-O1). Kept in their own module (schemas only, NO native/db imports) so they
// are unit-tested in Node. The side-effecting persistence lives in
// apply-optimization.ts, which re-exports these.
//
// The optimizer proposes; the user confirms. These mappers describe WHAT a
// confirmed change does to the routine, without touching the store.
import {
  routineAnchorSchema,
  type Recurrence,
  type Routine,
  type RoutineAnchor,
  type ScheduleChange,
} from "@otto/schemas";
import { t } from "../i18n";

/** Injected context so the mappers stay pure (no `Date.now`/native id inside). */
export type ApplyOptimizationContext = {
  /** RFC-4122 v4 UUID factory (e.g. newUuid). */
  newId: () => string;
  /** Current instant as an ISO-8601 string with offset (e.g. nowIso()). */
  now: string;
};

/**
 * A `move` change → the updated RoutineAnchor: the matched existing anchor with
 * its `time` set to `change.toTime` and `updatedAt` re-stamped. Returns
 * `undefined` when the change has no `anchorId` or no anchor matches it — the
 * caller treats a missing match as a no-op so apply never throws mid-batch.
 */
export function movedAnchor(
  change: ScheduleChange,
  routine: Routine,
  ctx: ApplyOptimizationContext,
): RoutineAnchor | undefined {
  if (change.anchorId === undefined) return undefined;
  const existing = routine.anchors.find((a) => a.id === change.anchorId);
  if (!existing) return undefined;
  return routineAnchorSchema.parse({
    ...existing,
    time: change.toTime,
    updatedAt: ctx.now,
  });
}

/**
 * An `add` change → a brand-new RoutineAnchor built from the change's
 * label/kind/toTime, carrying the new routine's recurrence. Stamps a fresh
 * id + timestamps. Validated at the schema boundary.
 */
export function addedAnchor(
  change: ScheduleChange,
  recurrence: Recurrence,
  ctx: ApplyOptimizationContext,
): RoutineAnchor {
  return routineAnchorSchema.parse({
    id: ctx.newId(),
    label: change.label,
    kind: change.kind,
    time: change.toTime,
    recurrence,
    createdAt: ctx.now,
    updatedAt: ctx.now,
  });
}

/** A short, human-readable one-liner for a change row (e.g. "Move Lunch 11:30 → 12:30"). */
export function describeChange(change: ScheduleChange): string {
  switch (change.action) {
    case "move":
      return t("assistant.optimizer.describe.move", {
        label: change.label,
        from: change.fromTime ?? "?",
        to: change.toTime,
      });
    case "add":
      return t("assistant.optimizer.describe.add", { label: change.label, time: change.toTime });
    case "keep":
      return t("assistant.optimizer.describe.keep", { label: change.label, time: change.toTime });
    default: {
      const _exhaustive: never = change.action;
      return String(_exhaustive);
    }
  }
}
