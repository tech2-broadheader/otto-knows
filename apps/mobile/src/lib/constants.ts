// App-wide constants for the free, local-first tier.

/**
 * Free tier runs fully local and anonymous (ARCHITECTURE §8). Repositories key
 * rows by userId, so we use one stable local id until cloud auth (Pro) lands.
 * It must be a v4 UUID to satisfy idSchema. Replaced by the Supabase user id on
 * upgrade.
 */
export const LOCAL_USER_ID = "00000000-0000-4000-8000-000000000001";

/** Consent policy version shown/recorded on the consent screen. */
export const CONSENT_POLICY_VERSION = "2026-06-14";

/**
 * Local Pro-entitlement flag. There is no real billing/auth yet, so the app is
 * free tier by default. Pro UI (proactive LLM briefing, unlimited quick-add) is
 * gated on this; the proxy ALSO enforces Pro server-side and will 401/403, which
 * the UI handles gracefully regardless of this flag.
 *
 * TODO(E9 monetization): replace with real entitlement resolved from billing
 * (receipt verified server-side) instead of this local constant.
 */
export const IS_PRO = false;
