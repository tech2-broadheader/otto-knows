import { z } from "zod";
import {
  briefingSlotSchema,
  contextItemSchema,
  briefingSchema,
  type Briefing,
} from "@otto/schemas";

/**
 * Briefing generation (SERVER-ONLY) — STUB.
 *
 * The real implementation routes through the LLM proxy: provider keys stay
 * server-side and usage is metered per user (CLAUDE.md §6, ARCHITECTURE.md §9).
 * This stub returns a deterministic, template-derived Briefing and calls NO
 * real LLM, so it is safe to run without keys.
 *
 * Write-back (create reminder, log expense, block time) is "propose-and-confirm"
 * only (CLAUDE.md §1.11): any action is returned as a PROPOSAL the user must
 * accept — never executed here.
 */

/** Request contract for POST /api/llm/brief, composed from shared schemas. */
export const briefRequestSchema = z.object({
  slot: briefingSlotSchema,
  /** The context-graph items to reason over. Capped to keep payloads bounded. */
  contextItems: z.array(contextItemSchema).max(200),
});
export type BriefRequest = z.infer<typeof briefRequestSchema>;

/** A write-back action Otto suggests but never performs without confirmation. */
export const proposalSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["create-reminder", "log-expense", "block-time"]),
  description: z.string().min(1),
  requiresConfirmation: z.literal(true),
});
export type Proposal = z.infer<typeof proposalSchema>;

/** Response contract: the generated briefing plus any unconfirmed proposals. */
export const briefResponseSchema = z.object({
  briefing: briefingSchema,
  proposals: z.array(proposalSchema),
});
export type BriefResponse = z.infer<typeof briefResponseSchema>;

const STUB_BRIEFING_ID = "00000000-0000-4000-8000-000000000001";

const SLOT_OPENING: Record<BriefRequest["slot"], string> = {
  morning: "Good morning — here is what matters today",
  midday: "Midday check-in — where your day stands",
  evening: "Winding down — a look back and ahead",
};

/**
 * Produce a deterministic stub briefing for the given slot + context items.
 *
 * TODO(rate-limit + metering): enforce per-user rate limits and record metered
 * LLM usage before calling the proxy in the real implementation.
 *
 * @param userId - the authenticated caller, stamped onto the briefing.
 * @param request - validated slot + context items.
 */
export function generateBriefing(userId: string, request: BriefRequest): BriefResponse {
  const itemTitles = request.contextItems.map((item) => item.title);
  const summary =
    itemTitles.length > 0
      ? `${SLOT_OPENING[request.slot]}: ${itemTitles.join(", ")}.`
      : `${SLOT_OPENING[request.slot]}: nothing on the calendar — a clear day.`;

  // Deterministic timestamp/date derived from input rather than `Date.now()`,
  // so the stub is reproducible and easy to test.
  const generatedAt = "2026-06-14T08:00:00+08:00";

  const briefing: Briefing = briefingSchema.parse({
    id: STUB_BRIEFING_ID,
    userId,
    slot: request.slot,
    date: "2026-06-14",
    summary,
    items: request.contextItems,
    nudges: [],
    source: "llm",
    generatedAt,
  });

  // No write-back actions proposed by the stub; the field exists to make the
  // propose-and-confirm contract explicit to callers.
  return { briefing, proposals: [] };
}
