import { createClient } from "@supabase/supabase-js";
import { fail, ok } from "@/lib/api";
import { getAuthVerifier } from "@/server/supabase";

/**
 * POST /api/account/delete — permanently delete the caller's account (DPA right
 * to erasure). Verifies the caller's own access token (NOT the dev bypass — this
 * is destructive, so it must target the real token's user), then uses the
 * service-role admin client to remove their profile row and auth user.
 *
 * On-device data is wiped client-side; this clears the cloud account.
 */
export async function POST(request: Request): Promise<Response> {
  const header = request.headers.get("authorization") ?? request.headers.get("Authorization");
  const token = header ? /^Bearer\s+(.+)$/i.exec(header.trim())?.[1]?.trim() : undefined;
  if (!token) return fail("UNAUTHORIZED", "Sign in to delete your account.");

  const verifier = getAuthVerifier();
  if (!verifier) return fail("INTERNAL", "Account service isn't configured.");

  const userId = await verifier.verify(token);
  if (!userId) return fail("UNAUTHORIZED", "Your session has expired — sign in again.");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return fail("INTERNAL", "Account service isn't configured.");

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  try {
    // Remove connector credentials and their audit trail, the entitlement/profile
    // row, then the auth user itself (story 3.4: tokens must not outlive the account).
    const tokens = await admin.from("connector_tokens").delete().eq("user_id", userId);
    const audit = await admin.from("audit_events").delete().eq("user_id", userId);
    if (tokens.error || audit.error) {
      return fail("INTERNAL", "Could not delete the account. Please try again.");
    }
    await admin.from("profiles").delete().eq("id", userId);
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) return fail("INTERNAL", "Could not delete the account. Please try again.");
  } catch {
    return fail("INTERNAL", "Could not delete the account. Please try again.");
  }

  return ok({ deleted: true });
}
