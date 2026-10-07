import { describe, expect, it } from "vitest";
import { formatMoney, formatShortDate, suggestSettings } from "./format";

// Intl output uses non-breaking spaces in some locales; normalize for readable asserts.
const plain = (s: string): string => s.replace(/[\u00a0\u202f]/g, " ");

describe("formatMoney", () => {
  it("formats in the user's locale and currency", () => {
    expect(plain(formatMoney({ amountMinor: 123450, currency: "PHP" }, "en-PH"))).toBe("₱1,234.50");
    expect(plain(formatMoney({ amountMinor: 123450, currency: "USD" }, "en-US"))).toBe("$1,234.50");
    expect(plain(formatMoney({ amountMinor: 123450, currency: "EUR" }, "de-DE"))).toBe(
      "1.234,50 €",
    );
    expect(plain(formatMoney({ amountMinor: 123450, currency: "GBP" }, "en-GB"))).toBe("£1,234.50");
  });

  it("respects currencies without minor units", () => {
    expect(plain(formatMoney({ amountMinor: 25000, currency: "VND" }, "vi-VN"))).toBe("25.000 ₫");
  });

  it("formats negative amounts", () => {
    expect(plain(formatMoney({ amountMinor: -40000, currency: "USD" }, "en-US"))).toBe("-$400.00");
  });
});

describe("formatShortDate", () => {
  it("shows month and day the local way, independent of the device timezone", () => {
    expect(plain(formatShortDate("2026-10-15", "en-US"))).toBe("Oct 15");
    expect(plain(formatShortDate("2026-10-15", "en-GB"))).toBe("15 Oct");
  });
});

describe("suggestSettings", () => {
  it("derives currency from the locale's region", () => {
    expect(suggestSettings("en-US", "America/Chicago")).toEqual({
      currency: "USD",
      locale: "en-US",
      timezone: "America/Chicago",
    });
    expect(suggestSettings("fil-PH", "Asia/Manila").currency).toBe("PHP");
    expect(suggestSettings("de-DE", "Europe/Berlin").currency).toBe("EUR");
    expect(suggestSettings("en-SG", "Asia/Singapore").currency).toBe("SGD");
  });

  it("falls back to USD for an unsupported region and keeps a valid locale", () => {
    expect(suggestSettings("ja-JP", "Asia/Tokyo").currency).toBe("USD");
    expect(suggestSettings("en", "UTC")).toEqual({
      currency: "USD",
      locale: "en",
      timezone: "UTC",
    });
  });

  it("cleans up odd device values", () => {
    expect(suggestSettings("en_US", "")).toEqual({
      currency: "USD",
      locale: "en-US",
      timezone: "UTC",
    });
  });
});
