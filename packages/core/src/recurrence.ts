// Recurrence evaluation — does a recurring thing (anchor, reminder, bill, med) land
// on a given calendar date? Pure; operates on YYYY-MM-DD strings in UTC to avoid drift.
import type { DayOfWeek, Recurrence } from "@otto/schemas";

// new Date(...).getUTCDay(): 0 = Sunday … 6 = Saturday.
const DOW_BY_INDEX: readonly DayOfWeek[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

type Ymd = { year: number; month: number; day: number };

function parseYmd(date: string): Ymd {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new Error(`Invalid date (expected YYYY-MM-DD): ${date}`);
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

/** Day of week for a YYYY-MM-DD date. */
export function dayOfWeekFor(date: string): DayOfWeek {
  const { year, month, day } = parseYmd(date);
  const index = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const dow = DOW_BY_INDEX[index];
  if (!dow) throw new Error(`Unreachable: bad weekday index ${index}`);
  return dow;
}

/**
 * Whether a recurrence fires on `date`. For `once` and `weekly` the caller is
 * responsible for the base/anchor date — here they are treated as "eligible"
 * (a once item shows on its own date; weekly without a day set shows weekly).
 */
export function occursOnDate(recurrence: Recurrence, date: string): boolean {
  const dow = dayOfWeekFor(date);
  switch (recurrence.freq) {
    case "once":
    case "daily":
    case "weekly":
      return true;
    case "weekdays":
      return dow !== "sat" && dow !== "sun";
    case "weekends":
      return dow === "sat" || dow === "sun";
    case "monthly":
      return recurrence.dayOfMonth === undefined || recurrence.dayOfMonth === parseYmd(date).day;
    case "custom":
      return recurrence.daysOfWeek?.includes(dow) ?? false;
  }
}
