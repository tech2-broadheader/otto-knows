import { describe, expect, it } from "vitest";
import { formatPeso, parsePesoToCentavos } from "./money";

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
