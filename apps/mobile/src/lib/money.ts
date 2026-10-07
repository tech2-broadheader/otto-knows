// Money formatting / parsing at the UI edge.
//
// Money in the @otto contracts is INTEGER CENTAVOS (minor units) to avoid float
// drift (see moneySchema). These helpers convert at the UI boundary ONLY:
// centavos -> "₱1,234.50" for display, and a user-typed peso string -> centavos
// for persistence. Pure; no native imports — unit-tested in Node.
// parseMoneyInput handles any supported currency and locale (story 13.1); the
// peso-only helpers remain until every screen reads the user's settings.
import { currencyMinorUnits, type CurrencyCode } from "@otto/schemas";

/** Format integer centavos as a Philippine-peso string, e.g. 123450 -> "₱1,234.50". */
export function formatPeso(amountMinor: number): string {
  const pesos = amountMinor / 100;
  const formatted = pesos.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `₱${formatted}`;
}

/**
 * Parse a user-typed peso string into integer centavos. Accepts an optional
 * leading "₱", thousands separators, and up to two decimal places. Returns
 * `null` when the input is not a valid, non-negative amount — the caller surfaces
 * a friendly validation message (no silent coercion).
 */
export function parsePesoToCentavos(input: string): number | null {
  const cleaned = input.trim().replace(/^₱/, "").replace(/,/g, "");
  if (cleaned === "") return null;
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const pesos = Number.parseFloat(cleaned);
  if (!Number.isFinite(pesos) || pesos < 0) return null;
  // Round to guard against binary-float artefacts (e.g. 0.1 * 100).
  return Math.round(pesos * 100);
}

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
