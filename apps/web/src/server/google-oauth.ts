import { z } from "zod";
import { getConfig } from "@/lib/config";

/**
 * Google OAuth (SERVER-ONLY) — Story 3.1 connector backend.
 *
 * Builds the Google consent URL and exchanges an authorization code for tokens
 * against Google's REST endpoints using the plain `fetch` API (no `googleapis`
 * dependency). The client SECRET is read from server-only config and never
 * leaves the server; tokens are never logged (CLAUDE.md §6, §11, §1.12).
 */

/** Read-only scopes — Otto only READS calendar/tasks for the briefing (spec §6.1). */
export const GOOGLE_CALENDAR_READONLY_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";
export const GOOGLE_TASKS_READONLY_SCOPE = "https://www.googleapis.com/auth/tasks.readonly";

/** Space-delimited scope string, the form Google's auth endpoint expects. */
export const GOOGLE_OAUTH_SCOPES = [
  GOOGLE_CALENDAR_READONLY_SCOPE,
  GOOGLE_TASKS_READONLY_SCOPE,
].join(" ");

const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

/** Path the consent screen redirects back to (the callback route). */
const REDIRECT_PATH = "/api/connectors/google/callback";

/** The minimal pieces of OAuth config the connector needs. */
type GoogleOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

/**
 * Resolve OAuth config from the typed env config. The redirect URI is derived
 * from `NEXT_PUBLIC_APP_URL` so it matches whatever environment we run in.
 */
function getOAuthConfig(): GoogleOAuthConfig {
  const config = getConfig();
  return {
    clientId: config.server.GOOGLE_OAUTH_CLIENT_ID,
    clientSecret: config.server.GOOGLE_OAUTH_CLIENT_SECRET,
    redirectUri: `${config.public.NEXT_PUBLIC_APP_URL}${REDIRECT_PATH}`,
  };
}

/**
 * Build the Google OAuth consent URL the user is sent to in order to grant
 * read-only calendar + tasks access.
 *
 * `access_type=offline` + `prompt=consent` requests a refresh token so Otto can
 * read on the user's behalf for the daily briefing without re-prompting.
 *
 * @param state - opaque CSRF/correlation token round-tripped back to the callback.
 * @param overrides - inject config in tests so the builder stays pure/unit-testable.
 */
export function buildConsentUrl(state: string, overrides?: Partial<GoogleOAuthConfig>): string {
  const { clientId, redirectUri } = getOAuthConfigSafe(overrides);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_OAUTH_SCOPES,
    access_type: "offline",
    include_granted_scopes: "true",
    prompt: "consent",
    state,
  });
  return `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`;
}

/**
 * Resolve config, tolerating overrides so the consent-URL builder can run in a
 * unit test without a fully-populated `process.env`. If `overrides` already
 * supplies clientId + redirectUri we never touch `getConfig()`.
 */
function getOAuthConfigSafe(overrides?: Partial<GoogleOAuthConfig>): GoogleOAuthConfig {
  if (overrides?.clientId && overrides?.redirectUri) {
    return {
      clientId: overrides.clientId,
      clientSecret: overrides.clientSecret ?? "",
      redirectUri: overrides.redirectUri,
    };
  }
  return getOAuthConfig();
}

/**
 * Google's token-endpoint response. Validated at the boundary — we never trust
 * Google's JSON shape without parsing (CLAUDE.md §6, CODING_CONVENTIONS §6).
 * `refresh_token` is optional because Google omits it when one was already issued.
 */
export const googleTokenResponseSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().int().positive(),
  token_type: z.string().min(1),
  scope: z.string().min(1),
  refresh_token: z.string().min(1).optional(),
});
export type GoogleTokenResponse = z.infer<typeof googleTokenResponseSchema>;

/** Outcome of a code-for-token exchange — typed success or a typed failure. */
export type ExchangeResult =
  | { ok: true; tokens: GoogleTokenResponse }
  | { ok: false; reason: string };

/**
 * Exchange an authorization `code` for tokens by POSTing to Google's token
 * endpoint with the configured client id/secret + redirect URI.
 *
 * Keeps the client secret server-side, validates the response with Zod, and
 * never logs token material. Returns a typed result rather than throwing so the
 * route can map it onto the `{ error }` envelope.
 */
export async function exchangeCodeForTokens(code: string): Promise<ExchangeResult> {
  const { clientId, clientSecret, redirectUri } = getOAuthConfig();

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  let response: Response;
  try {
    response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
  } catch {
    // Network/transport failure — surface a generic reason, never the request body.
    return { ok: false, reason: "Could not reach Google's token endpoint." };
  }

  if (!response.ok) {
    // Google returns { error, error_description } on failure. Do not echo it to
    // the client verbatim; keep the reason generic (no secret/token leakage).
    return { ok: false, reason: `Token exchange failed (status ${response.status}).` };
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    return { ok: false, reason: "Google returned a malformed token response." };
  }

  const parsed = googleTokenResponseSchema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, reason: "Google's token response failed validation." };
  }

  return { ok: true, tokens: parsed.data };
}
