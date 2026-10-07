import { describe, expect, it } from "vitest";
import type { Entitlement } from "@/server/auth";
import { handleRevenueCatWebhook, type BillingStore, type WebhookDeps } from "./webhook";

const USER = "6f1c2b3a-1111-4111-8111-111111111111";
const AUTH = "Bearer s3cret-webhook-token";
const NOW = 1_800_000_000_000;

class FakeStore implements BillingStore {
  readonly events = new Map<string, { applied: boolean; eventAt: Date; userId: string | null }>();
  readonly entitlements = new Map<string, Entitlement>();
  readonly audits: { userId: string; action: string }[] = [];

  async recordEvent(e: { eventId: string; userId: string | null; type: string; eventAt: Date }) {
    if (this.events.has(e.eventId)) return "duplicate" as const;
    this.events.set(e.eventId, { applied: false, eventAt: e.eventAt, userId: e.userId });
    return "new" as const;
  }
  async lastAppliedAt(userId: string): Promise<Date | null> {
    const applied = [...this.events.values()].filter((e) => e.applied && e.userId === userId);
    return applied.length ? new Date(Math.max(...applied.map((e) => e.eventAt.getTime()))) : null;
  }
  async markApplied(eventId: string): Promise<void> {
    const e = this.events.get(eventId);
    if (e) e.applied = true;
  }
  async currentEntitlement(userId: string): Promise<Entitlement> {
    return this.entitlements.get(userId) ?? "free";
  }
  async setEntitlement(userId: string, entitlement: Entitlement): Promise<void> {
    this.entitlements.set(userId, entitlement);
  }
  async audit(userId: string, action: string): Promise<void> {
    this.audits.push({ userId, action });
  }
}

function deps(store = new FakeStore()): WebhookDeps & { store: FakeStore } {
  return {
    store,
    config: { authHeader: AUTH, entitlementId: "pro", allowSandbox: false },
  };
}

function request(body: unknown, auth: string | null = AUTH): Request {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (auth !== null) headers.authorization = auth;
  return new Request("http://localhost/api/billing/revenuecat", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function payload(id: string, type: string, eventAt = NOW, extra: object = {}) {
  return {
    api_version: "1.0",
    event: {
      id,
      type,
      app_user_id: USER,
      entitlement_ids: ["pro"],
      expiration_at_ms: eventAt + 30 * 86_400_000,
      event_timestamp_ms: eventAt,
      environment: "PRODUCTION",
      product_id: "otto_pro_monthly",
      ...extra,
    },
  };
}

describe("handleRevenueCatWebhook", () => {
  it("rejects a missing or wrong authorization header", async () => {
    const d = deps();
    expect(
      (await handleRevenueCatWebhook(request(payload("e1", "INITIAL_PURCHASE"), null), d)).status,
    ).toBe(401);
    expect(
      (await handleRevenueCatWebhook(request(payload("e1", "INITIAL_PURCHASE"), "Bearer nope"), d))
        .status,
    ).toBe(401);
    expect(d.store.entitlements.size).toBe(0);
  });

  it("refuses to run when no webhook secret is configured", async () => {
    const d = deps();
    const res = await handleRevenueCatWebhook(request(payload("e1", "INITIAL_PURCHASE")), {
      ...d,
      config: { ...d.config, authHeader: undefined },
    });
    expect(res.status).toBe(500);
  });

  it("rejects a malformed body", async () => {
    const res = await handleRevenueCatWebhook(request({ event: { type: "RENEWAL" } }), deps());
    expect(res.status).toBe(400);
  });

  it("grants Pro on a purchase and audit-logs it", async () => {
    const d = deps();
    const res = await handleRevenueCatWebhook(request(payload("e1", "INITIAL_PURCHASE")), d);
    expect(res.status).toBe(200);
    expect(d.store.entitlements.get(USER)).toBe("pro");
    expect(d.store.audits).toEqual([{ userId: USER, action: "set:pro" }]);
  });

  it("applies a duplicate delivery only once", async () => {
    const d = deps();
    await handleRevenueCatWebhook(request(payload("e1", "INITIAL_PURCHASE")), d);
    const res = await handleRevenueCatWebhook(request(payload("e1", "INITIAL_PURCHASE")), d);
    expect(res.status).toBe(200);
    expect(d.store.audits).toHaveLength(1);
  });

  it("records but does not apply an event older than the last applied one", async () => {
    const d = deps();
    await handleRevenueCatWebhook(request(payload("e2", "RENEWAL", NOW)), d);
    // An EXPIRATION from before that renewal arrives late.
    const res = await handleRevenueCatWebhook(request(payload("e1", "EXPIRATION", NOW - 5000)), d);
    expect(res.status).toBe(200);
    expect(d.store.entitlements.get(USER)).toBe("pro");
    expect(d.store.events.get("e1")?.applied).toBe(false);
  });

  it("removes Pro on expiration", async () => {
    const d = deps();
    await handleRevenueCatWebhook(request(payload("e1", "INITIAL_PURCHASE", NOW)), d);
    await handleRevenueCatWebhook(request(payload("e2", "EXPIRATION", NOW + 1000)), d);
    expect(d.store.entitlements.get(USER)).toBe("free");
  });

  it("acknowledges events it ignores so RevenueCat stops retrying", async () => {
    const d = deps();
    const res = await handleRevenueCatWebhook(request(payload("e1", "TEST")), d);
    expect(res.status).toBe(200);
    expect(d.store.events.has("e1")).toBe(true);
    expect(d.store.entitlements.size).toBe(0);
  });
});
