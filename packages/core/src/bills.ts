// Paying a bill (story 11.6): a repeating bill rolls forward to its next due
// date, unpaid again; a one-time bill is simply marked paid. Monthly bills keep
// their day (a bill due on the 31st falls on the 28th in February and returns
// to the 31st in March). PURE — unit-tested.
import type { Bill } from "@otto/schemas";
import { occursOnDate } from "./recurrence";

const DAY_MS = 86_400_000;
/** A weekly-pattern repeat always lands within a week; a little slack for safety. */
const MAX_SCAN_DAYS = 14;

function toUtc(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(date: string, days: number): string {
  return iso(new Date(toUtc(date).getTime() + days * DAY_MS));
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/** The day of month a monthly bill belongs to (its pinned day, else its due date's day). */
function monthlyDay(bill: Bill): number {
  return bill.recurrence.dayOfMonth ?? toUtc(bill.dueDate).getUTCDate();
}

/** The bill's next due date after its current one, or null for a one-time bill. */
export function nextBillDueDate(bill: Bill): string | null {
  const { freq } = bill.recurrence;
  if (freq === "once") return null;
  if (freq === "monthly") {
    const due = toUtc(bill.dueDate);
    const year = due.getUTCFullYear() + (due.getUTCMonth() === 11 ? 1 : 0);
    const month = (due.getUTCMonth() + 1) % 12;
    const day = Math.min(monthlyDay(bill), daysInMonth(year, month));
    return iso(new Date(Date.UTC(year, month, day)));
  }
  if (freq === "weekly") return addDays(bill.dueDate, 7);
  for (let offset = 1; offset <= MAX_SCAN_DAYS; offset += 1) {
    const candidate = addDays(bill.dueDate, offset);
    if (occursOnDate(bill.recurrence, candidate)) return candidate;
  }
  return null;
}

/** The bill after it has been paid at `now` (ISO with offset). */
export function markBillPaid(bill: Bill, now: string): Bill {
  const next = nextBillDueDate(bill);
  if (next === null) return { ...bill, isPaid: true, updatedAt: now };
  const recurrence =
    bill.recurrence.freq === "monthly"
      ? { ...bill.recurrence, dayOfMonth: monthlyDay(bill) }
      : bill.recurrence;
  return { ...bill, dueDate: next, recurrence, isPaid: false, updatedAt: now };
}
