// Monthly report (story 11.5): income, spending, net and spending by category,
// compared with the previous month. Pure; computed on device.
//
// Spending = expenses only. Transfers (incl. credit-card payments) never count;
// a card purchase counts in the month it was made.
import {
  DEFAULT_CURRENCY,
  type BudgetCategory,
  type CategoryReportLine,
  type MonthlyReport,
  type Transaction,
} from "@otto/schemas";
import { isInMonth, previousMonth } from "./month";

export { previousMonth } from "./month";

const UNCATEGORIZED = "Uncategorized";

type MonthTotals = {
  incomeMinor: number;
  spendingMinor: number;
  /** Spending per category id; "" = uncategorized. */
  byCategory: Map<string, number>;
  hasActivity: boolean;
};

function totalsFor(
  transactions: readonly Transaction[],
  month: string,
  knownCategories: ReadonlySet<string>,
): MonthTotals {
  const totals: MonthTotals = {
    incomeMinor: 0,
    spendingMinor: 0,
    byCategory: new Map(),
    hasActivity: false,
  };
  for (const tx of transactions) {
    if (!isInMonth(tx.occurredAt, month) || tx.type === "transfer") continue;
    totals.hasActivity = true;
    const amount = tx.amount.amountMinor;
    if (tx.type === "income") {
      totals.incomeMinor += amount;
      continue;
    }
    totals.spendingMinor += amount;
    // A deleted category's spending lands in Uncategorized rather than vanishing.
    const key = tx.categoryId && knownCategories.has(tx.categoryId) ? tx.categoryId : "";
    totals.byCategory.set(key, (totals.byCategory.get(key) ?? 0) + amount);
  }
  return totals;
}

/** % change, one decimal; null when there's nothing to compare against. */
function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function computeMonthlyReport(
  categories: readonly BudgetCategory[],
  transactions: readonly Transaction[],
  month: string,
): MonthlyReport {
  const names = new Map(categories.map((c) => [c.id, c.name]));
  const known = new Set(names.keys());
  const current = totalsFor(transactions, month, known);
  const prior = totalsFor(transactions, previousMonth(month), known);

  const keys = new Set([...current.byCategory.keys(), ...prior.byCategory.keys()]);
  const lines: CategoryReportLine[] = [...keys].map((key) => {
    const spentMinor = current.byCategory.get(key) ?? 0;
    const previousMinor = prior.byCategory.get(key) ?? 0;
    return {
      categoryId: key === "" ? null : key,
      name: key === "" ? UNCATEGORIZED : (names.get(key) ?? UNCATEGORIZED),
      spentMinor,
      previousMinor,
      changeMinor: spentMinor - previousMinor,
      changePct: percentChange(spentMinor, previousMinor),
    };
  });
  lines.sort((a, b) => b.spentMinor - a.spentMinor || a.name.localeCompare(b.name));

  return {
    month,
    currency: transactions[0]?.amount.currency ?? DEFAULT_CURRENCY,
    incomeMinor: current.incomeMinor,
    spendingMinor: current.spendingMinor,
    netMinor: current.incomeMinor - current.spendingMinor,
    categories: lines,
    previous: prior.hasActivity
      ? { incomeMinor: prior.incomeMinor, spendingMinor: prior.spendingMinor }
      : null,
  };
}
