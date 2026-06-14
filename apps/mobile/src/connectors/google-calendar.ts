// On-device Google Calendar connector (Story 3.1, free-tier LOCAL path / ADR-002).
//
// This is the only mobile module that performs the Google OAuth flow. It runs an
// authorization-code + PKCE flow with expo-auth-session + expo-web-browser,
// requesting ONLY the read-only Calendar scope. The OAuth token is stored via
// expo-secure-store (NEVER SQLite/plaintext). Fetched events are normalized by
// the shared pure `toCalendarEvents` (@otto/core) and persisted via the
// consent-gated calendar repository — and that persistence is GATED on a granted
// calendar consent record (requireConsent) first.
//
// All of this is explicit user action (CLAUDE.md §1.11 propose-and-confirm): the
// caller invokes connect()/syncToday() from a Settings/Consent action.
//
// NO-OP GRACEFULLY when EXPO_PUBLIC_GOOGLE_CLIENT_ID is absent (real Google
// credentials aren't configured in this environment) — callers get a typed
// "not-configured" result and the UI shows a clear, non-crashing message.
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import * as SecureStore from "expo-secure-store";
import { toCalendarEvents } from "@otto/core";
import { googleEventsListSchema } from "@otto/core";
import type { CalendarEvent, Consent } from "@otto/schemas";
import { makeCalendarEventRepository, type RepositoryDeps } from "../data";
import { ConsentRequiredError, requireConsent } from "../security/consent";
import { newUuid } from "../lib/id";
import { localUtcOffset, todayDate } from "../lib/datetime";
import { LOCAL_USER_ID } from "../lib/constants";
import {
  GOOGLE_CALENDAR_READONLY_SCOPE,
  GOOGLE_DISCOVERY,
  buildEventsListUrl,
  isTokenFresh,
  type StoredGoogleToken,
} from "./google-calendar-core";

// Required for the auth-session redirect to settle the in-app browser.
WebBrowser.maybeCompleteAuthSession();

/** SecureStore item key for the Google OAuth token bundle. */
const TOKEN_KEY = "otto.google.calendar.token.v1";

/** Client id is read from the public env var; absent → connector no-ops. */
function getClientId(): string | undefined {
  const id = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
  return id && id.trim().length > 0 ? id.trim() : undefined;
}

/** True when the connector has the configuration it needs to run the OAuth flow. */
export function isGoogleCalendarConfigured(): boolean {
  return getClientId() !== undefined;
}

/** Outcome of a connect attempt — friendly for the UI to branch on. */
export type ConnectResult =
  | { ok: true }
  | { ok: false; reason: "not-configured" | "cancelled" | "error" };

/** Outcome of a day-sync attempt. */
export type SyncResult =
  | { ok: true; count: number }
  | { ok: false; reason: "not-configured" | "not-connected" | "consent-required" | "error" };

async function readStoredToken(): Promise<StoredGoogleToken | undefined> {
  const raw = await SecureStore.getItemAsync(TOKEN_KEY);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as StoredGoogleToken;
  } catch {
    return undefined;
  }
}

async function writeStoredToken(token: StoredGoogleToken): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, JSON.stringify(token));
}

/** Forget the stored Google token (used when the user disconnects). */
export async function disconnectGoogleCalendar(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

/** True if we currently hold any stored Google token (fresh or refreshable). */
export async function isGoogleCalendarConnected(): Promise<boolean> {
  return (await readStoredToken()) !== undefined;
}

const REDIRECT_URI = AuthSession.makeRedirectUri({ scheme: "otto" });

/**
 * Run the authorization-code + PKCE OAuth flow and persist the resulting token.
 * Explicit user action. No-ops with a typed result when the client id is absent.
 */
export async function connectGoogleCalendar(): Promise<ConnectResult> {
  const clientId = getClientId();
  if (!clientId) return { ok: false, reason: "not-configured" };

  try {
    const request = new AuthSession.AuthRequest({
      clientId,
      scopes: [GOOGLE_CALENDAR_READONLY_SCOPE],
      redirectUri: REDIRECT_URI,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
      // Ask for a refresh token so we can renew the access token offline.
      extraParams: { access_type: "offline" },
    });

    const result = await request.promptAsync(GOOGLE_DISCOVERY);
    if (result.type === "cancel" || result.type === "dismiss") {
      return { ok: false, reason: "cancelled" };
    }
    if (result.type !== "success" || !result.params.code) {
      return { ok: false, reason: "error" };
    }

    const tokenResponse = await AuthSession.exchangeCodeAsync(
      {
        clientId,
        code: result.params.code,
        redirectUri: REDIRECT_URI,
        extraParams: request.codeVerifier ? { code_verifier: request.codeVerifier } : {},
      },
      { tokenEndpoint: GOOGLE_DISCOVERY.tokenEndpoint },
    );

    await writeStoredToken({
      accessToken: tokenResponse.accessToken,
      refreshToken: tokenResponse.refreshToken,
      issuedAtMs: (tokenResponse.issuedAt ?? Math.floor(Date.now() / 1000)) * 1000,
      expiresInSec: tokenResponse.expiresIn,
    });
    return { ok: true };
  } catch {
    return { ok: false, reason: "error" };
  }
}

/** Refresh the access token using the stored refresh token; returns the fresh token. */
async function refreshToken(
  clientId: string,
  stored: StoredGoogleToken,
): Promise<StoredGoogleToken | undefined> {
  if (!stored.refreshToken) return undefined;
  try {
    const refreshed = await AuthSession.refreshAsync(
      { clientId, refreshToken: stored.refreshToken, scopes: [GOOGLE_CALENDAR_READONLY_SCOPE] },
      { tokenEndpoint: GOOGLE_DISCOVERY.tokenEndpoint },
    );
    const next: StoredGoogleToken = {
      accessToken: refreshed.accessToken,
      // Google may omit a new refresh token — keep the existing one.
      refreshToken: refreshed.refreshToken ?? stored.refreshToken,
      issuedAtMs: (refreshed.issuedAt ?? Math.floor(Date.now() / 1000)) * 1000,
      expiresInSec: refreshed.expiresIn,
    };
    await writeStoredToken(next);
    return next;
  } catch {
    return undefined;
  }
}

/** Ensure we have a usable (fresh) access token, refreshing if needed. */
async function ensureAccessToken(clientId: string): Promise<string | undefined> {
  const stored = await readStoredToken();
  if (!stored) return undefined;
  if (isTokenFresh(stored)) return stored.accessToken;
  const refreshed = await refreshToken(clientId, stored);
  return refreshed?.accessToken;
}

/**
 * Fetch today's Google Calendar events and persist them locally.
 *
 * Order (security): (1) require a granted calendar consent record — refuse
 * otherwise; (2) ensure a fresh access token; (3) fetch events.list for the day;
 * (4) normalize raw items through the shared pure `toCalendarEvents`; (5) persist
 * via the consent-gated calendar repository. Once persisted, Today displays them
 * via the context graph.
 */
export async function syncTodayGoogleCalendar(
  deps: RepositoryDeps,
  loadConsents: (userId: string) => Promise<readonly Consent[]>,
): Promise<SyncResult> {
  const clientId = getClientId();
  if (!clientId) return { ok: false, reason: "not-configured" };

  try {
    // (1) Consent gate FIRST — never read a calendar without granted consent.
    const consents = await loadConsents(LOCAL_USER_ID);
    requireConsent(consents, "calendar");

    // (2) Fresh token.
    const accessToken = await ensureAccessToken(clientId);
    if (!accessToken) return { ok: false, reason: "not-connected" };

    // (3) Fetch the day's events.
    const date = todayDate();
    const url = buildEventsListUrl(date, localUtcOffset());
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) return { ok: false, reason: "error" };
    const payload: unknown = await response.json();

    // (4) Validate envelope + normalize via the shared pure mapper.
    const parsed = googleEventsListSchema.safeParse(payload);
    if (!parsed.success) return { ok: false, reason: "error" };
    const events: CalendarEvent[] = toCalendarEvents(parsed.data.items, LOCAL_USER_ID, () =>
      newUuid(),
    );

    // (5) Persist via the consent-gated repository.
    const repo = makeCalendarEventRepository({ loadConsents });
    for (const event of events) {
      await repo.create(event);
    }
    return { ok: true, count: events.length };
  } catch (caught) {
    // requireConsent throws ConsentRequiredError — surface that distinctly so the
    // UI can prompt the user to grant calendar consent; anything else is "error".
    if (caught instanceof ConsentRequiredError) return { ok: false, reason: "consent-required" };
    return { ok: false, reason: "error" };
  }
}
