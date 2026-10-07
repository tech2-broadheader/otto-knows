import { fail, ok } from "@/lib/api";
import { getAuthContext } from "@/server/auth";
import { getTokenStore } from "@/server/token-store";

/**
 * POST /api/connectors/google/disconnect — forget the caller's stored Google
 * tokens (story 3.4). Idempotent: disconnecting when not connected still
 * succeeds. Revoking the grant at Google is a follow-up; the user can also
 * remove access from their Google account settings.
 */
export async function POST(request: Request) {
  const auth = await getAuthContext(request);
  if (!auth.ok) {
    return fail("UNAUTHORIZED", "Sign in to disconnect Google Calendar.");
  }

  const store = await getTokenStore();
  if (!store) {
    return fail("INTERNAL", "Google Calendar connection isn't configured on this server.");
  }

  await store.delete(auth.context.userId, "google");
  return ok({ disconnected: true, provider: "google" });
}
