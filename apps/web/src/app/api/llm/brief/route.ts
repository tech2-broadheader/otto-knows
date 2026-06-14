import { fail, ok, parseJsonBody } from "@/lib/api";
import { getAuthContext, isProEntitled } from "@/server/auth";
import { briefRequestSchema, generateBriefing } from "@/server/briefing";

/**
 * POST /api/llm/brief — generate a proactive daily briefing (Pro-only).
 *
 * Handler stays thin (CLAUDE.md §6 / CODING_CONVENTIONS §7): validate input →
 * auth/entitlement check → delegate to the server module → return the envelope.
 *
 * NOTE: the LLM provider key stays server-side behind the proxy and usage is
 * metered per user. TODO(rate-limit + metering): enforce per-user rate limiting
 * and record metered usage in `generateBriefing`'s real implementation.
 * Any write-back is returned as a PROPOSAL requiring user confirmation — never
 * executed here (CLAUDE.md §1.11).
 */
export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, briefRequestSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  const auth = await getAuthContext(request);
  if (!auth.ok) {
    // TODO(auth): real Supabase session check. Stub fails closed → 401.
    return fail("UNAUTHORIZED", "Sign in to generate a briefing.");
  }
  if (!isProEntitled(auth.context.entitlement)) {
    return fail("FORBIDDEN", "Daily briefings are a Pro feature.");
  }

  const result = generateBriefing(auth.context.userId, parsed.data);
  return ok(result);
}
