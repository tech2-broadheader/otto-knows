import { GoogleGenAI, FunctionCallingConfigMode } from "@google/genai";
import type { LlmClient, LlmGenerateRequest, LlmResult } from "./client";

/**
 * Google Gemini implementation of the LlmClient (free-tier option). NON-Claude
 * code by design — keeps Otto's brain provider-swappable behind one interface.
 * Single non-streaming generateContent call; tool calls become proposals
 * upstream (the proxy never executes them — CLAUDE.md §1.11).
 *
 * ⚠️ Privacy: Gemini's free tier may use inputs to improve Google's products.
 * Otto sends finance/health context, so review Google's data-use terms before
 * pointing this at real user data (spec §12 / DPA). See docs/SETUP-llm.md.
 */

type JsonSchema = Record<string, unknown>;

const TYPE_MAP: Record<string, string> = {
  object: "OBJECT",
  string: "STRING",
  integer: "INTEGER",
  number: "NUMBER",
  boolean: "BOOLEAN",
  array: "ARRAY",
};

/**
 * Convert our JSON-Schema tool input (lowercase types, full JSON Schema) into the
 * Gemini function-declaration schema (uppercase Type, a supported subset). Pure +
 * recursive; drops fields Gemini doesn't accept (e.g. minimum/maximum). Exported
 * for unit testing.
 */
export function toGeminiSchema(schema: JsonSchema): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const type = schema.type;
  if (typeof type === "string" && TYPE_MAP[type]) out.type = TYPE_MAP[type];
  if (typeof schema.description === "string") out.description = schema.description;
  if (Array.isArray(schema.enum)) out.enum = schema.enum;
  if (Array.isArray(schema.required)) out.required = schema.required;

  if (schema.properties && typeof schema.properties === "object") {
    const props: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(schema.properties as Record<string, JsonSchema>)) {
      props[key] = toGeminiSchema(value);
    }
    out.properties = props;
  }
  if (schema.items && typeof schema.items === "object") {
    out.items = toGeminiSchema(schema.items as JsonSchema);
  }
  return out;
}

export class GeminiLlmClient implements LlmClient {
  constructor(
    private readonly client: GoogleGenAI,
    private readonly model: string,
  ) {}

  async generate(request: LlmGenerateRequest): Promise<LlmResult> {
    const tools = request.tools
      ? [
          {
            functionDeclarations: request.tools.map((t) => ({
              name: t.name,
              description: t.description,
              parameters: toGeminiSchema(t.inputSchema),
            })),
          },
        ]
      : undefined;

    const response = await this.client.models.generateContent({
      model: this.model,
      contents: request.userText,
      config: {
        systemInstruction: request.system,
        ...(tools ? { tools } : {}),
        ...(request.toolChoice === "any" && tools
          ? { toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.ANY } } }
          : {}),
      },
    });

    const usage = {
      inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
    };

    const blocked =
      !!response.promptFeedback?.blockReason || response.candidates?.[0]?.finishReason === "SAFETY";
    if (blocked) return { text: "", toolCalls: [], refused: true, usage };

    const toolCalls = (response.functionCalls ?? []).map((call) => ({
      name: call.name ?? "",
      input: call.args ?? {},
    }));

    return { text: (response.text ?? "").trim(), toolCalls, refused: false, usage };
  }
}
