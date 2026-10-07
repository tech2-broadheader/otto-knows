// YYYY-MM month helpers shared by the budget and the monthly report, so both
// agree on which month a transaction belongs to. Pure.

/**
 * True if the ISO datetime falls within the given YYYY-MM month. Uses the date as
 * written (the device-local offset it was recorded with), not UTC.
 */
export function isInMonth(occurredAt: string, month: string): boolean {
  return occurredAt.startsWith(`${month}-`) || occurredAt.startsWith(month);
}

/** "2026-01" → "2025-12". */
export function previousMonth(month: string): string {
  const [year, mon] = month.split("-").map(Number);
  const y = year ?? 1970;
  const m = mon ?? 1;
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}
