// expo-sqlite + Drizzle client for the on-device store.
//
// This is the ONE module that touches the native expo-sqlite driver. Keep it
// isolated: pure logic (mappers, encryption core, consent/audit decisions, the
// migrator) must NOT import this file, so that Node-based unit tests never load
// native modules.
//
// Schema evolution (ADR-004): the schema is built and upgraded by ordered,
// versioned steps in migration-steps.ts, tracked in SQLite `PRAGMA user_version`
// and applied by the pure migrator in migrations.ts. This file only adapts the
// expo-sqlite handle to that migrator.
import { openDatabaseSync, type SQLiteDatabase } from "expo-sqlite";
import { drizzle } from "drizzle-orm/expo-sqlite";
import { tables } from "./schema";
import { runMigrations, type MigrationResult } from "./migrations";
import { ALL_TABLE_NAMES, MIGRATIONS } from "./migration-steps";

export const DATABASE_NAME = "otto.db";

export type OttoDatabase = ReturnType<typeof drizzle<typeof tables>>;

let rawDb: SQLiteDatabase | undefined;
let db: OttoDatabase | undefined;

/** Open (once) and return the Drizzle-wrapped database handle. */
export function getDatabase(): OttoDatabase {
  if (!db) {
    db = drizzle(getRawDatabase(), { schema: tables });
  }
  return db;
}

/** Lazily open the raw expo-sqlite handle shared by Drizzle, migrations and wipe. */
function getRawDatabase(): SQLiteDatabase {
  rawDb ??= openDatabaseSync(DATABASE_NAME);
  return rawDb;
}

/**
 * Bring the on-device schema up to date. Must run (and succeed) before any
 * repository read/write. Never throws: open/read failures, failed steps and a
 * database from a newer app build all come back as a typed MigrationResult.
 */
export function migrateDatabase(): MigrationResult {
  let handle: SQLiteDatabase;
  try {
    handle = getRawDatabase();
  } catch (cause) {
    return { ok: false, error: { kind: "open-failed", cause } };
  }
  return runMigrations(
    {
      exec: (sql) => handle.execSync(sql),
      getUserVersion: () =>
        handle.getFirstSync<{ user_version: number }>("PRAGMA user_version")?.user_version ?? 0,
      transaction: (fn) => handle.withTransactionSync(fn),
    },
    MIGRATIONS,
  );
}

/**
 * Delete every row from every table (account/data deletion — DPA erasure). The
 * schema (empty tables) and its user_version remain so the app keeps working and
 * no migration re-runs; on next boot, with no routine, the app returns to onboarding.
 */
export function wipeAllData(): void {
  const handle = getRawDatabase();
  for (const table of ALL_TABLE_NAMES) {
    handle.execSync(`DELETE FROM ${table};`);
  }
}
