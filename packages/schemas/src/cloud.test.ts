import { describe, expect, it } from "vitest";
import {
  billingEventSchema,
  cloudAuditEventSchema,
  connectorTokenSchema,
  llmUsageEventSchema,
  profileSchema,
  quickAddQuotaSchema,
} from "./cloud";

const NOW = Date.UTC(2026, 9, 29, 8, 0);

describe("cloud contracts (story 14.1)", () => {
  it("accepts a Better Auth user id, which is not a UUID", () => {
    expect(
      profileSchema.parse({ userId: "k57abc123xyz", entitlement: "pro", updatedAt: NOW }),
    ).toEqual({ userId: "k57abc123xyz", entitlement: "pro", updatedAt: NOW });
    expect(() => profileSchema.parse({ userId: "", entitlement: "pro", updatedAt: NOW })).toThrow();
    expect(() =>
      profileSchema.parse({ userId: "u1", entitlement: "gold", updatedAt: NOW }),
    ).toThrow();
  });

  it("stores connector tokens only as ciphertext with a key version", () => {
    const row = {
      userId: "u1",
      provider: "google",
      ciphertext: "Y2lwaGVy",
      iv: "aXY=",
      keyVersion: 1,
      expiresAt: NOW,
      updatedAt: NOW,
    };
    expect(connectorTokenSchema.parse(row)).toEqual(row);
    expect(() => connectorTokenSchema.parse({ ...row, provider: "dropbox" })).toThrow();
    expect(() => connectorTokenSchema.parse({ ...row, keyVersion: 0 })).toThrow();
  });

  it("audit events name the entity and action, never the contents", () => {
    const event = { userId: "u1", entity: "connector_token", action: "read", at: NOW };
    expect(cloudAuditEventSchema.parse(event)).toEqual(event);
    expect(() => cloudAuditEventSchema.parse({ ...event, entity: "notes" })).toThrow();
    expect(() => cloudAuditEventSchema.parse({ ...event, action: "x".repeat(65) })).toThrow();
  });

  it("billing events allow an anonymous (null) user", () => {
    const event = { eventId: "evt_1", userId: null, type: "RENEWAL", eventAt: NOW, applied: false };
    expect(billingEventSchema.parse(event)).toEqual(event);
  });

  it("usage records token counts only and a quota counts per day", () => {
    expect(
      llmUsageEventSchema.parse({
        userId: "u1",
        feature: "quick-add",
        inputTokens: 120,
        outputTokens: 30,
        at: NOW,
      }).feature,
    ).toBe("quick-add");
    expect(() =>
      llmUsageEventSchema.parse({
        userId: "u1",
        feature: "quick-add",
        inputTokens: -1,
        outputTokens: 0,
        at: NOW,
      }),
    ).toThrow();
    expect(quickAddQuotaSchema.parse({ userId: "u1", date: "2026-10-29", count: 3 }).count).toBe(3);
    expect(() =>
      quickAddQuotaSchema.parse({ userId: "u1", date: "29/10/2026", count: 3 }),
    ).toThrow();
  });
});
