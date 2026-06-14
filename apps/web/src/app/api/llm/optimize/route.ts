import { fail, ok, parseJsonBody } from "@/lib/api";
import { getAuthContext, isProEntitled } from "@/server/auth";
import { optimizeRequestSchema, generateOptimization } from "@/server/llm/optimizer";
import { getLlmClient } from "@/server/llm/client";
import { checkRateLimit, recordUsage } from "@/server/llm/meter";

/**
 * POST /api/llm/optimize — propose a reshaped day for a new routine (Pro-only).
 *
 * The most assistant-like feature (FR-O1). Returns a PROPOSAL the user confirms;
 * Otto never rewrites the day silently (CLAUDE.md §1.11, spec §6.1).
 */
export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, optimizeRequestSchema);
  if (!parsed.ok) return parsed.response;

  const auth = await getAuthContext(request);
  if (!auth.ok) return fail("UNAUTHORIZED", "Sign in to use the optimizer.");
  if (!isProEntitled(auth.context.entitlement)) {
    return fail("FORBIDDEN", "The routine optimizer is a Pro feature.");
  }
  if (!checkRateLimit(auth.context.userId, Date.now())) {
    return fail("RATE_LIMITED", "Too many requests — please wait a moment.");
  }

  try {
    const result = await generateOptimization(getLlmClient(), parsed.data);
    if (!result) return fail("INTERNAL", "Could not reshape your day right now.");
    recordUsage(auth.context.userId, "optimize", { inputTokens: 0, outputTokens: 0 });
    return ok(result);
  } catch {
    return fail("INTERNAL", "Could not reshape your day right now.");
  }
}
