// PURE helpers for the on-device Google Calendar connector (Story 3.1). Kept
// native-free (no expo / fetch imports) so they unit-test in Node. The native
// OAuth + fetch + persistence lives in google-calendar.ts and imports these.

/** Read-only Calendar scope — the only access this free-tier path requests. */
export const GOOGLE_CALENDAR_READONLY_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";

/** Google OAuth 2.0 / OIDC discovery endpoints used for the auth-code + PKCE flow. */
export const GOOGLE_DISCOVERY = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
  revocationEndpoint: "https://oauth2.googleapis.com/revoke",
} as const;

/**
 * Stored OAuth token shape persisted in secure storage. `issuedAtMs`/`expiresInSec`
 * let us decide locally whether the access token is still usable.
 */
export type StoredGoogleToken = {
  accessToken: string;
  refreshToken?: string;
  /** Epoch millis when the token was issued. */
  issuedAtMs: number;
  /** Lifetime in seconds (Google returns `expires_in`). */
  expiresInSec?: number;
};

/** Seconds of head-room before true expiry — treat as expired a bit early. */
const EXPIRY_SKEW_SEC = 60;

/**
 * PURE. True if the stored access token is still usable at `nowMs` (with skew).
 * A token with no `expiresInSec` is treated as already expired (force refresh).
 */
export function isTokenFresh(token: StoredGoogleToken, nowMs: number = Date.now()): boolean {
  if (!token.accessToken) return false;
  if (token.expiresInSec === undefined) return false;
  const expiresAtMs = token.issuedAtMs + (token.expiresInSec - EXPIRY_SKEW_SEC) * 1000;
  return nowMs < expiresAtMs;
}

/** PURE. Build the Google Calendar `events.list` URL for a single calendar date. */
export function buildEventsListUrl(
  date: string,
  utcOffset: string,
  calendarId: string = "primary",
): string {
  // Day window in the user's offset: [date T00:00, nextDay T00:00).
  const timeMin = `${date}T00:00:00${utcOffset}`;
  const next = nextDate(date);
  const timeMax = `${next}T00:00:00${utcOffset}`;
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "100",
  });
  return `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
    calendarId,
  )}/events?${params.toString()}`;
}

/** PURE. The calendar date after `date` (YYYY-MM-DD), UTC-safe. */
export function nextDate(date: string): string {
  const [y, m, d] = date.split("-").map((n) => Number.parseInt(n, 10));
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + 1);
  const yy = dt.getUTCFullYear();
  const mm = `${dt.getUTCMonth() + 1}`.padStart(2, "0");
  const dd = `${dt.getUTCDate()}`.padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}
