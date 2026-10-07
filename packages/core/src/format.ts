// Shared, locale-stable formatting for template copy (briefings, nudges). Pure.

const MONTH_ABBR = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/** Integer centavos → "₱1,234.50". */
export function formatPeso(amountMinor: number): string {
  return `₱${(amountMinor / 100).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** "2026-10-15" → "Oct 15". Built by hand so it never depends on device locale data. */
export function formatShortDate(date: string): string {
  const [, month, day] = date.split("-").map(Number);
  return `${MONTH_ABBR[(month ?? 1) - 1] ?? ""} ${day ?? ""}`;
}
