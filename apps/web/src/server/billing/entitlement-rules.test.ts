import { describe, expect, it } from "vitest";
import { decideEntitlement, type BillingConfig, type RevenueCatEvent } from "./entitlement-rules";

const USER = "6f1c2b3a-1111-4111-8111-111111111111";
const NOW = 1_800_000_000_000;
const config: BillingConfig = { entitlementId: "pro", allowSandbox: false };

function event(type: string, extra: Partial<RevenueCatEvent> = {}): RevenueCatEvent {
  return {
    id: "evt-1",
    type,
    app_user_id: USER,
    entitlement_ids: ["pro"],
    expiration_at_ms: NOW + 30 * 86_400_000,
    event_timestamp_ms: NOW,
    environment: "PRODUCTION",
    ...extra,
  };
}

describe("decideEntitlement", () => {
  it.each([
    "INITIAL_PURCHASE",
    "RENEWAL",
    "UNCANCELLATION",
    "SUBSCRIPTION_EXTENDED",
    "REFUND_REVERSED",
    "PRODUCT_CHANGE",
  ])("grants pro on %s", (type) => {
    expect(decideEntitlement(event(type), "free", config)).toEqual({ next: "pro" });
  });

  it("grants lifetime for a purchase with no expiry", () => {
    const lifetime = event("NON_RENEWING_PURCHASE", { expiration_at_ms: null });
    expect(decideEntitlement(lifetime, "free", config)).toEqual({ next: "lifetime" });
  });

  it("removes access on EXPIRATION", () => {
    expect(decideEntitlement(event("EXPIRATION"), "pro", config)).toEqual({ next: "free" });
  });

  it("keeps access on a normal cancellation (access runs until expiry)", () => {
    expect(decideEntitlement(event("CANCELLATION"), "pro", config)).toEqual({
      skip: "no-change",
    });
  });

  it("removes access on a refund that already ended the period", () => {
    const refunded = event("CANCELLATION", { expiration_at_ms: NOW - 1000 });
    expect(decideEntitlement(refunded, "pro", config)).toEqual({ next: "free" });
  });

  it("removes lifetime when the lifetime purchase itself is refunded", () => {
    const refunded = event("CANCELLATION", { expiration_at_ms: null });
    expect(decideEntitlement(refunded, "lifetime", config)).toEqual({ next: "free" });
  });

  it("never lets subscription events downgrade or overwrite a lifetime user", () => {
    expect(decideEntitlement(event("EXPIRATION"), "lifetime", config)).toEqual({
      skip: "lifetime-kept",
    });
    expect(decideEntitlement(event("RENEWAL"), "lifetime", config)).toEqual({
      skip: "lifetime-kept",
    });
  });

  it("ignores events for other entitlements", () => {
    const other = event("INITIAL_PURCHASE", { entitlement_ids: ["family"] });
    expect(decideEntitlement(other, "free", config)).toEqual({ skip: "other-entitlement" });
  });

  it.each(["TEST", "BILLING_ISSUE", "SUBSCRIPTION_PAUSED", "TRANSFER"])(
    "makes no change on %s",
    (type) => {
      expect(decideEntitlement(event(type), "pro", config)).toEqual({ skip: "no-change" });
    },
  );

  it("ignores anonymous / non-UUID app user ids", () => {
    const anon = event("INITIAL_PURCHASE", { app_user_id: "$RCAnonymousID:abc123" });
    expect(decideEntitlement(anon, "free", config)).toEqual({ skip: "unknown-user" });
  });

  it("ignores sandbox events unless allowed", () => {
    const sandbox = event("INITIAL_PURCHASE", { environment: "SANDBOX" });
    expect(decideEntitlement(sandbox, "free", config)).toEqual({ skip: "sandbox" });
    expect(decideEntitlement(sandbox, "free", { ...config, allowSandbox: true })).toEqual({
      next: "pro",
    });
  });

  it("treats a missing entitlement list as not ours", () => {
    const none = event("INITIAL_PURCHASE", { entitlement_ids: undefined });
    expect(decideEntitlement(none, "free", config)).toEqual({ skip: "other-entitlement" });
  });
});
