import { fail, ok, parseJsonBody } from "@/lib/api";
import { getAuthContext, isProEntitled } from "@/server/auth";
import { tipsRequestSchema, generateTips } from "@/server/llm/tips";
import { getLlmClient } from "@/server/llm/client";
import { checkRateLimit, recordUsage } from "@/server/llm/meter";

/**
 * POST /api/llm/tips — general finance/health tips (Pro-only).
 *
 * Tips are general and non-prescriptive — never licensed advice or medical
 * guidance (spec §6.2); the tone guardrails live in the system prompt.
 */
export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, tipsRequestSchema);
  if (!parsed.ok) return parsed.response;

  const auth = await getAuthContext(request);
  if (!auth.ok) return fail("UNAUTHORIZED", "Sign in to see tips.");
  if (!isProEntitled(auth.context.entitlement)) {
    return fail("FORBIDDEN", "Tips are a Pro feature.");
  }
  if (!checkRateLimit(auth.context.userId, Date.now())) {
    return fail("RATE_LIMITED", "Too many requests — please wait a moment.");
  }

  try {
    const result = await generateTips(getLlmClient(), parsed.data);
    recordUsage(auth.context.userId, "tips", { inputTokens: 0, outputTokens: 0 });
    return ok(result);
  } catch {
    return fail("INTERNAL", "Could not fetch tips right now.");
  }
}
