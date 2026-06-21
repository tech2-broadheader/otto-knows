import { randomUUID } from "node:crypto";
import {
  quickAddRequestSchema,
  quickAddResponseSchema,
  type QuickAddRequest,
  type QuickAddResponse,
} from "@otto/schemas";
import type { LlmClient } from "./client";
import { PROPOSAL_TOOLS, toolCallToProposal } from "./tools";
import { QUICK_ADD_SYSTEM } from "./prompts";
import { currentTimeContext } from "./time";

export { quickAddRequestSchema, quickAddResponseSchema };
export type { QuickAddRequest, QuickAddResponse };

/**
 * Parse a natural-language note into confirmable proposals via tool-calling.
 * Returns no proposals on refusal or when nothing is actionable.
 *
 * @param now - current ISO time, so the model can resolve "tonight"/"8pm".
 */
export async function generateQuickAdd(
  llm: LlmClient,
  request: QuickAddRequest,
  now: string,
): Promise<QuickAddResponse> {
  const result = await llm.generate({
    system: QUICK_ADD_SYSTEM,
    userText: `${currentTimeContext(now)}\n\nNote: ${request.text}`,
    tools: PROPOSAL_TOOLS,
    effort: "low",
    maxTokens: 1024,
  });

  if (result.refused) return { proposals: [] };

  const proposals = result.toolCalls
    .map((call) => toolCallToProposal(call, () => randomUUID()))
    .filter((p): p is NonNullable<typeof p> => p !== null);

  return { proposals };
}
