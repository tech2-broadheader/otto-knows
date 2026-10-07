import { z } from "zod";
import type { Entitlement } from "@/server/auth";

/**
 * RevenueCat webhook → entitlement decision (SERVER-ONLY, story 9.5). Pure.
 *
 * Semantics follow RevenueCat's docs (verified 2026-10-08): EXPIRATION means
 * "access should be removed"; CANCELLATION means "canceled or refunded", so a
 * normal cancellation keeps access until EXPIRATION; `expiration_at_ms` is null
 * for lifetime / non-subscription purchases.
 */

/** Only the fields we act on; RevenueCat sends many more, which we ignore. */
export const revenueCatEventSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  app_user_id: z.string().min(1),
  entitlement_ids: z.array(z.string()).nullish(),
  expiration_at_ms: z.number().int().nullable(),
  event_timestamp_ms: z.number().int(),
  environment: z.string().min(1),
});
export type RevenueCatEvent = z.infer<typeof revenueCatEventSchema>;

export const revenueCatWebhookSchema = z.object({ event: revenueCatEventSchema });

export type BillingConfig = {
  /** Our entitlement identifier in RevenueCat (e.g. "pro"). */
  entitlementId: string;
  /** Apply SANDBOX (test-purchase) events — never in production. */
  allowSandbox: boolean;
};

export type EntitlementDecision =
  | { next: Entitlement }
  | {
      skip: "no-change" | "other-entitlement" | "unknown-user" | "sandbox" | "lifetime-kept";
    };

/** Events that mean the customer has (or regained) access. */
const GRANT_EVENTS = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "UNCANCELLATION",
  "NON_RENEWING_PURCHASE",
  "SUBSCRIPTION_EXTENDED",
  "REFUND_REVERSED",
  "PRODUCT_CHANGE",
]);

/** Supabase user ids are UUIDs; RevenueCat anonymous ids ("$RCAnonymousID:…") are not. */
const userIdSchema = z.string().uuid();

export function decideEntitlement(
  event: RevenueCatEvent,
  current: Entitlement,
  config: BillingConfig,
): EntitlementDecision {
  if (!userIdSchema.safeParse(event.app_user_id).success) return { skip: "unknown-user" };
  if (event.environment === "SANDBOX" && !config.allowSandbox) return { skip: "sandbox" };
  if (!event.entitlement_ids?.includes(config.entitlementId)) return { skip: "other-entitlement" };

  const isLifetimePurchase = event.expiration_at_ms === null;

  if (GRANT_EVENTS.has(event.type)) {
    if (current === "lifetime" && !isLifetimePurchase) return { skip: "lifetime-kept" };
    return { next: isLifetimePurchase ? "lifetime" : "pro" };
  }

  if (event.type === "EXPIRATION") {
    return current === "lifetime" ? { skip: "lifetime-kept" } : { next: "free" };
  }

  if (event.type === "CANCELLATION") {
    // Refund of the lifetime purchase itself removes lifetime.
    if (isLifetimePurchase) return { next: "free" };
    if (current === "lifetime") return { skip: "lifetime-kept" };
    // A refund cuts the period short; a plain cancellation runs to EXPIRATION.
    const accessEnded =
      event.expiration_at_ms !== null && event.expiration_at_ms <= event.event_timestamp_ms;
    return accessEnded ? { next: "free" } : { skip: "no-change" };
  }

  return { skip: "no-change" };
}
