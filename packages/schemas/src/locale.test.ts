import { describe, expect, it } from "vitest";
import {
  SUPPORTED_CURRENCIES,
  currencyMinorUnits,
  currencySchema,
  moneySchema,
  userSettingsSchema,
} from "./index";

describe("supported currencies", () => {
  it("covers the launch markets", () => {
    for (const code of ["PHP", "SGD", "MYR", "IDR", "THB", "VND", "USD", "CAD", "GBP", "EUR"]) {
      expect(currencySchema.safeParse(code).success).toBe(true);
    }
    expect(currencySchema.safeParse("XYZ").success).toBe(false);
  });

  it("knows each currency's decimal places", () => {
    expect(currencyMinorUnits("USD")).toBe(2);
    expect(currencyMinorUnits("VND")).toBe(0);
    expect(SUPPORTED_CURRENCIES.every((c) => [0, 2].includes(currencyMinorUnits(c)))).toBe(true);
  });

  it("keeps PHP as the default so rows saved before multi-currency still parse", () => {
    expect(moneySchema.parse({ amountMinor: 100 }).currency).toBe("PHP");
  });
});

describe("userSettingsSchema", () => {
  const ok = {
    userId: "11111111-1111-4111-8111-111111111111",
    currency: "USD",
    locale: "en-US",
    timezone: "America/New_York",
  };

  it("accepts a valid currency, BCP 47 locale and IANA timezone", () => {
    expect(userSettingsSchema.safeParse(ok).success).toBe(true);
    expect(
      userSettingsSchema.safeParse({
        ...ok,
        locale: "de-DE",
        currency: "EUR",
        timezone: "Europe/Berlin",
      }).success,
    ).toBe(true);
  });

  it("rejects malformed locales and timezones", () => {
    expect(userSettingsSchema.safeParse({ ...ok, locale: "english" }).success).toBe(false);
    expect(userSettingsSchema.safeParse({ ...ok, timezone: "" }).success).toBe(false);
  });
});
