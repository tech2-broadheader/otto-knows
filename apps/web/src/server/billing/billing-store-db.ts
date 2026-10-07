import { and, desc, eq } from "drizzle-orm";
import type { Entitlement } from "@/server/auth";
import { getDb, schema } from "@/server/db/client";
import type { BillingStore } from "./webhook";

/**
 * Postgres implementation of the billing store (SERVER-ONLY, story 9.5), over
 * the direct server connection. Only this webhook writes `profiles.entitlement`.
 */
export class DbBillingStore implements BillingStore {
  async recordEvent(e: {
    eventId: string;
    userId: string | null;
    type: string;
    eventAt: Date;
  }): Promise<"new" | "duplicate"> {
    const inserted = await getDb()
      .insert(schema.billingEvents)
      .values({ eventId: e.eventId, userId: e.userId, type: e.type, eventAt: e.eventAt })
      .onConflictDoNothing({ target: schema.billingEvents.eventId })
      .returning({ eventId: schema.billingEvents.eventId });
    return inserted.length > 0 ? "new" : "duplicate";
  }

  async lastAppliedAt(userId: string): Promise<Date | null> {
    const rows = await getDb()
      .select({ eventAt: schema.billingEvents.eventAt })
      .from(schema.billingEvents)
      .where(and(eq(schema.billingEvents.userId, userId), eq(schema.billingEvents.applied, true)))
      .orderBy(desc(schema.billingEvents.eventAt))
      .limit(1);
    return rows[0]?.eventAt ?? null;
  }

  async markApplied(eventId: string): Promise<void> {
    await getDb()
      .update(schema.billingEvents)
      .set({ applied: true })
      .where(eq(schema.billingEvents.eventId, eventId));
  }

  async currentEntitlement(userId: string): Promise<Entitlement> {
    const rows = await getDb()
      .select({ entitlement: schema.profiles.entitlement })
      .from(schema.profiles)
      .where(eq(schema.profiles.id, userId))
      .limit(1);
    return rows[0]?.entitlement ?? "free";
  }

  async setEntitlement(userId: string, entitlement: Entitlement): Promise<void> {
    const now = new Date();
    await getDb()
      .insert(schema.profiles)
      .values({ id: userId, entitlement, updatedAt: now })
      .onConflictDoUpdate({
        target: schema.profiles.id,
        set: { entitlement, updatedAt: now },
      });
  }

  async audit(userId: string, action: string): Promise<void> {
    await getDb().insert(schema.auditEvents).values({ userId, entity: "entitlement", action });
  }
}
