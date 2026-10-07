import { describe, expect, it } from "vitest";
import { localeSchema, SUPPORTED_CURRENCIES } from "@otto/schemas";
import { REGIONS, regionForLocale } from "./regions";

describe("REGIONS", () => {
  it("covers every launch market with a valid locale and a supported currency", () => {
    for (const region of REGIONS) {
      expect(localeSchema.safeParse(region.locale).success).toBe(true);
      expect(SUPPORTED_CURRENCIES).toContain(region.currency);
      expect(() => new Intl.NumberFormat(region.locale)).not.toThrow();
    }
    const names = REGIONS.map((r) => r.label);
    for (const market of [
      "Philippines",
      "Singapore",
      "United States",
      "Canada",
      "United Kingdom",
      "Germany",
    ]) {
      expect(names).toContain(market);
    }
  });

  it("has no duplicate locales", () => {
    const locales = REGIONS.map((r) => r.locale);
    expect(new Set(locales).size).toBe(locales.length);
  });
});

describe("regionForLocale", () => {
  it("finds the exact region, else one with the same country", () => {
    expect(regionForLocale("en-GB")?.label).toBe("United Kingdom");
    expect(regionForLocale("fil-PH")?.label).toBe("Philippines");
    expect(regionForLocale("ja-JP")).toBeUndefined();
  });
});
