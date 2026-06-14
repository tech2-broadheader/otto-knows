import { fail, ok, parseJsonBody } from "@/lib/api";
import { getAuthContext, isProEntitled } from "@/server/auth";
import { quickAddRequestSchema, generateQuickAdd } from "@/server/llm/quick-add";
import { getLlmClient } from "@/server/llm/client";
import {
  FREE_QUICK_ADD_DAILY,
  checkAndConsumeQuota,
  checkRateLimit,
  recordUsage,
} from "@/server/llm/meter";

/**
 * POST /api/llm/quick-add — natural-language → confirmable proposals.
 *
 * Free tier gets a small daily quota (spec §8); Pro is unlimited. Every caller
 * is rate-limited. The result is PROPOSALS only — nothing is applied server-side
 * (CLAUDE.md §1.11). Conversational depth for v1 is quick-add + briefing (OD-2).
 */
export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, quickAddRequestSchema);
  if (!parsed.ok) return parsed.response;

  const auth = await getAuthContext(request);
  if (!auth.ok) return fail("UNAUTHORIZED", "Sign in to use quick-add.");

  const nowMs = Date.now();
  if (!checkRateLimit(auth.context.userId, nowMs)) {
    return fail("RATE_LIMITED", "Too many requests — please wait a moment.");
  }

  const nowIso = new Date().toISOString();
  if (!isProEntitled(auth.context.entitlement)) {
    const allowed = checkAndConsumeQuota(
      auth.context.userId,
      nowIso.slice(0, 10),
      FREE_QUICK_ADD_DAILY,
    );
    if (!allowed) {
      return fail(
        "FORBIDDEN",
        "You've used today's free quick-adds. Upgrade to Pro for unlimited.",
      );
    }
  }

  try {
    const result = await generateQuickAdd(getLlmClient(), parsed.data, nowIso);
    recordUsage(auth.context.userId, "quick-add", { inputTokens: 0, outputTokens: 0 });
    return ok(result);
  } catch {
    return fail("INTERNAL", "Could not parse that right now.");
  }
}
