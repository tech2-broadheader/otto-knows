// Regions a user can pick in Settings (story 13.1/13.4). A region sets the
// locale used for number and date formatting and suggests the home currency.
// The app's copy stays English at launch (ADR-007). PURE — unit-tested.
import type { CurrencyCode } from "@otto/schemas";

export type Region = { label: string; locale: string; currency: CurrencyCode };

/** Launch markets: Philippines, Southeast Asia, US / Canada, UK / Europe. */
export const REGIONS: readonly Region[] = [
  { label: "Philippines", locale: "en-PH", currency: "PHP" },
  { label: "Singapore", locale: "en-SG", currency: "SGD" },
  { label: "Malaysia", locale: "en-MY", currency: "MYR" },
  { label: "Indonesia", locale: "id-ID", currency: "IDR" },
  { label: "Thailand", locale: "th-TH", currency: "THB" },
  { label: "Vietnam", locale: "vi-VN", currency: "VND" },
  { label: "United States", locale: "en-US", currency: "USD" },
  { label: "Canada", locale: "en-CA", currency: "CAD" },
  { label: "United Kingdom", locale: "en-GB", currency: "GBP" },
  { label: "Ireland", locale: "en-IE", currency: "EUR" },
  { label: "Germany", locale: "de-DE", currency: "EUR" },
  { label: "France", locale: "fr-FR", currency: "EUR" },
  { label: "Spain", locale: "es-ES", currency: "EUR" },
  { label: "Italy", locale: "it-IT", currency: "EUR" },
  { label: "Netherlands", locale: "nl-NL", currency: "EUR" },
  { label: "Switzerland", locale: "de-CH", currency: "CHF" },
  { label: "Sweden", locale: "sv-SE", currency: "SEK" },
  { label: "Norway", locale: "nb-NO", currency: "NOK" },
  { label: "Denmark", locale: "da-DK", currency: "DKK" },
  { label: "Poland", locale: "pl-PL", currency: "PLN" },
  { label: "Czechia", locale: "cs-CZ", currency: "CZK" },
];

/** The region for a locale: exact match, else the first with the same country code. */
export function regionForLocale(locale: string): Region | undefined {
  const exact = REGIONS.find((r) => r.locale === locale);
  if (exact) return exact;
  const country = locale.split("-").find((part) => /^[A-Z]{2}$/.test(part));
  return country ? REGIONS.find((r) => r.locale.endsWith(`-${country}`)) : undefined;
}
