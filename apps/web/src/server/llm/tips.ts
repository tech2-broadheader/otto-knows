import {
  tipsRequestSchema,
  tipsResponseSchema,
  type TipDomain,
  type TipsRequest,
  type TipsResponse,
} from "@otto/schemas";
import type { LlmClient } from "./client";
import { FINANCE_TIPS_SYSTEM, HEALTH_TIPS_SYSTEM } from "./prompts";

export { tipsRequestSchema, tipsResponseSchema };
export type { TipsRequest, TipsResponse };

const SYSTEM_BY_DOMAIN: Record<TipDomain, string> = {
  finance: FINANCE_TIPS_SYSTEM,
  health: HEALTH_TIPS_SYSTEM,
};

const USER_BY_DOMAIN: Record<TipDomain, string> = {
  finance: "Give me a few general money tips for today.",
  health: "Give me a few gentle wellbeing tips for today.",
};

/** Parse newline-separated model text into clean, bounded tips. */
export function parseTips(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
    .filter((line) => line.length > 0)
    .slice(0, 5)
    .map((line) => line.slice(0, 280));
}

/**
 * Generate general, non-prescriptive tips for a domain. Returns an empty list on
 * refusal. Tone guardrails live in the system prompt (spec §6.2).
 */
export async function generateTips(llm: LlmClient, request: TipsRequest): Promise<TipsResponse> {
  const result = await llm.generate({
    system: SYSTEM_BY_DOMAIN[request.domain],
    userText: USER_BY_DOMAIN[request.domain],
    effort: "low",
    maxTokens: 512,
  });

  if (result.refused) return { domain: request.domain, tips: [] };
  return tipsResponseSchema.parse({ domain: request.domain, tips: parseTips(result.text) });
}
