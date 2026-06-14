import { z } from "zod";
import { idSchema } from "@otto/schemas";

/**
 * Auth + entitlement (SERVER-ONLY) — STUB.
 *
 * Real implementation will resolve the Supabase Auth session from the request
 * and load the user's entitlement (free / Pro / Lifetime) from the billing
 * domain (ARCHITECTURE.md §8). Every Pro route checks this server-side.
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

/**
 * Resolve the caller's auth context.
 *
 * TODO(auth): replace this stub with a real Supabase Auth session lookup
 * (verify the session cookie / bearer token server-side, never trust the
 * client) and load the entitlement from the billing tables. For now there is
 * no auth context, so Pro routes must treat callers as unauthenticated.
 */
export async function getAuthContext(_request: Request): Promise<AuthResult> {
  // DEV-ONLY escape hatch: with OTTO_DEV_AUTH=pro set (never in production), treat
  // the caller as an authenticated Pro user so the brain can be exercised locally
  // before real Supabase auth lands. TODO(auth): remove once sessions are wired.
  if (process.env.NODE_ENV !== "production" && process.env.OTTO_DEV_AUTH === "pro") {
    return {
      ok: true,
      context: { userId: "00000000-0000-4000-8000-0000000000de", entitlement: "pro" },
    };
  }
  // No session wired up yet — fail closed.
  return { ok: false, reason: "unauthenticated" };
}

/** True when the entitlement grants Pro-tier cloud features. */
export function isProEntitled(entitlement: Entitlement): boolean {
  return entitlement === "pro" || entitlement === "lifetime";
}
