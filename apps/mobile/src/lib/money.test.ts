import { describe, expect, it } from "vitest";
import { formatPeso, parseMoneyInput, parsePesoToCentavos } from "./money";

describe("formatPeso", () => {
  it("formats centavos with thousands separators and two decimals", () => {
    expect(formatPeso(123450)).toBe("₱1,234.50");
  });
  it("formats zero", () => {
    expect(formatPeso(0)).toBe("₱0.00");
  });
  it("formats sub-peso amounts", () => {
    expect(formatPeso(5)).toBe("₱0.05");
  });
});

describe("parsePesoToCentavos", () => {
  it("parses a plain amount to centavos", () => {
    expect(parsePesoToCentavos("1234.50")).toBe(123450);
  });
  it("accepts a leading peso sign and thousands separators", () => {
    expect(parsePesoToCentavos("₱1,234.50")).toBe(123450);
  });
  it("rounds whole pesos to centavos", () => {
    expect(parsePesoToCentavos("100")).toBe(10000);
  });
  it("guards against float drift", () => {
    expect(parsePesoToCentavos("0.10")).toBe(10);
  });
  it("rejects empty input", () => {
    expect(parsePesoToCentavos("   ")).toBeNull();
  });
  it("rejects non-numeric input", () => {
    expect(parsePesoToCentavos("abc")).toBeNull();
  });
  it("rejects more than two decimal places", () => {
    expect(parsePesoToCentavos("1.234")).toBeNull();
  });
  it("rejects negatives", () => {
    expect(parsePesoToCentavos("-5")).toBeNull();
  });
});

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
