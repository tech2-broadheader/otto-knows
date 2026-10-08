// The user's home currency, locale and timezone (story 13.1, ADR-007).
import { z } from "zod";
import { SUPPORTED_CURRENCIES, currencySchema, idSchema } from "./common";

/** BCP 47 language tag such as "en", "en-US", "de-DE", "zh-Hant-TW". */
export const localeSchema = z
  .string()
  .regex(
    /^[a-z]{2,3}(-[A-Z][a-z]{3})?(-([A-Z]{2}|\d{3}))?$/,
    "Expected a BCP 47 locale like en-US",
  );

/** IANA timezone such as "Asia/Manila", "America/New_York" or "UTC". */
export const ianaTimezoneSchema = z
  .string()
  .regex(/^[A-Za-z_]+(\/[A-Za-z0-9_+-]+)*$/, "Expected an IANA timezone like Asia/Manila");

/** One row per user, stored on device. All money uses `currency` (no conversion). */
export const userSettingsSchema = z.object({
  userId: idSchema,
  currency: currencySchema,
  locale: localeSchema,
  timezone: ianaTimezoneSchema,
});
export type UserSettings = z.infer<typeof userSettingsSchema>;

/**
 * What the AI needs to read and write times and money the user's way (story
 * 13.2): sent by the app with every AI request. The currency carries no default,
 * so an AI request never silently falls back to pesos.
 */
export const aiUserContextSchema = z.object({
  timezone: ianaTimezoneSchema,
  currency: z.enum(SUPPORTED_CURRENCIES),
  locale: localeSchema,
});
export type AiUserContext = z.infer<typeof aiUserContextSchema>;
