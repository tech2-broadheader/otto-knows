// Regions a user can pick in onboarding and Settings (story 13.1/13.4). A region sets the
// locale used for number and date formatting and suggests the home currency.
// The app's copy stays English at launch (ADR-007). PURE — unit-tested.
import type { CurrencyCode } from "@otto/schemas";
import { t } from "../i18n";

export type Region = { label: string; locale: string; currency: CurrencyCode };

/** Launch markets: Philippines, Southeast Asia, US / Canada, UK / Europe. */
export const REGIONS: readonly Region[] = [
  { label: t("onboarding.regions.PH"), locale: "en-PH", currency: "PHP" },
  { label: t("onboarding.regions.SG"), locale: "en-SG", currency: "SGD" },
  { label: t("onboarding.regions.MY"), locale: "en-MY", currency: "MYR" },
  { label: t("onboarding.regions.ID"), locale: "id-ID", currency: "IDR" },
  { label: t("onboarding.regions.TH"), locale: "th-TH", currency: "THB" },
  { label: t("onboarding.regions.VN"), locale: "vi-VN", currency: "VND" },
  { label: t("onboarding.regions.US"), locale: "en-US", currency: "USD" },
  { label: t("onboarding.regions.CA"), locale: "en-CA", currency: "CAD" },
  { label: t("onboarding.regions.GB"), locale: "en-GB", currency: "GBP" },
  { label: t("onboarding.regions.IE"), locale: "en-IE", currency: "EUR" },
  { label: t("onboarding.regions.DE"), locale: "de-DE", currency: "EUR" },
  { label: t("onboarding.regions.FR"), locale: "fr-FR", currency: "EUR" },
  { label: t("onboarding.regions.ES"), locale: "es-ES", currency: "EUR" },
  { label: t("onboarding.regions.IT"), locale: "it-IT", currency: "EUR" },
  { label: t("onboarding.regions.NL"), locale: "nl-NL", currency: "EUR" },
  { label: t("onboarding.regions.CH"), locale: "de-CH", currency: "CHF" },
  { label: t("onboarding.regions.SE"), locale: "sv-SE", currency: "SEK" },
  { label: t("onboarding.regions.NO"), locale: "nb-NO", currency: "NOK" },
  { label: t("onboarding.regions.DK"), locale: "da-DK", currency: "DKK" },
  { label: t("onboarding.regions.PL"), locale: "pl-PL", currency: "PLN" },
  { label: t("onboarding.regions.CZ"), locale: "cs-CZ", currency: "CZK" },
];

/** The region for a locale: exact match, else the first with the same country code. */
export function regionForLocale(locale: string): Region | undefined {
  const exact = REGIONS.find((r) => r.locale === locale);
  if (exact) return exact;
  const country = locale.split("-").find((part) => /^[A-Z]{2}$/.test(part));
  return country ? REGIONS.find((r) => r.locale.endsWith(`-${country}`)) : undefined;
}

export type RegionGroup = { title: string; regions: readonly Region[] };

// Grouped by locale (stable), never by the translated label.
const PHILIPPINES = ["en-PH"];
const SOUTHEAST_ASIA = ["en-SG", "en-MY", "id-ID", "th-TH", "vi-VN"];
const NORTH_AMERICA = ["en-US", "en-CA"];
const inGroup = (locales: readonly string[]) => (r: Region) => locales.includes(r.locale);

/** REGIONS grouped by launch market for the picker — the Philippines first. */
export const REGION_GROUPS: readonly RegionGroup[] = [
  {
    title: t("onboarding.regionGroups.philippines"),
    regions: REGIONS.filter(inGroup(PHILIPPINES)),
  },
  {
    title: t("onboarding.regionGroups.southeastAsia"),
    regions: REGIONS.filter(inGroup(SOUTHEAST_ASIA)),
  },
  {
    title: t("onboarding.regionGroups.northAmerica"),
    regions: REGIONS.filter(inGroup(NORTH_AMERICA)),
  },
  {
    title: t("onboarding.regionGroups.europe"),
    regions: REGIONS.filter(
      (r) => !inGroup([...PHILIPPINES, ...SOUTHEAST_ASIA, ...NORTH_AMERICA])(r),
    ),
  },
];

/** Pre-selected region in onboarding: the phone's, else the Philippines (home market). */
export function startingRegion(locale: string): Region {
  // reason: REGIONS is a non-empty literal whose first entry is the Philippines
  return regionForLocale(locale) ?? REGIONS[0]!;
}
