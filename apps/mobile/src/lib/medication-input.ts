// Pure parsing/validation helpers for the medication entry form. Kept native-free
// so they can be unit-tested in Node (no expo imports).
import type { Recurrence } from "@otto/schemas";

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Recurrence frequencies the meds form offers (no `custom` — needs day picker). */
export const MED_RECURRENCE_FREQS = ["daily", "weekdays", "weekends", "weekly", "monthly"] as const;
export type MedRecurrenceFreq = (typeof MED_RECURRENCE_FREQS)[number];

/**
 * Parse a comma/space/newline-separated list of HH:mm times into a de-duplicated,
 * sorted list. Returns null if empty or any token is not a valid 24h HH:mm.
 */
export function parseTimesList(raw: string): string[] | null {
  const tokens = raw
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
  if (tokens.length === 0) return null;
  for (const token of tokens) {
    if (!TIME_PATTERN.test(token)) return null;
  }
  const unique = Array.from(new Set(tokens));
  unique.sort((a, b) => a.localeCompare(b));
  return unique;
}

/** Build a Recurrence object from one of the form's supported frequencies. */
export function recurrenceFromFreq(freq: MedRecurrenceFreq): Recurrence {
  return { freq };
}
