import { describe, expect, it } from "vitest";
import { GroqLlmClient, fromGroqResponse, nullableOptionals, toGroqRequest } from "./groq";

const tool = {
  name: "log_expense",
  description: "Propose logging a spending transaction.",
  inputSchema: { type: "object", properties: { rationale: { type: "string" } } },
};

describe("toGroqRequest", () => {
  it("builds an OpenAI-style chat request with tools", () => {
    expect(
      toGroqRequest(
        { system: "SYS", userText: "Lunch 180", tools: [tool], maxTokens: 512 },
        "llama-3.3-70b-versatile",
      ),
    ).toEqual({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "SYS" },
        { role: "user", content: "Lunch 180" },
      ],
      max_completion_tokens: 512,
      tools: [
        {
          type: "function",
          function: {
            name: tool.name,
            description: tool.description,
            // Optional fields may be null on Groq's side (see nullableOptionals).
            parameters: { type: "object", properties: { rationale: { type: ["string", "null"] } } },
          },
        },
      ],
      tool_choice: "auto",
    });
  });

  it("forces a tool call for toolChoice 'any' and sends effort only to reasoning models", () => {
    const forced = toGroqRequest(
      { system: "S", userText: "U", tools: [tool], toolChoice: "any", effort: "low" },
      "openai/gpt-oss-120b",
    );
    expect(forced.tool_choice).toBe("required");
    expect(forced.reasoning_effort).toBe("low");
    const llama = toGroqRequest(
      { system: "S", userText: "U", effort: "low" },
      "llama-3.3-70b-versatile",
    );
    expect(llama).not.toHaveProperty("reasoning_effort");
    expect(llama).not.toHaveProperty("tools");
  });
});

describe("fromGroqResponse", () => {
  it("reads text, parses tool-call arguments and usage", () => {
    const result = fromGroqResponse({
      choices: [
        {
          finish_reason: "tool_calls",
          message: {
            content: "  Here you go. ",
            tool_calls: [
              {
                id: "a",
                type: "function",
                function: { name: "log_expense", arguments: '{"rationale":"x"}' },
              },
              { id: "b", type: "function", function: { name: "add_note", arguments: "not json" } },
            ],
          },
        },
      ],
      usage: { prompt_tokens: 120, completion_tokens: 30 },
    });
    expect(result).toEqual({
      text: "Here you go.",
      // A call whose arguments aren't valid JSON is dropped, never guessed at.
      toolCalls: [{ name: "log_expense", input: { rationale: "x" } }],
      refused: false,
      usage: { inputTokens: 120, outputTokens: 30 },
    });
  });

  it("treats a content-filter stop as a refusal", () => {
    const result = fromGroqResponse({
      choices: [{ finish_reason: "content_filter", message: { content: "" } }],
    });
    expect(result.refused).toBe(true);
    expect(result.usage).toEqual({ inputTokens: 0, outputTokens: 0 });
  });
});

describe("GroqLlmClient", () => {
  it("posts to Groq's OpenAI-compatible endpoint with the key as a bearer token", async () => {
    let seen: { url: string; init?: RequestInit } | undefined;
    const fetchStub = (async (url: string, init?: RequestInit) => {
      seen = { url, init };
      return new Response(
        JSON.stringify({ choices: [{ finish_reason: "stop", message: { content: "Hi" } }] }),
        { status: 200 },
      );
    }) as unknown as typeof fetch;
    const client = new GroqLlmClient("test-key", "llama-3.3-70b-versatile", fetchStub);
    const result = await client.generate({ system: "S", userText: "U" });
    expect(seen?.url).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect(new Headers(seen?.init?.headers).get("authorization")).toBe("Bearer test-key");
    expect(result.text).toBe("Hi");
  });

  it("throws on an HTTP error without leaking the key", async () => {
    const failing = (async () =>
      new Response(JSON.stringify({ error: { message: "Rate limit reached" } }), {
        status: 429,
      })) as unknown as typeof fetch;
    const client = new GroqLlmClient("secret-key", "llama-3.3-70b-versatile", failing);
    await expect(client.generate({ system: "S", userText: "U" })).rejects.toThrow(
      /429.*Rate limit reached/,
    );
    await expect(client.generate({ system: "S", userText: "U" })).rejects.not.toThrow(/secret-key/);
  });
});

describe("nullableOptionals", () => {
  it("lets optional fields be null (Groq validates calls server-side) and leaves required ones", () => {
    expect(
      nullableOptionals({
        type: "object",
        properties: {
          name: { type: "string" },
          dosage: { type: "string" },
          amount: {
            type: "object",
            properties: {
              amountMinor: { type: "integer" },
              currency: { type: "string", enum: ["PHP"] },
            },
            required: ["amountMinor"],
          },
        },
        required: ["name", "amount"],
      }),
    ).toEqual({
      type: "object",
      properties: {
        name: { type: "string" },
        dosage: { type: ["string", "null"] },
        amount: {
          type: "object",
          properties: {
            amountMinor: { type: "integer" },
            currency: { type: ["string", "null"], enum: ["PHP", null] },
          },
          required: ["amountMinor"],
        },
      },
      required: ["name", "amount"],
    });
  });
});
