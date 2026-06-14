import { fail, ok, parseJsonBody } from "@/lib/api";
import { getAuthContext, isProEntitled } from "@/server/auth";
import { runSync, syncRequestSchema } from "@/server/sync";

/**
 * POST /api/sync — cloud backup / cross-device sync (Pro-only).
 *
 * Thin handler: validate → auth/entitlement → delegate → envelope.
 * TODO(auth): real Supabase session check; the stub fails closed (401).
 */
export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, syncRequestSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  const auth = await getAuthContext(request);
  if (!auth.ok) {
    return fail("UNAUTHORIZED", "Sign in to sync your data.");
  }
  if (!isProEntitled(auth.context.entitlement)) {
    return fail("FORBIDDEN", "Cloud sync is a Pro feature.");
  }

  const result = runSync(auth.context.userId, parsed.data);
  return ok(result);
}
