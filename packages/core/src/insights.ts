// Cross-domain insight detection — the synthesis that makes Otto feel alive.
// Pure: ids are supplied by an injected factory so the logic stays deterministic
// and testable (the app passes expo-crypto's randomUUID; tests pass a counter).
import type { Bill, Income, Nudge } from "@otto/schemas";
import { formatPeso } from "./format";
import { nextPayday as deriveNextPayday } from "./payday";

export type IdFactory = () => string;

/** Inclusive day difference b - a for two YYYY-MM-DD dates. */
function daysBetween(a: string, b: string): number {
  const toUtc = (d: string): number => {
    const [y, m, day] = d.split("-").map(Number);
    return Date.UTC(y ?? 0, (m ?? 1) - 1, day ?? 1);
  };
  return Math.round((toUtc(b) - toUtc(a)) / 86_400_000);
}

/**
 * The headline nudge: a bill falls due before (or right around) the next payday.
 * Gentle by design — offers a heads-up, never a scold (spec §6.2).
 *
 * Emits a nudge for each unpaid bill due within `withinDays` of `asOfDate` whose
 * due date is on or before the soonest upcoming payday.
 */
export function detectPaydayVsBillNudges(
  incomes: readonly Income[],
  bills: readonly Bill[],
  asOfDate: string,
  makeId: IdFactory,
  withinDays = 7,
): Nudge[] {
  // Derived from each income's cadence so a stored date that has passed rolls
  // forward instead of silently disabling this nudge (story 11.4).
  const nextPayday = deriveNextPayday(incomes, asOfDate);
  if (!nextPayday) return [];

  const nudges: Nudge[] = [];
  for (const bill of bills) {
    if (bill.isPaid) continue;
    const daysUntilDue = daysBetween(asOfDate, bill.dueDate);
    if (daysUntilDue < 0 || daysUntilDue > withinDays) continue;
    if (bill.dueDate > nextPayday) continue; // due after payday — no squeeze

    nudges.push({
      id: makeId(),
      kind: "payday-vs-bill",
      message: `Heads up — ${bill.name} (${formatPeso(bill.amount.amountMinor)}) is due ${bill.dueDate}, but your next pay lands ${nextPayday}. Want a nudge the day before?`,
      severity: "gentle",
      relatedIds: [bill.id],
    });
  }
  return nudges;
}
