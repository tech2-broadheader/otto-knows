import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fetchBrief, getApiBaseUrl, postEnvelope, quickAdd } from "./api-client";

const ORIGINAL = process.env.EXPO_PUBLIC_API_URL;

beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = "https://otto.example.com/";
});

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = ORIGINAL;
});

/** Build a stub fetch that resolves to a JSON Response with the given status. */
function jsonFetch(status: number, body: unknown): typeof fetch {
  return (async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    })) as unknown as typeof fetch;
}

describe("getApiBaseUrl", () => {
  it("trims a trailing slash", () => {
    expect(getApiBaseUrl()).toBe("https://otto.example.com");
  });
  it("returns null when unset", () => {
    delete process.env.EXPO_PUBLIC_API_URL;
    expect(getApiBaseUrl()).toBeNull();
  });
  it("returns null when blank", () => {
    process.env.EXPO_PUBLIC_API_URL = "   ";
    expect(getApiBaseUrl()).toBeNull();
  });
});

describe("postEnvelope — success", () => {
  it("unwraps a { data } envelope", async () => {
    const result = await postEnvelope<{ value: number }>(
      "/x",
      {},
      jsonFetch(200, { data: { value: 42 } }),
    );
    expect(result).toEqual({ ok: true, data: { value: 42 } });
  });
});

describe("postEnvelope — failure envelopes", () => {
  it("surfaces a typed error envelope (403)", async () => {
    const result = await postEnvelope(
      "/x",
      {},
      jsonFetch(403, { error: { code: "FORBIDDEN", message: "Pro only." } }),
    );
    expect(result).toEqual({ ok: false, code: "FORBIDDEN", message: "Pro only." });
  });

  it("surfaces a 429 rate-limit envelope", async () => {
    const result = await postEnvelope(
      "/x",
      {},
      jsonFetch(429, { error: { code: "RATE_LIMITED", message: "Slow down." } }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("RATE_LIMITED");
  });

  it("synthesizes a code from the status when the body has no error envelope", async () => {
    const result = await postEnvelope("/x", {}, jsonFetch(401, { something: "else" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("UNAUTHORIZED");
  });

  it("reports NOT_CONFIGURED when the base URL is unset (no fetch attempted)", async () => {
    delete process.env.EXPO_PUBLIC_API_URL;
    let called = false;
    const spy = (async () => {
      called = true;
      return new Response("{}");
    }) as unknown as typeof fetch;
    const result = await postEnvelope("/x", {}, spy);
    expect(called).toBe(false);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NOT_CONFIGURED");
  });

  it("reports NETWORK when fetch rejects", async () => {
    const failing = (async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    const result = await postEnvelope("/x", {}, failing);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NETWORK");
  });

  it("reports MALFORMED when the body is not JSON", async () => {
    const badJson = (async () =>
      new Response("not json", { status: 200 })) as unknown as typeof fetch;
    const result = await postEnvelope("/x", {}, badJson);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("MALFORMED");
  });
});

describe("quickAdd", () => {
  it("returns the validated proposals on success", async () => {
    const proposal = {
      id: "00000000-0000-4000-8000-000000000001",
      action: {
        type: "create_reminder",
        reminder: { title: "Pay Meralco" },
      },
      rationale: "You mentioned a bill.",
      status: "proposed",
    };
    const result = await quickAdd(
      "pay meralco",
      jsonFetch(200, { data: { proposals: [proposal] } }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.action.type).toBe("create_reminder");
    }
  });

  it("defaults to an empty proposal list when the payload omits it", async () => {
    const result = await quickAdd("hi", jsonFetch(200, { data: {} }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual([]);
  });

  it("reports MALFORMED when proposals fail schema validation", async () => {
    const result = await quickAdd(
      "x",
      jsonFetch(200, { data: { proposals: [{ id: "not-a-uuid" }] } }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("MALFORMED");
  });

  it("passes through a quota-exceeded 403", async () => {
    const result = await quickAdd(
      "x",
      jsonFetch(403, { error: { code: "FORBIDDEN", message: "Used today's free quick-adds." } }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
  });
});

describe("fetchBrief", () => {
  it("returns { briefing, proposals } on success", async () => {
    const body = { briefing: { summary: "Good morning." }, proposals: [] };
    const result = await fetchBrief(
      { slot: "morning", contextItems: [] },
      jsonFetch(200, { data: body }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.proposals).toEqual([]);
  });

  it("passes through a 401 so the UI can fall back / prompt sign-in", async () => {
    const result = await fetchBrief(
      { slot: "morning", contextItems: [] },
      jsonFetch(401, { error: { code: "UNAUTHORIZED", message: "Sign in." } }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("UNAUTHORIZED");
  });
});
