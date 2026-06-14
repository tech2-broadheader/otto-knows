// Cross-domain forecasts (Phase 3 / E7) — med-refill warnings and overspend
// prediction. Pure; gentle tone (spec §6.2). ids via injected factory.
import type { Bill, BudgetCategory, Medication, Nudge, Transaction } from "@otto/schemas";
import type { IdFactory } from "./insights";
import { computeBudgetSummary } from "./budget";

/** Days of supply left for a medication, given doses/day from its schedule. */
export function medicationDaysRemaining(
  med: Pick<Medication, "times" | "quantityRemaining">,
): number | null {
  if (med.quantityRemaining === undefined) return null;
  const dosesPerDay = med.times.length;
  if (dosesPerDay <= 0) return null;
  return Math.floor(med.quantityRemaining / dosesPerDay);
}

/**
 * Warn when a medication will run out within `withinDays`. Gentle nudge — a
 * heads-up to refill, never an alarm.
 */
export function detectMedRefillNudges(
  medications: readonly Medication[],
  makeId: IdFactory,
  withinDays = 5,
): Nudge[] {
  const nudges: Nudge[] = [];
  for (const med of medications) {
    const days = medicationDaysRemaining(med);
    if (days === null || days > withinDays) continue;
    const when = days <= 0 ? "today" : days === 1 ? "tomorrow" : `in about ${days} days`;
    nudges.push({
      id: makeId(),
      kind: "med-refill",
      message: `${med.name} runs out ${when} — a good time to refill.`,
      severity: "gentle",
      relatedIds: [med.id],
    });
  }
  return nudges;
}

/**
 * Predict an overspend: project this month's spend per category from the pace so
 * far and flag categories on track to exceed their limit. `dayOfMonth` and
 * `daysInMonth` describe how far through the month we are.
 */
export function detectOverspendNudges(
  categories: readonly BudgetCategory[],
  transactions: readonly Transaction[],
  month: string,
  dayOfMonth: number,
  daysInMonth: number,
  makeId: IdFactory,
): Nudge[] {
  if (dayOfMonth <= 0 || daysInMonth <= 0) return [];
  const summary = computeBudgetSummary(categories, transactions, month);
  const fractionElapsed = Math.min(dayOfMonth / daysInMonth, 1);
  if (fractionElapsed === 0) return [];

  const nudges: Nudge[] = [];
  for (const cat of summary.categories) {
    if (cat.limitMinor === null || cat.spentMinor === 0) continue;
    const projected = Math.round(cat.spentMinor / fractionElapsed);
    if (projected > cat.limitMinor) {
      nudges.push({
        id: makeId(),
        kind: "overspend",
        message: `You're pacing toward going over your ${cat.name} budget this month — worth easing off if you can.`,
        severity: "gentle",
        relatedIds: [cat.categoryId],
      });
    }
  }
  return nudges;
}

// Re-export Bill type usage so callers can compose with payday-vs-bill insights.
export type { Bill };
