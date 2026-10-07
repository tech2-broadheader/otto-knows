// Payday rollover (story 11.4). Pure, UTC-safe date math on YYYY-MM-DD strings.
//
// An Income stores one `nextPayDate`, set when the user enters it; nothing ever
// advanced it, so payday logic went stale after the first payday. Here the next
// payday is DERIVED from that seed + the cadence. It is computed, never written
// back: Otto doesn't silently change the user's data (CLAUDE.md §1.11).
import type { Income } from "@otto/schemas";

/** PH-standard semi-monthly paydays: the 15th and the 30th (month end if shorter). */
const SEMI_MONTHLY_FIRST_DAY = 15;
const SEMI_MONTHLY_SECOND_DAY = 30;

function toUtc(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1));
}

function fromUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/** The date `day` (clamped to month end) in the month `offset` months after `date`. */
function dayInMonth(date: Date, offset: number, day: number): Date {
  const year = date.getUTCFullYear();
  const monthIndex = date.getUTCMonth() + offset;
  const last = daysInMonth(year, monthIndex);
  return new Date(Date.UTC(year, monthIndex, Math.min(day, last)));
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

/**
 * The first payday on or after `asOfDate` for one income, or null when it can't
 * be derived (a custom cadence whose stored date has passed — ask the user).
 */
export function effectiveNextPayDate(income: Income, asOfDate: string): string | null {
  if (income.nextPayDate >= asOfDate) return income.nextPayDate;

  const seed = toUtc(income.nextPayDate);
  const asOf = toUtc(asOfDate);

  switch (income.cadence) {
    case "weekly":
    case "biweekly": {
      const step = income.cadence === "weekly" ? 7 : 14;
      const behind = Math.ceil((asOf.getTime() - seed.getTime()) / 86_400_000);
      return fromUtc(addDays(seed, Math.ceil(behind / step) * step));
    }
    case "monthly": {
      const anchorDay = seed.getUTCDate();
      for (let offset = 0; ; offset += 1) {
        const candidate = dayInMonth(asOf, offset, anchorDay);
        if (candidate >= asOf) return fromUtc(candidate);
      }
    }
    case "semi-monthly": {
      for (let offset = 0; ; offset += 1) {
        for (const day of [SEMI_MONTHLY_FIRST_DAY, SEMI_MONTHLY_SECOND_DAY]) {
          const candidate = dayInMonth(asOf, offset, day);
          if (candidate >= asOf) return fromUtc(candidate);
        }
      }
    }
    case "custom":
      return null;
  }
}

/** The soonest payday across all incomes, or null if none can be derived. */
export function nextPayday(incomes: readonly Income[], asOfDate: string): string | null {
  const dates = incomes
    .map((income) => effectiveNextPayDate(income, asOfDate))
    .filter((d): d is string => d !== null)
    .sort();
  return dates[0] ?? null;
}
