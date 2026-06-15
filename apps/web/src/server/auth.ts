import { z } from "zod";
import { idSchema } from "@otto/schemas";
import { getAuthVerifier, type AuthVerifier } from "./supabase";
import { getEntitlementStore, type EntitlementStore } from "./entitlement";

/**
 * Auth + entitlement (SERVER-ONLY).
 *
 * Resolves the caller from a Supabase access token (Authorization: Bearer …),
 * then loads their entitlement (free / Pro / Lifetime) from the DB. Every Pro
 * route checks this server-side (ARCHITECTURE.md §8). Dependencies are injected
 * so routes get the real Supabase + DB implementations while tests pass fakes.
 */

export const entitlementSchema = z.enum(["free", "pro", "lifetime"]);
export type Entitlement = z.infer<typeof entitlementSchema>;

export type AuthContext = {
  userId: z.infer<typeof idSchema>;
  entitlement: Entitlement;
};

export type AuthResult =
  | { ok: true; context: AuthContext }
  | { ok: false; reason: "unauthenticated" | "forbidden" };

export type AuthDeps = {
  verifier: AuthVerifier | null;
  entitlements: EntitlementStore | null;
};

/** Production dependencies — null when the relevant service isn't configured. */
function defaultDeps(): AuthDeps {
  return { verifier: getAuthVerifier(), entitlements: getEntitlementStore() };
}

/** Extract the bearer token from the Authorization header, if present. */
function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() || null;
}

const DEV_USER_ID = "00000000-0000-4000-8000-0000000000de";

/**
 * Resolve the caller's auth context.
 *
 * 1. DEV-ONLY: `OTTO_DEV_AUTH=pro` (never in production) → a Pro dev user, so the
 *    brain can be exercised locally before login is wired end-to-end.
 * 2. Otherwise: verify the bearer token with Supabase and load the entitlement
 *    from the DB. No token / invalid token / Supabase unconfigured → unauthenticated.
 */
export async function getAuthContext(
  request: Request,
  deps: AuthDeps = defaultDeps(),
): Promise<AuthResult> {
  if (process.env.NODE_ENV !== "production" && process.env.OTTO_DEV_AUTH === "pro") {
    return { ok: true, context: { userId: DEV_USER_ID, entitlement: "pro" } };
  }

  const token = bearerToken(request);
  if (!token || !deps.verifier) return { ok: false, reason: "unauthenticated" };

  const userId = await deps.verifier.verify(token);
  if (!userId) return { ok: false, reason: "unauthenticated" };

  // Entitlement defaults to free when no DB/profile is present (free is local-first).
  const entitlement = deps.entitlements ? await deps.entitlements.load(userId) : "free";
  return { ok: true, context: { userId, entitlement } };
}

/** True when the entitlement grants Pro-tier cloud features. */
export function isProEntitled(entitlement: Entitlement): boolean {
  return entitlement === "pro" || entitlement === "lifetime";
}
