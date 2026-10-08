import { z } from "zod";
import { randomUUID } from "node:crypto";
import {
  aiUserContextSchema,
  briefingSchema,
  briefingSlotSchema,
  contextItemSchema,
  incomeSchema,
  proposalSchema,
  routineSchema,
  type Briefing,
} from "@otto/schemas";
import { composeBriefing, serializeContextForLlm } from "@otto/core";
import type { LlmClient } from "./client";
import { proposalTools, toolCallToProposal } from "./tools";
import { briefSystem } from "./prompts";
import { currentTimeContext, promptLocale } from "./time";

/** Request contract for POST /api/llm/brief, composed from shared schemas. */
export const briefRequestSchema = z.object({
  slot: briefingSlotSchema,
  /** Context-graph items to reason over. Capped to keep payloads bounded. */
  contextItems: z.array(contextItemSchema).max(200),
  /** Optional richer context for better cross-domain reasoning. */
  routine: routineSchema.optional(),
  incomes: z.array(incomeSchema).max(20).optional(),
  /** The user's timezone, currency and locale (story 13.2); absent from older apps. */
  user: aiUserContextSchema.optional(),
});
export type BriefRequest = z.infer<typeof briefRequestSchema>;

export const briefResponseSchema = z.object({
  briefing: briefingSchema,
  proposals: z.array(proposalSchema),
});
export type BriefResponse = z.infer<typeof briefResponseSchema>;

/** Wall-clock injected by the route; fixed in tests for determinism. */
export type Clock = { now: string; date: string };

const SLOT_OPENING: Record<BriefRequest["slot"], string> = {
  morning: "Good morning.",
  midday: "Quick midday check.",
  evening: "Winding down.",
};

/**
 * Generate a proactive briefing via the LLM. On refusal or empty output, falls
 * back to the deterministic template composer from @otto/core so the user always
 * gets a brief. Any write-back the model suggests is returned as a Proposal.
 */
export async function generateBriefing(
  llm: LlmClient,
  userId: string,
  request: BriefRequest,
  clock: Clock,
): Promise<BriefResponse> {
  const context = serializeContextForLlm({
    date: clock.date,
    routine: request.routine,
    items: request.contextItems,
    income: request.incomes?.map((i) => ({
      source: i.source,
      amount: i.amount,
      nextPayDate: i.nextPayDate,
    })),
  });

  const locale = promptLocale(request.user, clock.now);
  const result = await llm.generate({
    system: briefSystem(locale),
    userText: `${currentTimeContext(clock.now, locale.timezone)}\n\n${context}\n\nWrite the ${request.slot} briefing for ${clock.date}.`,
    tools: proposalTools(locale.currency),
    thinking: true,
    effort: "medium",
    maxTokens: 2048,
  });

  if (result.refused || !result.text) {
    // Fallback: template briefing (free-tier composer), no proposals.
    const briefing = composeBriefing({
      id: randomUUID(),
      userId,
      slot: request.slot,
      date: clock.date,
      items: request.contextItems,
      nudges: [],
      generatedAt: clock.now,
    });
    return { briefing, proposals: [] };
  }

  const proposals = result.toolCalls
    .map((call) => toolCallToProposal(call, () => randomUUID(), locale.currency))
    .filter((p): p is NonNullable<typeof p> => p !== null);

  const briefing: Briefing = briefingSchema.parse({
    id: randomUUID(),
    userId,
    slot: request.slot,
    date: clock.date,
    summary: result.text || `${SLOT_OPENING[request.slot]} You have a clear day.`,
    items: request.contextItems,
    nudges: [],
    source: "llm",
    generatedAt: clock.now,
  });

  return { briefing, proposals };
}
