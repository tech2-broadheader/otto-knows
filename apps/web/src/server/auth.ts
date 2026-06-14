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
  // No session wired up yet — fail closed.
  return { ok: false, reason: "unauthenticated" };
}

/** True when the entitlement grants Pro-tier cloud features. */
export function isProEntitled(entitlement: Entitlement): boolean {
  return entitlement === "pro" || entitlement === "lifetime";
}
