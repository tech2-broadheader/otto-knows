import { describe, expect, it } from "vitest";
import { readDeviceLocale } from "./device-locale";

describe("readDeviceLocale", () => {
  it("returns the runtime's locale and timezone", () => {
    const { locale, timeZone } = readDeviceLocale();
    expect(locale).toMatch(/^[a-z]{2,3}/);
    expect(typeof timeZone).toBe("string");
  });

  it("never throws when Intl gives nothing useful", () => {
    const fake = () => ({ resolvedOptions: () => ({ locale: "", timeZone: undefined }) });
    expect(readDeviceLocale(fake as never)).toEqual({ locale: "en", timeZone: "UTC" });
  });
});
