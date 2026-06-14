import {
  optimizationProposalSchema,
  optimizeRequestSchema,
  optimizeResponseSchema,
  type OptimizeRequest,
  type OptimizeResponse,
} from "@otto/schemas";
import type { LlmClient, LlmToolDef } from "./client";
import { OPTIMIZER_SYSTEM } from "./prompts";

export { optimizeRequestSchema, optimizeResponseSchema };
export type { OptimizeRequest, OptimizeResponse };

/** Single forced tool — the model returns the reshaped day as its input. */
const PROPOSE_SCHEDULE_TOOL: LlmToolDef = {
  name: "propose_schedule",
  description: "Propose the reshaped day. Call exactly once.",
  inputSchema: {
    type: "object",
    properties: {
      summary: { type: "string", description: "One or two warm sentences explaining the reshape." },
      changes: {
        type: "array",
        items: {
          type: "object",
          properties: {
            action: { type: "string", enum: ["add", "move", "keep"] },
            label: { type: "string" },
            kind: {
              type: "string",
              enum: ["wake", "meds", "meal", "work", "exercise", "wind-down", "sleep", "custom"],
            },
            anchorId: { type: "string" },
            fromTime: { type: "string", description: "HH:mm 24h (for move)" },
            toTime: { type: "string", description: "HH:mm 24h" },
            reason: { type: "string" },
          },
          required: ["action", "label", "kind", "toTime", "reason"],
        },
      },
    },
    required: ["summary", "changes"],
  },
};

function describeRoutine(request: OptimizeRequest): string {
  const anchors = [...request.routine.anchors]
    .sort((a, b) => a.time.localeCompare(b.time))
    .map((a) => `  - ${a.time} ${a.label} (${a.kind}) [id:${a.id}]`)
    .join("\n");
  const commitments = (request.commitments ?? [])
    .map((c) => `  - ${c.startTime}–${c.endTime} ${c.label}`)
    .join("\n");
  const nr = request.newRoutine;
  return [
    `Timezone: ${request.routine.timezone}`,
    "Current anchors:",
    anchors || "  (none)",
    "Fixed commitments (do not overlap):",
    commitments || "  (none)",
    `New routine to fit in: ${nr.label} (${nr.kind}), ${nr.durationMinutes} min, ${nr.recurrence.freq}` +
      (nr.preference ? `, preference: ${nr.preference}` : ""),
  ].join("\n");
}

/**
 * Ask the LLM to reshape the day to fit a new routine. Returns null on refusal
 * or when the model's proposal fails our contract — the route then surfaces a
 * friendly error. The result is a PROPOSAL the user confirms (CLAUDE.md §1.11).
 */
export async function generateOptimization(
  llm: LlmClient,
  request: OptimizeRequest,
): Promise<OptimizeResponse | null> {
  const result = await llm.generate({
    system: OPTIMIZER_SYSTEM,
    userText: describeRoutine(request),
    tools: [PROPOSE_SCHEDULE_TOOL],
    toolChoice: "any",
    thinking: true,
    effort: "high",
    maxTokens: 2048,
  });

  if (result.refused) return null;

  const call = result.toolCalls.find((c) => c.name === "propose_schedule");
  if (!call) return null;

  const proposal = optimizationProposalSchema.safeParse(call.input);
  if (!proposal.success) return null;

  return { proposal: proposal.data };
}
