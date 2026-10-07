// Budget math — spent vs limit per category for a month. Pure.
import type { BudgetCategory, Transaction } from "@otto/schemas";

export type CategorySpend = {
  categoryId: string;
  name: string;
  spentMinor: number;
  limitMinor: number | null;
  remainingMinor: number | null;
  isOverBudget: boolean;
};

export type BudgetSummary = {
  /** YYYY-MM */
  month: string;
  currency: string;
  totalSpentMinor: number;
  totalLimitMinor: number;
  uncategorizedMinor: number;
  categories: CategorySpend[];
};

/** True if the ISO datetime falls within the given YYYY-MM month. */
function isInMonth(occurredAt: string, month: string): boolean {
  return occurredAt.startsWith(`${month}-`) || occurredAt.startsWith(month);
}

/**
 * Summarize spending for `month` (YYYY-MM). Sums transactions per category,
 * compares to each category's monthly limit, and reports uncategorized spend.
 */
export function computeBudgetSummary(
  categories: readonly BudgetCategory[],
  transactions: readonly Transaction[],
  month: string,
): BudgetSummary {
  // Only expenses are spending: income and transfers (incl. card payments) never count.
  const monthTx = transactions.filter(
    (t) => t.type === "expense" && isInMonth(t.occurredAt, month),
  );
  const currency = categories[0]?.monthlyLimit?.currency ?? monthTx[0]?.amount.currency ?? "PHP";

  const spentByCategory = new Map<string, number>();
  let uncategorizedMinor = 0;
  for (const tx of monthTx) {
    if (tx.categoryId) {
      spentByCategory.set(
        tx.categoryId,
        (spentByCategory.get(tx.categoryId) ?? 0) + tx.amount.amountMinor,
      );
    } else {
      uncategorizedMinor += tx.amount.amountMinor;
    }
  }

  const categorySummaries: CategorySpend[] = categories.map((cat) => {
    const spentMinor = spentByCategory.get(cat.id) ?? 0;
    const limitMinor = cat.monthlyLimit?.amountMinor ?? null;
    const remainingMinor = limitMinor === null ? null : limitMinor - spentMinor;
    return {
      categoryId: cat.id,
      name: cat.name,
      spentMinor,
      limitMinor,
      remainingMinor,
      isOverBudget: remainingMinor !== null && remainingMinor < 0,
    };
  });

  return {
    month,
    currency,
    totalSpentMinor:
      categorySummaries.reduce((sum, c) => sum + c.spentMinor, 0) + uncategorizedMinor,
    totalLimitMinor: categorySummaries.reduce((sum, c) => sum + (c.limitMinor ?? 0), 0),
    uncategorizedMinor,
    categories: categorySummaries,
  };
}
