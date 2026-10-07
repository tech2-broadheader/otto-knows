import { describe, expect, it } from "vitest";
import { currencySymbol, formatMoneyInput, parseMoneyInput } from "./money";

describe("parseMoneyInput (any currency / locale, story 13.1)", () => {
  it("reads the locale's own separators and symbol", () => {
    expect(parseMoneyInput("₱1,234.50", "PHP", "en-PH")).toBe(123450);
    expect(parseMoneyInput("$1,234.5", "USD", "en-US")).toBe(123450);
    expect(parseMoneyInput("1.234,50 €", "EUR", "de-DE")).toBe(123450);
    expect(parseMoneyInput("1234,5", "EUR", "de-DE")).toBe(123450);
    expect(parseMoneyInput("£12", "GBP", "en-GB")).toBe(1200);
  });

  it("handles currencies without decimals", () => {
    expect(parseMoneyInput("25.000", "VND", "vi-VN")).toBe(25000);
    expect(parseMoneyInput("25.000,5", "VND", "vi-VN")).toBeNull();
  });

  it("rejects too many decimals, the other locale's format, junk and negatives", () => {
    expect(parseMoneyInput("12.345", "USD", "en-US")).toBeNull();
    expect(parseMoneyInput("1.234,50", "USD", "en-US")).toBeNull();
    expect(parseMoneyInput("abc", "USD", "en-US")).toBeNull();
    expect(parseMoneyInput("12abc", "USD", "en-US")).toBeNull();
    expect(parseMoneyInput("", "USD", "en-US")).toBeNull();
    expect(parseMoneyInput("-5", "USD", "en-US")).toBeNull();
  });

  it("accepts zero (callers decide whether zero is allowed)", () => {
    expect(parseMoneyInput("0", "USD", "en-US")).toBe(0);
  });
});

describe("currencySymbol", () => {
  it("returns the symbol the locale uses for the currency", () => {
    expect(currencySymbol("PHP", "en-PH")).toBe("₱");
    expect(currencySymbol("USD", "en-US")).toBe("$");
    expect(currencySymbol("EUR", "de-DE")).toBe("€");
  });
});

describe("formatMoneyInput (pre-filling an edit form)", () => {
  it("writes the amount the way the user would type it, and parses back to the same value", () => {
    expect(formatMoneyInput(123450, "EUR", "de-DE")).toBe("1234,50");
    expect(formatMoneyInput(123450, "USD", "en-US")).toBe("1234.50");
    expect(formatMoneyInput(25000, "VND", "vi-VN")).toBe("25000");
    expect(parseMoneyInput(formatMoneyInput(123450, "EUR", "de-DE"), "EUR", "de-DE")).toBe(123450);
  });
});
