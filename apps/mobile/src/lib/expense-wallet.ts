// Quick Add → "Paid from" (story 11.3 AC5). An expense proposal starts on the
// wallet Otto suggested only if it is one of the user's active wallets, else the
// last-used one; the user's pick is written into the proposal before it is
// applied. PURE — unit-tested.
import type { ProposalAction } from "@otto/schemas";

/** The wallet pre-selected for an expense proposal. */
export function initialExpenseWallet(
  proposedAccountId: string | undefined,
  activeAccountIds: readonly string[],
  defaultAccountId: string | undefined,
): string | undefined {
  return proposedAccountId !== undefined && activeAccountIds.includes(proposedAccountId)
    ? proposedAccountId
    : defaultAccountId;
}

/** The proposal with the chosen wallet set (only expense proposals change). */
export function withExpenseWallet(action: ProposalAction, accountId: string): ProposalAction {
  if (action.type !== "log_expense") return action;
  return { ...action, expense: { ...action.expense, accountId } };
}
