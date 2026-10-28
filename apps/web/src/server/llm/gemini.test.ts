import { describe, expect, it } from "vitest";
import { toGeminiSchema } from "./gemini";
import { NullLlmClient, selectProvider } from "./client";

describe("toGeminiSchema", () => {
  it("uppercases types and keeps the supported subset recursively", () => {
    const result = toGeminiSchema({
      type: "object",
      properties: {
        title: { type: "string", description: "x" },
        times: { type: "array", items: { type: "string" } },
        amount: {
          type: "object",
          properties: { amountMinor: { type: "integer", minimum: 0 } },
          required: ["amountMinor"],
        },
        freq: { type: "string", enum: ["daily", "weekly"] },
      },
      required: ["title"],
    });
    expect(result.type).toBe("OBJECT");
    const props = result.properties as Record<string, Record<string, unknown>>;
    expect(props.title?.type).toBe("STRING");
    expect((props.times?.items as Record<string, unknown>)?.type).toBe("STRING");
    expect(props.amount?.type).toBe("OBJECT");
    // Unsupported JSON-Schema fields (minimum) are dropped.
    const amountProps = props.amount?.properties as Record<string, Record<string, unknown>>;
    expect(amountProps.amountMinor?.type).toBe("INTEGER");
    expect(amountProps.amountMinor && "minimum" in amountProps.amountMinor).toBe(false);
    expect(props.freq?.enum).toEqual(["daily", "weekly"]);
    expect(result.required).toEqual(["title"]);
  });
});

describe("NullLlmClient", () => {
  it("refuses so callers fall back to the free/template path", async () => {
    const result = await new NullLlmClient().generate();
    expect(result.refused).toBe(true);
    expect(result.toolCalls).toEqual([]);
  });
});

describe("selectProvider (ADR-009)", () => {
  it("honours LLM_PROVIDER when its key is present", () => {
    expect(
      selectProvider({ LLM_PROVIDER: "groq", GROQ_API_KEY: "k", ANTHROPIC_API_KEY: "a" }),
    ).toBe("groq");
    expect(selectProvider({ LLM_PROVIDER: "Gemini", GEMINI_API_KEY: "g" })).toBe("gemini");
  });

  it("falls back to none when the chosen provider has no key (never a surprise provider)", () => {
    expect(selectProvider({ LLM_PROVIDER: "groq", ANTHROPIC_API_KEY: "a" })).toBe("none");
  });

  it("infers from the keys present: Anthropic, then Gemini, then Groq", () => {
    expect(selectProvider({ ANTHROPIC_API_KEY: "a", GROQ_API_KEY: "k" })).toBe("anthropic");
    expect(selectProvider({ GEMINI_API_KEY: "g", GROQ_API_KEY: "k" })).toBe("gemini");
    expect(selectProvider({ GROQ_API_KEY: "k" })).toBe("groq");
    expect(selectProvider({})).toBe("none");
  });
});
