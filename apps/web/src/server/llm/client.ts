import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import { GeminiLlmClient } from "./gemini";
import { GroqLlmClient } from "./groq";

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
 * Provider selection: see selectProvider. No usable key → NullLlmClient.
 */
export function getLlmClient(): LlmClient {
  if (cached) return cached;
  cached = buildLlmClient();
  return cached;
}

export type LlmProvider = "anthropic" | "gemini" | "groq" | "none";

type ProviderEnv = Readonly<Record<string, string | undefined>>;

const KEY_FOR: Record<Exclude<LlmProvider, "none">, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  gemini: "GEMINI_API_KEY",
  groq: "GROQ_API_KEY",
};

/**
 * Which provider to use (ADR-009): `LLM_PROVIDER` ("anthropic" | "gemini" |
 * "groq") when its key is present — otherwise none, never a surprise fallback;
 * without `LLM_PROVIDER`, the first key present in the order Anthropic,
 * Gemini, Groq.
 */
export function selectProvider(env: ProviderEnv): LlmProvider {
  const chosen = (env.LLM_PROVIDER ?? "").trim().toLowerCase();
  if (chosen) {
    if (chosen in KEY_FOR) {
      const provider = chosen as Exclude<LlmProvider, "none">;
      return env[KEY_FOR[provider]] ? provider : "none";
    }
    return "none";
  }
  for (const provider of ["anthropic", "gemini", "groq"] as const) {
    if (env[KEY_FOR[provider]]) return provider;
  }
  return "none";
}

function buildLlmClient(): LlmClient {
  const env = process.env;
  switch (selectProvider(env)) {
    case "anthropic":
      return new AnthropicLlmClient(
        new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }),
        env.LLM_MODEL || "claude-opus-5-5",
      );
    case "gemini":
      return new GeminiLlmClient(
        new GoogleGenAI({ apiKey: env.GEMINI_API_KEY }),
        env.GEMINI_MODEL || "gemini-2.5-flash",
      );
    case "groq":
      return new GroqLlmClient(env.GROQ_API_KEY ?? "", env.GROQ_MODEL || "openai/gpt-oss-120b");
    case "none":
      return new NullLlmClient();
  }
}
