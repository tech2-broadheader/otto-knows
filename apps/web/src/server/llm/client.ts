import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import { GeminiLlmClient } from "./gemini";

/**
 * LLM client (SERVER-ONLY). A narrow interface around a single non-streaming
 * Messages call, so routes can inject a stub in tests and we never hit the
 * network in CI. The provider key stays server-side (CLAUDE.md §6, §11).
 *
 * We make ONE create() call and read the result — we do NOT run a tool-execution
 * loop. Tool calls Claude emits are returned as-is and converted to PROPOSALS the
 * user must confirm (CLAUDE.md §1.11); the proxy never acts on the user's data.
 */

export type LlmToolDef = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

export type LlmToolCall = {
  name: string;
  input: unknown;
};

export type LlmUsage = {
  inputTokens: number;
  outputTokens: number;
};

export type LlmGenerateRequest = {
  system: string;
  userText: string;
  tools?: LlmToolDef[];
  /** "any" forces a tool call (used to get a single structured object). */
  toolChoice?: "auto" | "any";
  /** Adaptive thinking — on for cross-domain reasoning, off for simple extraction. */
  thinking?: boolean;
  effort?: "low" | "medium" | "high";
  maxTokens?: number;
};

export type LlmResult = {
  text: string;
  toolCalls: LlmToolCall[];
  /** True if safety classifiers declined the request (stop_reason "refusal"). */
  refused: boolean;
  usage: LlmUsage;
};

export interface LlmClient {
  generate(request: LlmGenerateRequest): Promise<LlmResult>;
}

/** Anthropic-backed implementation. Defaults to claude-opus-5-5 (config). */
export class AnthropicLlmClient implements LlmClient {
  constructor(
    private readonly client: Anthropic,
    private readonly model: string,
  ) {}

  async generate(request: LlmGenerateRequest): Promise<LlmResult> {
    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: request.maxTokens ?? 1024,
      // Adaptive is the only on-mode on Opus 4.8; omit entirely to disable.
      ...(request.thinking ? { thinking: { type: "adaptive" } } : {}),
      ...(request.effort ? { output_config: { effort: request.effort } } : {}),
      system: request.system,
      ...(request.tools
        ? {
            tools: request.tools.map((t) => ({
              name: t.name,
              description: t.description,
              input_schema: t.inputSchema as Anthropic.Tool.InputSchema,
            })),
            ...(request.toolChoice === "any" ? { tool_choice: { type: "any" as const } } : {}),
          }
        : {}),
      messages: [{ role: "user", content: request.userText }],
    });

    const usage: LlmUsage = {
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
    };

    // Check stop_reason before reading content — a refusal has empty/partial content.
    if (message.stop_reason === "refusal") {
      return { text: "", toolCalls: [], refused: true, usage };
    }

    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    const toolCalls = message.content
      .filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
      .map((b) => ({ name: b.name, input: b.input }));

    return { text, toolCalls, refused: false, usage };
  }
}

/**
 * Last-resort client when no provider is configured: always "refuses" so the
 * brief falls back to its template, quick-add/optimizer return nothing, and tips
 * are empty. This is what makes the app degrade gracefully to the free/local
 * experience with no LLM keys at all.
 */
export class NullLlmClient implements LlmClient {
  async generate(): Promise<LlmResult> {
    return { text: "", toolCalls: [], refused: true, usage: { inputTokens: 0, outputTokens: 0 } };
  }
}

let cached: LlmClient | null = null;

/**
 * Build (and cache) the LLM client for the configured provider. Reads env
 * directly (not the full typed config) so the brain works regardless of which
 * other services are set up.
 *
 * Provider selection: `LLM_PROVIDER` ("anthropic" | "gemini"), else inferred
 * from whichever key is present (Anthropic preferred). No key → NullLlmClient.
 */
export function getLlmClient(): LlmClient {
  if (cached) return cached;
  cached = buildLlmClient();
  return cached;
}

function buildLlmClient(): LlmClient {
  const provider = (process.env.LLM_PROVIDER ?? "").toLowerCase();
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  const useGemini = provider === "gemini" || (!provider && !anthropicKey && !!geminiKey);

  if (useGemini && geminiKey) {
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    return new GeminiLlmClient(new GoogleGenAI({ apiKey: geminiKey }), model);
  }
  if (anthropicKey && provider !== "gemini") {
    const model = process.env.LLM_MODEL || "claude-opus-5-5";
    return new AnthropicLlmClient(new Anthropic({ apiKey: anthropicKey }), model);
  }
  return new NullLlmClient();
}
