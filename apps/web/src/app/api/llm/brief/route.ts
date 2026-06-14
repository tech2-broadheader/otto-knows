import { fail, ok, parseJsonBody } from "@/lib/api";
import { getAuthContext, isProEntitled } from "@/server/auth";
import { briefRequestSchema, generateBriefing } from "@/server/llm/brief";
import { getLlmClient } from "@/server/llm/client";
import { checkRateLimit, recordUsage } from "@/server/llm/meter";

/**
 * POST /api/llm/brief — proactive daily briefing via the LLM proxy (Pro-only).
 *
 * Thin handler (CLAUDE.md §6): validate → auth/entitlement → rate-limit →
 * delegate → envelope. The provider key stays server-side in the client factory;
 * any write-back is returned as a PROPOSAL the user confirms (CLAUDE.md §1.11).
 */
export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, briefRequestSchema);
  if (!parsed.ok) return parsed.response;

  const auth = await getAuthContext(request);
  if (!auth.ok) return fail("UNAUTHORIZED", "Sign in to generate a briefing.");
  if (!isProEntitled(auth.context.entitlement)) {
    return fail("FORBIDDEN", "Daily briefings are a Pro feature.");
  }

  if (!checkRateLimit(auth.context.userId, Date.now())) {
    return fail("RATE_LIMITED", "Too many requests — please wait a moment.");
  }

  const nowIso = new Date().toISOString();
  const clock = { now: nowIso, date: nowIso.slice(0, 10) };

  try {
    const result = await generateBriefing(getLlmClient(), auth.context.userId, parsed.data, clock);
    recordUsage(auth.context.userId, "brief", { inputTokens: 0, outputTokens: 0 });
    return ok(result);
  } catch {
    // Never leak provider errors/stack traces to the client.
    return fail("INTERNAL", "Could not generate your briefing right now.");
  }
}
