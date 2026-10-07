import { describe, expect, it } from "vitest";
import { localeSchema, SUPPORTED_CURRENCIES } from "@otto/schemas";
import { REGION_GROUPS, REGIONS, regionForLocale, startingRegion } from "./regions";

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

describe("REGION_GROUPS", () => {
  it("lists the Philippines first, then every other region exactly once by market", () => {
    expect(REGION_GROUPS.map((g) => g.title)).toEqual([
      "Philippines",
      "Southeast Asia",
      "US & Canada",
      "UK & Europe",
    ]);
    expect(REGION_GROUPS[0]?.regions.map((r) => r.label)).toEqual(["Philippines"]);
    const grouped = REGION_GROUPS.flatMap((g) => g.regions.map((r) => r.label));
    expect([...grouped].sort()).toEqual(REGIONS.map((r) => r.label).sort());
  });
});

describe("startingRegion", () => {
  it("uses the phone's region when Otto supports it", () => {
    expect(startingRegion("en-GB").label).toBe("United Kingdom");
  });

  it("starts with the Philippines when the phone's region isn't supported", () => {
    expect(startingRegion("ja-JP").label).toBe("Philippines");
  });
});
