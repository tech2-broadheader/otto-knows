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
 * Summarize every wallet. Until story 11.3 adds income/transfers, every
 * transaction is spending, so it moves its wallet's balance down (on a credit
 * card that means more owed).
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
    const current = tx.accountId === undefined ? undefined : balances.get(tx.accountId);
    if (current === undefined || tx.accountId === undefined) {
      orphanTransactionIds.push(tx.id);
      continue;
    }
    balances.set(tx.accountId, current - tx.amount.amountMinor);
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
