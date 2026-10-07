// Locale-aware formatting for money and dates (story 13.1, ADR-007). Pure.
// Built on Intl — no currency symbol, separator or locale is hard-coded.
import {
  SUPPORTED_CURRENCIES,
  currencyMinorUnits,
  type CurrencyCode,
  type Money,
} from "@otto/schemas";

/** Money in the user's locale: ₱1,234.50 · $1,234.50 · 1.234,50 € · 25.000 ₫. */
export function formatMoney(money: Money, locale: string): string {
  const digits = currencyMinorUnits(money.currency);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: money.currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(money.amountMinor / 10 ** digits);
}

/**
 * "2026-10-15" → "Oct 15" (en-US) / "15 Oct" (en-GB). The date is read as a
 * calendar date in UTC so the device's timezone can never shift the day.
 */
export function formatShortDate(date: string, locale: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1)));
}

/** Region → currency for the launch markets; anything else falls back to USD. */
const REGION_CURRENCY: Record<string, CurrencyCode> = {
  PH: "PHP",
  SG: "SGD",
  MY: "MYR",
  ID: "IDR",
  TH: "THB",
  VN: "VND",
  US: "USD",
  CA: "CAD",
  GB: "GBP",
  CH: "CHF",
  SE: "SEK",
  NO: "NOK",
  DK: "DKK",
  PL: "PLN",
  CZ: "CZK",
};
const EURO_REGIONS = new Set([
  "AT",
  "BE",
  "CY",
  "DE",
  "EE",
  "ES",
  "FI",
  "FR",
  "GR",
  "HR",
  "IE",
  "IT",
  "LT",
  "LU",
  "LV",
  "MT",
  "NL",
  "PT",
  "SI",
  "SK",
]);
const FALLBACK_CURRENCY: CurrencyCode = "USD";

export type SuggestedSettings = { currency: CurrencyCode; locale: string; timezone: string };

/**
 * First-run defaults from the device's locale and timezone (the user confirms
 * or changes them in onboarding). Tolerates "en_US"-style and empty values.
 */
export function suggestSettings(deviceLocale: string, deviceTimeZone: string): SuggestedSettings {
  const locale = deviceLocale.replace(/_/g, "-") || "en";
  const region = locale.split("-").find((part) => /^[A-Z]{2}$/.test(part));
  const fromRegion = region
    ? (REGION_CURRENCY[region] ?? (EURO_REGIONS.has(region) ? "EUR" : undefined))
    : undefined;
  const currency =
    fromRegion && (SUPPORTED_CURRENCIES as readonly string[]).includes(fromRegion)
      ? fromRegion
      : FALLBACK_CURRENCY;
  return { currency, locale, timezone: deviceTimeZone || "UTC" };
}
