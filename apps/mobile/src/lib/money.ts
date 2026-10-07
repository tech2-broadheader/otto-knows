// Money parsing / input helpers at the UI edge (story 13.1, ADR-007).
//
// Money in the @otto contracts is INTEGER MINOR UNITS of the user's home
// currency. These helpers convert at the UI boundary only — what the user types
// in their locale <-> minor units. Display formatting is formatMoney in
// @otto/core. Pure; no native imports — unit-tested in Node.
import { currencyMinorUnits, type CurrencyCode } from "@otto/schemas";

/** The locale's decimal and grouping characters, read from Intl (e.g. de-DE → "," and "."). */
function separators(locale: string): { decimal: string; group: string } {
  const parts = new Intl.NumberFormat(locale).formatToParts(12345.6);
  return {
    decimal: parts.find((p) => p.type === "decimal")?.value ?? ".",
    group: parts.find((p) => p.type === "group")?.value ?? ",",
  };
}

/** The symbols a user might type for this currency in this locale ("$", "US$", "USD"). */
function currencyMarks(currency: CurrencyCode, locale: string): string[] {
  const symbol = new Intl.NumberFormat(locale, { style: "currency", currency })
    .formatToParts(1)
    .find((p) => p.type === "currency")?.value;
  return [currency, ...(symbol ? [symbol] : [])];
}

/**
 * Parse what the user typed into integer minor units of `currency`, the way
 * their locale writes numbers (story 13.1): "1.234,50 €" in de-DE → 123450.
 * Returns null for anything that isn't a clean, non-negative amount with no
 * more decimals than the currency has — the caller shows a friendly message.
 */
export function parseMoneyInput(
  input: string,
  currency: CurrencyCode,
  locale: string,
): number | null {
  const { decimal, group } = separators(locale);
  let text = input.trim();
  for (const mark of currencyMarks(currency, locale)) text = text.split(mark).join("");
  // Spaces (incl. non-breaking) are never meaningful; grouping marks are dropped.
  text = text
    .replace(/[\s\u00a0\u202f]/g, "")
    .split(group)
    .join("");
  if (text === "") return null;

  const [whole, fraction = "", extra] = text.split(decimal);
  if (extra !== undefined || !/^\d+$/.test(whole ?? "") || !/^\d*$/.test(fraction)) return null;

  const digits = currencyMinorUnits(currency);
  if (fraction.length > digits) return null;
  return Number(whole) * 10 ** digits + Number(fraction.padEnd(digits, "0") || "0");
}

/** The symbol the user's locale shows for a currency ("₱", "$", "€"), for input prefixes. */
export function currencySymbol(currency: CurrencyCode, locale: string): string {
  return (
    new Intl.NumberFormat(locale, { style: "currency", currency })
      .formatToParts(0)
      .find((p) => p.type === "currency")?.value ?? currency
  );
}

/** Minor units → the text a user would type in their locale ("1234,50"), for edit forms. */
export function formatMoneyInput(
  amountMinor: number,
  currency: CurrencyCode,
  locale: string,
): string {
  const digits = currencyMinorUnits(currency);
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    useGrouping: false,
  }).format(amountMinor / 10 ** digits);
}
