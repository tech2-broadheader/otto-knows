/**
 * Briefing module — the real implementation now lives in `./llm/brief.ts`
 * (the LLM proxy). This file re-exports it for stable import paths.
 */
export {
  briefRequestSchema,
  briefResponseSchema,
  generateBriefing,
  type BriefRequest,
  type BriefResponse,
  type Clock,
} from "./llm/brief";
