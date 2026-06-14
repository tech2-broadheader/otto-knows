import { randomUUID } from "node:crypto";
import { fail, ok } from "@/lib/api";
import { getAuthContext } from "@/server/auth";
import { buildConsentUrl } from "@/server/google-oauth";

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

  // Opaque CSRF/correlation token round-tripped through Google back to /callback.
  // TODO(oauth-state): persist + verify this on callback (e.g. signed cookie).
  const state = randomUUID();
  const consentUrl = buildConsentUrl(state);

  return ok({ consentUrl, state });
}
