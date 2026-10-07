// App-wide constants for the free, local-first tier.

/**
 * Free tier runs fully local and anonymous (ARCHITECTURE §8). Repositories key
 * rows by userId, so we use one stable local id until cloud auth (Pro) lands.
 * It must be a v4 UUID to satisfy idSchema. Replaced by the Supabase user id on
 * upgrade.
 */
export const LOCAL_USER_ID = "00000000-0000-4000-8000-000000000001";

/**
 * The default "Cash" wallet every install has (story 11.2). Fixed so the SQL
 * migration and ensureDefaultAccount() agree without generating UUIDs in SQL.
 */
export const DEFAULT_CASH_ACCOUNT_ID = "00000000-0000-4000-8000-0000000000ca";

/** Consent policy version shown/recorded on the consent screen. */
export const CONSENT_POLICY_VERSION = "2026-06-14";
