// Safe-to-spend until the next payday (story 11.4). Pure.
//
//   safe = money on hand − unpaid bills due on/before payday (incl. overdue)
//          − credit-card amount owed
//
// Money is integer centavos throughout; the per-day figure uses floor division.
import type { Account, Bill, Income, Nudge, SafeToSpend, Transaction } from "@otto/schemas";
import { summarizeWallets } from "./accounts";
import { formatPeso, formatShortDate } from "./format";
import type { IdFactory } from "./insights";
import { nextPayday } from "./payday";

export type SafeToSpendInput = {
  accounts: readonly Account[];
  transactions: readonly Transaction[];
  bills: readonly Bill[];
  incomes: readonly Income[];
  /** Today, YYYY-MM-DD (device-local date). */
  asOfDate: string;
};

function daysBetween(from: string, to: string): number {
  const utc = (d: string): number => {
    const [y, m, day] = d.split("-").map(Number);
    return Date.UTC(y ?? 1970, (m ?? 1) - 1, day ?? 1);
  };
  return Math.round((utc(to) - utc(from)) / 86_400_000);
}

export function computeSafeToSpend(input: SafeToSpendInput): SafeToSpend {
  const wallets = summarizeWallets(input.accounts, input.transactions);
  const common = {
    asOf: input.asOfDate,
    onHandMinor: wallets.onHandMinor,
    cardOwedMinor: wallets.cardOwedMinor,
    currency: wallets.currency,
  };

  if (input.incomes.length === 0) {
    return {
      ...common,
      status: "no-income",
      billsBeforePaydayMinor: 0,
      safeMinor: wallets.onHandMinor - wallets.cardOwedMinor,
    };
  }

  const payday = nextPayday(input.incomes, input.asOfDate);
  if (payday === null) {
    return {
      ...common,
      status: "needs-payday-update",
      billsBeforePaydayMinor: 0,
      safeMinor: wallets.onHandMinor - wallets.cardOwedMinor,
    };
  }

  const billsBeforePaydayMinor = input.bills
    .filter((b) => !b.isPaid && b.dueDate <= payday)
    .reduce((sum, b) => sum + b.amount.amountMinor, 0);
  const safeMinor = wallets.onHandMinor - billsBeforePaydayMinor - wallets.cardOwedMinor;
  const daysUntilPayday = daysBetween(input.asOfDate, payday);

  return {
    ...common,
    status: "ok",
    nextPayday: payday,
    daysUntilPayday,
    billsBeforePaydayMinor,
    safeMinor,
    perDayMinor: safeMinor > 0 ? Math.floor(safeMinor / Math.max(daysUntilPayday, 1)) : 0,
  };
}

/**
 * One line for the Today briefing. Informational when there's room to spend; a
 * gentle heads-up (never a scold — spec §6.2) when bills exceed money on hand.
 * Returns null when there is no payday to plan against (Finance shows a prompt).
 */
export function safeToSpendNudge(result: SafeToSpend, makeId: IdFactory): Nudge | null {
  if (result.status !== "ok" || result.nextPayday === undefined) return null;
  const payday = formatShortDate(result.nextPayday);

  if (result.safeMinor < 0) {
    return {
      id: makeId(),
      kind: "safe-to-spend",
      message: `Heads up — bills before payday on ${payday} are ${formatPeso(-result.safeMinor)} more than what's on hand.`,
      severity: "gentle",
      relatedIds: [],
    };
  }
  return {
    id: makeId(),
    kind: "safe-to-spend",
    message: `${formatPeso(result.safeMinor)} is safe to spend until payday on ${payday} — about ${formatPeso(result.perDayMinor ?? 0)} a day.`,
    severity: "info",
    relatedIds: [],
  };
}
