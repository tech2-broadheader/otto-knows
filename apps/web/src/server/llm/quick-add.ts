import { randomUUID } from "node:crypto";
import {
  quickAddRequestSchema,
  quickAddResponseSchema,
  type QuickAddRequest,
  type QuickAddResponse,
} from "@otto/schemas";
import type { LlmClient } from "./client";
import { proposalTools, toolCallToProposal } from "./tools";
import { quickAddSystem } from "./prompts";
import { currentTimeContext, promptLocale } from "./time";

export { quickAddRequestSchema, quickAddResponseSchema };
export type { QuickAddRequest, QuickAddResponse };

/**
 * Parse a natural-language note into confirmable proposals via tool-calling.
 * Returns no proposals on refusal or when nothing is actionable. Times and money
 * follow the user's timezone and home currency when the app sends them (13.2).
 *
 * @param now - current ISO time, so the model can resolve "tonight"/"8pm".
 */
export async function generateQuickAdd(
  llm: LlmClient,
  request: QuickAddRequest,
  now: string,
): Promise<QuickAddResponse> {
  const locale = promptLocale(request.user, now);
  const result = await llm.generate({
    system: quickAddSystem(locale),
    userText: `${currentTimeContext(now, locale.timezone)}\n\nNote: ${request.text}`,
    tools: proposalTools(locale.currency),
    effort: "low",
    maxTokens: 1024,
  });

  if (result.refused) return { proposals: [] };

  const proposals = result.toolCalls
    .map((call) => toolCallToProposal(call, () => randomUUID(), locale.currency))
    .filter((p): p is NonNullable<typeof p> => p !== null);

  return { proposals };
}
