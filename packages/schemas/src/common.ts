// Shared primitives used across every domain schema.
// Keep these strict — they are the building blocks of the whole contract.
import { z } from "zod";

/** UUID v4 identifier. */
export const idSchema = z.string().uuid();

/** ISO-8601 timestamp with timezone offset, e.g. 2026-06-14T08:00:00+08:00. */
export const isoDateTimeSchema = z.string().datetime({ offset: true });

/** Calendar date with no time component, YYYY-MM-DD. */
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

/** Time of day in 24h HH:mm. The routine layer is built on these. */
export const timeOfDaySchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Expected HH:mm (24h)");

/** IANA timezone name, e.g. "Asia/Manila". */
export const timezoneSchema = z.string().min(1);

export const dayOfWeekSchema = z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]);
export type DayOfWeek = z.infer<typeof dayOfWeekSchema>;

/**
 * Recurrence rule shared by routine anchors, reminders, bills and meds.
 * `custom` requires an explicit `daysOfWeek` set; `monthly` may set `dayOfMonth`.
 */
export const recurrenceSchema = z
  .object({
    freq: z.enum(["once", "daily", "weekdays", "weekends", "weekly", "monthly", "custom"]),
    daysOfWeek: z.array(dayOfWeekSchema).nonempty().optional(),
    dayOfMonth: z.number().int().min(1).max(31).optional(),
  })
  .refine((r) => r.freq !== "custom" || (r.daysOfWeek?.length ?? 0) > 0, {
    message: "custom recurrence requires at least one day in daysOfWeek",
    path: ["daysOfWeek"],
  });
export type Recurrence = z.infer<typeof recurrenceSchema>;

/**
 * ISO 4217 currencies we support (ADR-007), with their minor-unit exponent —
 * how many decimal places one unit has (VND has none). Covers the launch
 * markets: PH, Southeast Asia, US/Canada, UK/Europe.
 */
const CURRENCY_MINOR_UNITS = {
  PHP: 2,
  SGD: 2,
  MYR: 2,
  IDR: 2,
  THB: 2,
  VND: 0,
  USD: 2,
  CAD: 2,
  GBP: 2,
  EUR: 2,
  CHF: 2,
  SEK: 2,
  NOK: 2,
  DKK: 2,
  PLN: 2,
  CZK: 2,
} as const;
export type CurrencyCode = keyof typeof CURRENCY_MINOR_UNITS;
export const SUPPORTED_CURRENCIES = Object.keys(CURRENCY_MINOR_UNITS) as [
  CurrencyCode,
  ...CurrencyCode[],
];

/** Decimal places of a currency's minor unit (2 for USD cents, 0 for VND). */
export function currencyMinorUnits(code: CurrencyCode): number {
  return CURRENCY_MINOR_UNITS[code];
}

/**
 * A supported currency. Defaults to PHP so money saved before multi-currency
 * (all PHP) parses unchanged; new writes pass the user's home currency.
 */
export const currencySchema = z.enum(SUPPORTED_CURRENCIES).default("PHP");

/**
 * The currency assumed when none is known — the pre-multi-currency default
 * (all early data is PHP). Display code should prefer the user's settings.
 */
export const DEFAULT_CURRENCY: CurrencyCode = "PHP";

/**
 * Money is stored in MINOR units of its currency as an integer to avoid float
 * drift: ₱100.50 → { amountMinor: 10050, currency: "PHP" }; ₫25,000 →
 * { amountMinor: 25000, currency: "VND" }.
 */
export const moneySchema = z.object({
  amountMinor: z.number().int(),
  currency: currencySchema,
});
export type Money = z.infer<typeof moneySchema>;

/** Timestamp fields every persisted entity carries. Spread into entity shapes. */
export const timestampFields = {
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
} as const;
