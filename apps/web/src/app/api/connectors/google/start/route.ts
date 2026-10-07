import { fail, ok } from "@/lib/api";
import { getAuthContext } from "@/server/auth";
import { getConfig } from "@/lib/config";
import { buildConsentUrl } from "@/server/google-oauth";
import { createOAuthState } from "@/server/oauth-state";

/**
 * GET /api/connectors/google/start — begin the Google OAuth consent flow.
 *
 * Thin handler (CLAUDE.md §6 / CODING_CONVENTIONS §7): auth check → delegate to
 * the OAuth module to build the consent URL → return it in the envelope.
 * Requires auth; 401 when unauthenticated (stub fails closed).
 *
 * Returns the URL in the `{ data }` envelope rather than issuing a 302 so the
 * caller (web companion / mobile) controls how the consent screen is opened.
 */
export async function GET(request: Request) {
  const auth = await getAuthContext(request);
  if (!auth.ok) {
    return fail("UNAUTHORIZED", "Sign in to connect Google Calendar.");
  }

  // Signed CSRF token bound to this user (10-minute lifetime), round-tripped
  // through Google and verified by /callback.
  const state = createOAuthState(
    auth.context.userId,
    getConfig().server.GOOGLE_OAUTH_CLIENT_SECRET,
  );
  const consentUrl = buildConsentUrl(state);

  return ok({ consentUrl, state });
}
