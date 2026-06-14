// Peso formatting / parsing at the UI edge.
//
// Money in the @otto contracts is INTEGER CENTAVOS (minor units) to avoid float
// drift (see moneySchema). These helpers convert at the UI boundary ONLY:
// centavos -> "₱1,234.50" for display, and a user-typed peso string -> centavos
// for persistence. Pure; no native imports — unit-tested in Node.

/** Format integer centavos as a Philippine-peso string, e.g. 123450 -> "₱1,234.50". */
export function formatPeso(amountMinor: number): string {
  const pesos = amountMinor / 100;
  const formatted = pesos.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `₱${formatted}`;
}

/**
 * Parse a user-typed peso string into integer centavos. Accepts an optional
 * leading "₱", thousands separators, and up to two decimal places. Returns
 * `null` when the input is not a valid, non-negative amount — the caller surfaces
 * a friendly validation message (no silent coercion).
 */
export function parsePesoToCentavos(input: string): number | null {
  const cleaned = input.trim().replace(/^₱/, "").replace(/,/g, "");
  if (cleaned === "") return null;
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const pesos = Number.parseFloat(cleaned);
  if (!Number.isFinite(pesos) || pesos < 0) return null;
  // Round to guard against binary-float artefacts (e.g. 0.1 * 100).
  return Math.round(pesos * 100);
}
