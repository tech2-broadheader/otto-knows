import type { LlmClient, LlmGenerateRequest, LlmResult } from "./client";

/**
 * Groq-backed LLM client (SERVER-ONLY; ADR-009). Groq serves open models through
 * an OpenAI-compatible Chat Completions API, so this is a plain fetch — no SDK.
 * Same contract as the other providers: one call, tool calls returned as-is and
 * turned into proposals by the caller (CLAUDE.md §1.11). Checked against Groq's
 * API reference 2026-10-28: `max_completion_tokens`, `tool_choice: "required"`,
 * `reasoning_effort` only on reasoning models (others reject it with a 400).
 */

const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";

/** Models that accept `reasoning_effort` low/medium/high. */
const REASONING_MODEL_PREFIX = "openai/gpt-oss";

type GroqRequest = {
  model: string;
  messages: { role: "system" | "user"; content: string }[];
  max_completion_tokens: number;
  tools?: {
    type: "function";
    function: { name: string; description: string; parameters: Record<string, unknown> };
  }[];
  tool_choice?: "auto" | "required";
  reasoning_effort?: "low" | "medium" | "high";
};

const DEFAULT_MAX_TOKENS = 1024;

type JsonSchema = Record<string, unknown>;

function allowNull(schema: JsonSchema): JsonSchema {
  const out: JsonSchema = { ...schema };
  if (typeof schema.type === "string") out.type = [schema.type, "null"];
  if (Array.isArray(schema.enum)) out.enum = [...(schema.enum as unknown[]), null];
  return out;
}

/**
 * Groq validates tool calls against the schema on its side and rejects a call
 * whose optional field is null (open models send that). Allow null on every
 * optional property, recursively; tools.ts drops the nulls before Zod parses.
 */
export function nullableOptionals(schema: JsonSchema): JsonSchema {
  const out: JsonSchema = { ...schema };
  if (schema.items && typeof schema.items === "object") {
    out.items = nullableOptionals(schema.items as JsonSchema);
  }
  if (schema.properties && typeof schema.properties === "object") {
    const required = new Set(Array.isArray(schema.required) ? (schema.required as string[]) : []);
    out.properties = Object.fromEntries(
      Object.entries(schema.properties as Record<string, JsonSchema>).map(([key, value]) => {
        const inner = nullableOptionals(value);
        return [key, required.has(key) ? inner : allowNull(inner)];
      }),
    );
  }
  return out;
}

export function toGroqRequest(request: LlmGenerateRequest, model: string): GroqRequest {
  return {
    model,
    messages: [
      { role: "system", content: request.system },
      { role: "user", content: request.userText },
    ],
    max_completion_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
    ...(request.tools?.length
      ? {
          tools: request.tools.map((t) => ({
            type: "function" as const,
            function: {
              name: t.name,
              description: t.description,
              parameters: nullableOptionals(t.inputSchema),
            },
          })),
          tool_choice: request.toolChoice === "any" ? ("required" as const) : ("auto" as const),
        }
      : {}),
    ...(request.effort && model.startsWith(REASONING_MODEL_PREFIX)
      ? { reasoning_effort: request.effort }
      : {}),
  };
}

type GroqResponse = {
  choices?: {
    finish_reason?: string;
    message?: {
      content?: string | null;
      tool_calls?: {
        id?: string;
        type?: string;
        function?: { name?: string; arguments?: string };
      }[];
    };
  }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
};

function parseArguments(raw: string | undefined): unknown {
  try {
    return JSON.parse(raw ?? "{}");
  } catch {
    return undefined;
  }
}

export function fromGroqResponse(json: GroqResponse): LlmResult {
  const choice = json.choices?.[0];
  const usage = {
    inputTokens: json.usage?.prompt_tokens ?? 0,
    outputTokens: json.usage?.completion_tokens ?? 0,
  };
  if (choice?.finish_reason === "content_filter") {
    return { text: "", toolCalls: [], refused: true, usage };
  }
  const toolCalls = (choice?.message?.tool_calls ?? []).flatMap((call) => {
    const name = call.function?.name;
    const input = parseArguments(call.function?.arguments);
    // Malformed arguments are dropped, never guessed at; Zod validates the rest.
    return name && input !== undefined ? [{ name, input }] : [];
  });
  return { text: (choice?.message?.content ?? "").trim(), toolCalls, refused: false, usage };
}

const MAX_ERROR_CHARS = 200;

async function errorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: { message?: string } };
    return (body.error?.message ?? "no details").slice(0, MAX_ERROR_CHARS);
  } catch {
    return "no details";
  }
}

export class GroqLlmClient implements LlmClient {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async generate(request: LlmGenerateRequest): Promise<LlmResult> {
    const response = await this.fetchImpl(GROQ_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(toGroqRequest(request, this.model)),
    });
    if (!response.ok) {
      // Status plus Groq's own error message (e.g. model_not_found) — never the key or prompt.
      throw new Error(
        `Groq chat completion failed (status ${response.status}): ${await errorMessage(response)}`,
      );
    }
    return fromGroqResponse((await response.json()) as GroqResponse);
  }
}
