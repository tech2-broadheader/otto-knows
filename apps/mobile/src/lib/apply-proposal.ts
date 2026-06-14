// Apply an accepted Proposal to the local store (Phase 2 — "the brain").
//
// The LLM only ever PROPOSES (CLAUDE.md §1.11): nothing here runs until the user
// taps Accept in ProposalCard. The draft → entity mapping is PURE and lives in
// ./proposal-mappers (re-exported below for callers/tests). `applyProposal` is
// the only side effect — it builds the entity with those mappers and routes it
// to the matching repository. This module imports the data layer (native), so
// it is NOT covered by the Node unit tests; the mappers it composes are.
import type { ProposalAction } from "@otto/schemas";
import {
  makeBillRepository,
  makeMedicationRepository,
  makeTransactionRepository,
  reminderRepository,
  routineRepository,
  type RepositoryDeps,
} from "../data";
import { LOCAL_USER_ID } from "./constants";
import {
  anchorFromDraft,
  billFromDraft,
  medicationFromDraft,
  reminderFromDraft,
  reminderFromTimeBlock,
  transactionFromExpenseDraft,
  type ApplyContext,
} from "./proposal-mappers";

export type { ApplyContext } from "./proposal-mappers";
export {
  anchorFromDraft,
  billFromDraft,
  medicationFromDraft,
  reminderFromDraft,
  reminderFromTimeBlock,
  transactionFromExpenseDraft,
} from "./proposal-mappers";

/**
 * Persist an accepted proposal. Builds the entity with the pure mappers, then
 * routes it to the matching repository:
 *   create_reminder    → reminderRepository.create
 *   log_expense        → transactionRepository.create
 *   add_bill           → billRepository.create
 *   add_medication     → medicationRepository.create
 *   add_routine_anchor → routineRepository.addAnchor (needs an existing routine)
 *   block_time         → reminderRepository.create (timed reminder)
 *
 * Throws if `add_routine_anchor` is accepted with no routine set up — the caller
 * surfaces a friendly message (set up your routine first).
 */
export async function applyProposal(
  action: ProposalAction,
  deps: RepositoryDeps,
  ctx: ApplyContext,
): Promise<void> {
  switch (action.type) {
    case "create_reminder":
      await reminderRepository.create(reminderFromDraft(action.reminder, ctx));
      return;
    case "log_expense":
      await makeTransactionRepository(deps).create(
        transactionFromExpenseDraft(action.expense, ctx),
      );
      return;
    case "add_bill":
      await makeBillRepository(deps).create(billFromDraft(action.bill, ctx));
      return;
    case "add_medication":
      await makeMedicationRepository(deps).create(medicationFromDraft(action.medication, ctx));
      return;
    case "add_routine_anchor": {
      const routine = await routineRepository.getForUser(ctx.userId ?? LOCAL_USER_ID);
      if (!routine) {
        throw new Error("Set up your routine before adding an anchor.");
      }
      await routineRepository.addAnchor(routine.id, anchorFromDraft(action.anchor, ctx));
      return;
    }
    case "block_time":
      await reminderRepository.create(reminderFromTimeBlock(action.block, ctx));
      return;
    default: {
      // Exhaustiveness guard — a new action variant must be handled above.
      const _exhaustive: never = action;
      throw new Error(`Unhandled proposal action: ${JSON.stringify(_exhaustive)}`);
    }
  }
}
