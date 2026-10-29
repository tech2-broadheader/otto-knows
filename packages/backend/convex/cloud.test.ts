import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";
import { FREE_QUICK_ADD_DAILY, RATE_MAX_PER_WINDOW, RATE_WINDOW_MS } from "./usage";
import { serverConfig } from "./lib/config";

const NOW = Date.UTC(2026, 9, 29, 8, 0, 0);

function setup() {
  return convexTest(schema, modules);
}

async function auditTrail(t: ReturnType<typeof setup>, userId: string) {
  return t.run((ctx) =>
    ctx.db
      .query("auditEvents")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect(),
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => {
  vi.useRealTimers();
});

describe("profiles (story 14.1)", () => {
  it("treats a user with no profile as free", async () => {
    const t = setup();
    expect(await t.query(internal.profiles.getEntitlement, { userId: "u1" })).toBe("free");
  });

  it("sets and updates the entitlement and audit-logs each change", async () => {
    const t = setup();
    await t.mutation(internal.profiles.setEntitlement, { userId: "u1", entitlement: "pro" });
    await t.mutation(internal.profiles.setEntitlement, { userId: "u1", entitlement: "lifetime" });
    expect(await t.query(internal.profiles.getEntitlement, { userId: "u1" })).toBe("lifetime");
    const profiles = await t.run((ctx) => ctx.db.query("profiles").collect());
    expect(profiles).toHaveLength(1);
    expect((await auditTrail(t, "u1")).map((e) => e.action)).toEqual(["set:pro", "set:lifetime"]);
  });

  it("rejects input that breaks the shared Zod contract", async () => {
    const t = setup();
    await expect(
      t.mutation(internal.profiles.setEntitlement, {
        userId: "",
        entitlement: "pro",
      }),
    ).rejects.toThrow();
    await expect(
      t.mutation(internal.profiles.setEntitlement, {
        userId: "u1",
        // @ts-expect-error — not an entitlement
        entitlement: "gold",
      }),
    ).rejects.toThrow();
  });
});

describe("connector tokens", () => {
  const token = {
    userId: "u1",
    provider: "google" as const,
    ciphertext: "Y2lwaGVy",
    iv: "aXY=",
    keyVersion: 1,
    expiresAt: NOW + 3_600_000,
  };

  it("stores one row per user and provider and audit-logs every access", async () => {
    const t = setup();
    await t.mutation(internal.connectorTokens.upsert, token);
    await t.mutation(internal.connectorTokens.upsert, { ...token, ciphertext: "bmV3" });
    expect(
      await t.mutation(internal.connectorTokens.read, { userId: "u1", provider: "google" }),
    ).toEqual({ ciphertext: "bmV3", iv: "aXY=", keyVersion: 1, expiresAt: token.expiresAt });
    await t.mutation(internal.connectorTokens.remove, { userId: "u1", provider: "google" });
    expect(
      await t.mutation(internal.connectorTokens.read, { userId: "u1", provider: "google" }),
    ).toBeNull();
    const trail = await auditTrail(t, "u1");
    expect(trail.map((e) => `${e.entity}:${e.action}`)).toEqual([
      "connector_token:write",
      "connector_token:write",
      "connector_token:read",
      "connector_token:delete",
      "connector_token:read",
    ]);
  });

  it("rejects an unknown provider", async () => {
    const t = setup();
    await expect(
      // @ts-expect-error — only google is a provider
      t.mutation(internal.connectorTokens.upsert, { ...token, provider: "dropbox" }),
    ).rejects.toThrow();
  });
});

describe("billing events", () => {
  it("records each event once, so redelivery is a no-op", async () => {
    const t = setup();
    const event = { eventId: "evt_1", userId: "u1", type: "RENEWAL", eventAt: NOW - 1000 };
    expect(await t.mutation(internal.billing.recordEvent, event)).toBe("new");
    expect(await t.mutation(internal.billing.recordEvent, event)).toBe("duplicate");
    expect(await t.run((ctx) => ctx.db.query("billingEvents").collect())).toHaveLength(1);
  });

  it("reports the newest applied event time", async () => {
    const t = setup();
    expect(await t.query(internal.billing.lastAppliedAt, { userId: "u1" })).toBeNull();
    await t.mutation(internal.billing.recordEvent, {
      eventId: "a",
      userId: "u1",
      type: "INITIAL_PURCHASE",
      eventAt: 100,
    });
    await t.mutation(internal.billing.recordEvent, {
      eventId: "b",
      userId: "u1",
      type: "RENEWAL",
      eventAt: 200,
    });
    await t.mutation(internal.billing.recordEvent, {
      eventId: "c",
      userId: "u1",
      type: "EXPIRATION",
      eventAt: 300,
    });
    await t.mutation(internal.billing.markApplied, { eventId: "a" });
    await t.mutation(internal.billing.markApplied, { eventId: "b" });
    expect(await t.query(internal.billing.lastAppliedAt, { userId: "u1" })).toBe(200);
  });

  it("accepts anonymous events and refuses to apply an unknown one", async () => {
    const t = setup();
    expect(
      await t.mutation(internal.billing.recordEvent, {
        eventId: "anon",
        userId: null,
        type: "TEST",
        eventAt: NOW,
      }),
    ).toBe("new");
    await expect(t.mutation(internal.billing.markApplied, { eventId: "nope" })).rejects.toThrow(
      /Unknown billing event/,
    );
  });
});

describe("usage, quota and rate limits", () => {
  it("allows the daily free quick-adds, then stops, and resets on a new day", async () => {
    const t = setup();
    const day = { userId: "u1", date: "2026-10-29" };
    const results = [];
    for (let i = 0; i <= FREE_QUICK_ADD_DAILY; i++) {
      results.push(await t.mutation(internal.usage.consumeQuickAdd, day));
    }
    expect(results.map((r) => r.allowed)).toEqual([true, true, true, true, true, false]);
    expect(results[0]?.remaining).toBe(FREE_QUICK_ADD_DAILY - 1);
    expect(
      (await t.mutation(internal.usage.consumeQuickAdd, { ...day, date: "2026-10-30" })).allowed,
    ).toBe(true);
  });

  it("rate-limits per minute window and frees up in the next window", async () => {
    const t = setup();
    for (let i = 0; i < RATE_MAX_PER_WINDOW; i++) {
      expect(await t.mutation(internal.usage.checkRateLimit, { userId: "u1" })).toBe(true);
    }
    expect(await t.mutation(internal.usage.checkRateLimit, { userId: "u1" })).toBe(false);
    // Another user has their own budget.
    expect(await t.mutation(internal.usage.checkRateLimit, { userId: "u2" })).toBe(true);
    vi.setSystemTime(NOW + RATE_WINDOW_MS);
    expect(await t.mutation(internal.usage.checkRateLimit, { userId: "u1" })).toBe(true);
  });

  it("records token counts only", async () => {
    const t = setup();
    await t.mutation(internal.usage.recordUsage, {
      userId: "u1",
      feature: "brief",
      inputTokens: 900,
      outputTokens: 120,
    });
    const rows = await t.run((ctx) => ctx.db.query("llmUsage").collect());
    expect(
      rows.map(({ userId, feature, inputTokens, outputTokens, at }) => ({
        userId,
        feature,
        inputTokens,
        outputTokens,
        at,
      })),
    ).toEqual([{ userId: "u1", feature: "brief", inputTokens: 900, outputTokens: 120, at: NOW }]);
  });
});

describe("serverConfig", () => {
  it("parses known variables and treats blanks as unset", () => {
    expect(serverConfig({ LLM_PROVIDER: "groq", GROQ_API_KEY: "k", GEMINI_API_KEY: "" })).toEqual({
      LLM_PROVIDER: "groq",
      GROQ_API_KEY: "k",
    });
  });

  it("names a bad variable without echoing its value", () => {
    expect(() => serverConfig({ LLM_PROVIDER: "secret-value" })).toThrow(/LLM_PROVIDER/);
    expect(() => serverConfig({ LLM_PROVIDER: "secret-value" })).not.toThrow(/secret-value/);
  });
});
