// Apply an accepted OptimizationProposal to the local routine (Phase 3 / FR-O1).
//
// The optimizer only ever PROPOSES (CLAUDE.md §1.11): nothing here runs until the
// user taps "Apply this plan" in OptimizerScreen. The change → anchor mapping is
// PURE and lives in ./optimization-mappers (re-exported below for callers/tests).
// `applyOptimization` is the only side effect — it builds each anchor with those
// mappers and routes it to the routine repository. This module imports the data
// layer (native), so it is NOT covered by the Node unit tests; the mappers it
// composes are.
import type { OptimizationProposal, Recurrence, Routine } from "@otto/schemas";
import { routineRepository } from "../data";
import { addedAnchor, movedAnchor, type ApplyOptimizationContext } from "./optimization-mappers";

export type { ApplyOptimizationContext } from "./optimization-mappers";
export { addedAnchor, describeChange, movedAnchor } from "./optimization-mappers";

/**
 * Persist an accepted plan against the user's loaded `routine`. Routes each
 * change by action:
 *   move → routineRepository.updateAnchor (matched by anchorId; time set to toTime)
 *   add  → routineRepository.addAnchor    (new anchor; carries newRoutineRecurrence)
 *   keep → no-op
 *
 * From the user's view this is one explicit action ("Apply this plan"); the local
 * store applies each change in turn. A `move` whose anchor can't be matched is
 * skipped (the mapper returns undefined) rather than aborting the batch.
 */
export async function applyOptimization(
  proposal: OptimizationProposal,
  routine: Routine,
  newRoutineRecurrence: Recurrence,
  ctx: ApplyOptimizationContext,
): Promise<void> {
  for (const change of proposal.changes) {
    if (change.action === "move") {
      const updated = movedAnchor(change, routine, ctx);
      if (updated) await routineRepository.updateAnchor(routine.id, updated);
      continue;
    }
    if (change.action === "add") {
      await routineRepository.addAnchor(routine.id, addedAnchor(change, newRoutineRecurrence, ctx));
      continue;
    }
    // "keep" — nothing to persist.
  }
}
