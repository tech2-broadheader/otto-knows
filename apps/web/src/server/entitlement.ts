import { eq } from "drizzle-orm";
import { getDb, isDbConfigured, schema } from "./db/client";
import type { Entitlement } from "./auth";

/**
 * Entitlement lookup (SERVER-ONLY). The DB is the source of truth: a `profiles`
 * row holds the user's tier. No row → free (free tier is local-first, ADR-002).
 * Injectable so routes/tests don't need a live database.
 */

export interface EntitlementStore {
  load(userId: string): Promise<Entitlement>;
}

export class DbEntitlementStore implements EntitlementStore {
  async load(userId: string): Promise<Entitlement> {
    const db = getDb();
    const rows = await db
      .select({ entitlement: schema.profiles.entitlement })
      .from(schema.profiles)
      .where(eq(schema.profiles.id, userId))
      .limit(1);
    return rows[0]?.entitlement ?? "free";
  }
}

let cached: EntitlementStore | null = null;

/** The production store, or null when no database is configured. */
export function getEntitlementStore(): EntitlementStore | null {
  if (cached) return cached;
  if (!isDbConfigured()) return null;
  cached = new DbEntitlementStore();
  return cached;
}
