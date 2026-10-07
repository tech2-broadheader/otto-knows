import { createHash, timingSafeEqual } from "node:crypto";
import { fail, ok, parseJsonBody } from "@/lib/api";
import type { Entitlement } from "@/server/auth";
import {
  decideEntitlement,
  revenueCatWebhookSchema,
  type BillingConfig,
} from "./entitlement-rules";

/**
 * RevenueCat webhook handler (SERVER-ONLY, story 9.5). Entitlement is changed
 * ONLY here, from authenticated store events — never from the client
 * (CLAUDE.md §6: never trust client amounts / state).
 */

/** Persistence port; Drizzle in production (billing-store-db.ts), a fake in tests. */
export interface BillingStore {
  /** Record the event once; "duplicate" when its id was seen before. */
  recordEvent(e: {
    eventId: string;
    userId: string | null;
    type: string;
    eventAt: Date;
  }): Promise<"new" | "duplicate">;
  /** Timestamp of the latest event already applied for this user. */
  lastAppliedAt(userId: string): Promise<Date | null>;
  markApplied(eventId: string): Promise<void>;
  currentEntitlement(userId: string): Promise<Entitlement>;
  setEntitlement(userId: string, entitlement: Entitlement): Promise<void>;
  audit(userId: string, action: string): Promise<void>;
}

export type WebhookDeps = {
  store: BillingStore;
  config: BillingConfig & {
    /** Exact Authorization header value configured in the RevenueCat dashboard. */
    authHeader: string | undefined;
  };
};

/** Constant-time comparison; hashing first makes the lengths equal. */
function headersMatch(received: string, expected: string): boolean {
  const digest = (v: string): Buffer => createHash("sha256").update(v).digest();
  return timingSafeEqual(digest(received), digest(expected));
}

export async function handleRevenueCatWebhook(
  request: Request,
  deps: WebhookDeps,
): Promise<Response> {
  if (!deps.config.authHeader) {
    return fail("INTERNAL", "Billing webhook isn't configured.");
  }
  const received = request.headers.get("authorization");
  if (!received || !headersMatch(received, deps.config.authHeader)) {
    return fail("UNAUTHORIZED", "Invalid webhook authorization.");
  }

  const body = await parseJsonBody(request, revenueCatWebhookSchema);
  if (!body.ok) return body.response;
  const { event } = body.data;

  const eventAt = new Date(event.event_timestamp_ms);
  const decision = decideEntitlement(event, "free", deps.config);
  const userId = "skip" in decision && decision.skip === "unknown-user" ? null : event.app_user_id;

  const recorded = await deps.store.recordEvent({
    eventId: event.id,
    userId,
    type: event.type,
    eventAt,
  });
  // Duplicate delivery (RevenueCat is at-least-once): acknowledge, don't re-apply.
  if (recorded === "duplicate" || userId === null) return ok({ received: true });

  // Out-of-order delivery: never let an older event undo a newer one.
  const lastApplied = await deps.store.lastAppliedAt(userId);
  if (lastApplied && eventAt.getTime() < lastApplied.getTime()) {
    return ok({ received: true });
  }

  const current = await deps.store.currentEntitlement(userId);
  const final = decideEntitlement(event, current, deps.config);
  if ("next" in final) {
    if (final.next !== current) {
      await deps.store.setEntitlement(userId, final.next);
      await deps.store.audit(userId, `set:${final.next}`);
    }
    await deps.store.markApplied(event.id);
  }
  return ok({ received: true });
}
