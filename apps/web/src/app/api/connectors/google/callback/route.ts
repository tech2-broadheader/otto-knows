import { z } from "zod";
import { fail, ok, validateBody } from "@/lib/api";
import { getAuthContext } from "@/server/auth";
import { getConfig } from "@/lib/config";
import { exchangeCodeForTokens } from "@/server/google-oauth";
import { verifyOAuthState } from "@/server/oauth-state";
import { getTokenStore, toStoredToken } from "@/server/token-store";

/**
 * GET /api/connectors/google/callback — OAuth redirect target.
 *
 * Thin handler (CLAUDE.md §6 / CODING_CONVENTIONS §7): validate the query →
 * auth check → exchange the code for tokens → store them → return the envelope.
 * Google's `error` query param (e.g. user denied consent) is handled first.
 */

/** The query params Google appends to the redirect, validated at the boundary. */
const callbackQuerySchema = z
  .object({
    code: z.string().min(1).optional(),
    state: z.string().min(1).optional(),
    error: z.string().min(1).optional(),
  })
  .refine((q) => Boolean(q.code) || Boolean(q.error), {
    message: "Either `code` or `error` must be present.",
    path: ["code"],
  });

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = validateBody(callbackQuerySchema, {
    code: url.searchParams.get("code") ?? undefined,
    state: url.searchParams.get("state") ?? undefined,
    error: url.searchParams.get("error") ?? undefined,
  });
  if (!query.ok) {
    return query.response;
  }

  // Google reported a problem (e.g. access_denied) — surface it, do not proceed.
  if (query.data.error) {
    return fail("FORBIDDEN", "Google did not grant access to your calendar.");
  }

  const auth = await getAuthContext(request);
  if (!auth.ok) {
    return fail("UNAUTHORIZED", "Sign in to finish connecting Google Calendar.");
  }

  const store = await getTokenStore();
  if (!store) {
    return fail("INTERNAL", "Google Calendar connection isn't configured on this server.");
  }

  // CSRF: the state must be the one /start signed for THIS user, and fresh.
  const secret = getConfig().server.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!query.data.state || !verifyOAuthState(query.data.state, auth.context.userId, secret)) {
    return fail(
      "FORBIDDEN",
      "This Google connection link is invalid or expired. Please try again.",
    );
  }

  // `code` is guaranteed present here by the schema refinement above.
  const exchange = await exchangeCodeForTokens(query.data.code as string);
  if (!exchange.ok) {
    // Reason is generic and token-free; detail stays server-side.
    return fail("INTERNAL", "Could not complete the Google connection.");
  }

  await store.set(auth.context.userId, "google", toStoredToken(exchange.tokens));

  return ok({ connected: true, provider: "google" });
}
