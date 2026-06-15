import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Drizzle/Postgres client (SERVER-ONLY) over the direct `DATABASE_URL` connection
 * (a server connection, so it bypasses RLS — never import this into client code).
 * Lazily created so importing the module doesn't open a connection at build time.
 * Reads `DATABASE_URL` directly (not the full typed config) so the DB layer works
 * even when unrelated config (e.g. the LLM key) is absent.
 */

export type Db = ReturnType<typeof drizzle<typeof schema>>;

let cached: Db | null = null;

/** True when a database connection string is configured. */
export function isDbConfigured(): boolean {
  return !!process.env.DATABASE_URL;
}

export function getDb(): Db {
  if (cached) return cached;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured");
  // One pooled connection per server instance.
  const sql = postgres(url, { prepare: false });
  cached = drizzle(sql, { schema });
  return cached;
}

export { schema };
