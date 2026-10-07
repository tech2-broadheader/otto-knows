// Wallet balances (story 11.2, ADR-004). Pure. Balances are DERIVED from each
// wallet's opening balance plus its transactions — never stored — so editing or
// deleting a transaction can't leave a total out of sync.
import type { Account, Transaction } from "@otto/schemas";

export type AccountBalance = {
  accountId: string;
  name: string;
  type: Account["type"];
  /** Signed minor units. Negative on a credit card = amount owed. */
  balanceMinor: number;
  archived: boolean;
};

export type WalletSummary = {
  currency: string;
  /** Cash + e-wallets + bank across active wallets. Card balances never count. */
  onHandMinor: number;
  /** Total owed across active credit cards, as a positive number. */
  cardOwedMinor: number;
  perAccount: AccountBalance[];
  /** Transactions with no wallet or an unknown one — surfaced, never dropped silently. */
  orphanTransactionIds: string[];
};

/**
 * Summarize every wallet. Expenses move money out of a wallet (on a credit card
 * that means more owed), income moves it in, and a transfer does both — so a
 * transfer never changes money on hand, and paying a card reduces what's owed.
 */
export function summarizeWallets(
  accounts: readonly Account[],
  transactions: readonly Transaction[],
): WalletSummary {
  const balances = new Map<string, number>(
    accounts.map((a) => [a.id, a.openingBalance.amountMinor]),
  );
  const orphanTransactionIds: string[] = [];

  for (const tx of transactions) {
    const from = balances.get(tx.accountId);
    const to = tx.type === "transfer" && tx.toAccountId ? balances.get(tx.toAccountId) : undefined;
    // Skip (and report) anything touching an unknown wallet rather than half-applying it.
    if (from === undefined || (tx.type === "transfer" && to === undefined)) {
      orphanTransactionIds.push(tx.id);
      continue;
    }
    const amount = tx.amount.amountMinor;
    if (tx.type === "income") {
      balances.set(tx.accountId, from + amount);
    } else {
      balances.set(tx.accountId, from - amount);
      if (tx.type === "transfer" && tx.toAccountId && to !== undefined) {
        balances.set(tx.toAccountId, to + amount);
      }
    }
  }

  const perAccount: AccountBalance[] = accounts.map((a) => ({
    accountId: a.id,
    name: a.name,
    type: a.type,
    balanceMinor: balances.get(a.id) ?? 0,
    archived: a.archivedAt !== undefined,
  }));

  let onHandMinor = 0;
  let cardOwedMinor = 0;
  for (const a of perAccount) {
    if (a.archived) continue;
    if (a.type === "credit_card") {
      // A card in credit (overpaid) is neither spendable cash nor debt.
      if (a.balanceMinor < 0) cardOwedMinor += -a.balanceMinor;
    } else {
      onHandMinor += a.balanceMinor;
    }
  }

  return {
    currency: accounts[0]?.openingBalance.currency ?? "PHP",
    onHandMinor,
    cardOwedMinor,
    perAccount,
    orphanTransactionIds,
  };
}

/** A wallet can be archived only once it's empty, so no money silently disappears from totals. */
export function canArchiveAccount(balanceMinor: number): boolean {
  return balanceMinor === 0;
}

/**
 * The wallet a new expense goes to when the user hasn't chosen one (quick-add):
 * the wallet of their most recent transaction, else Cash, else the first active
 * wallet. Archived wallets are never picked.
 */
export function pickDefaultAccountId(
  accounts: readonly Account[],
  transactions: readonly Transaction[],
  cashAccountId: string,
): string | undefined {
  const active = new Set(accounts.filter((a) => a.archivedAt === undefined).map((a) => a.id));
  const latest = [...transactions]
    .filter((t) => active.has(t.accountId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  if (latest) return latest.accountId;
  if (active.has(cashAccountId)) return cashAccountId;
  return accounts.find((a) => active.has(a.id))?.id;
}
