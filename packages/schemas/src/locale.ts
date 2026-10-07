// The user's home currency, locale and timezone (story 13.1, ADR-007).
import { z } from "zod";
import { currencySchema, idSchema } from "./common";

/** BCP 47 language tag such as "en", "en-US", "de-DE", "zh-Hant-TW". */
export const localeSchema = z
  .string()
  .regex(/^[a-z]{2,3}(-[A-Z][a-z]{3})?(-([A-Z]{2}|\d{3}))?$/, "Expected a BCP 47 locale like en-US");

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
