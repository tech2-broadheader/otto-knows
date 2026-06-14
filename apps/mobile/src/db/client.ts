// expo-sqlite + Drizzle client for the on-device store.
//
// This is the ONE module that touches the native expo-sqlite driver. Keep it
// isolated: pure logic (mappers, encryption core, consent/audit decisions) must
// NOT import this file, so that Node-based unit tests never load native modules.
//
// Schema-creation approach: we run idempotent `CREATE TABLE IF NOT EXISTS` DDL
// via ensureSchema() at app boot rather than drizzle-kit migration files. For a
// local-first free tier with a single forward-only schema, this is simpler than
// shipping migration assets through the Expo bundler. When the schema needs to
// evolve, switch to drizzle-kit generated migrations + the expo-sqlite migrator
// (drizzle-orm/expo-sqlite/migrator) and bump user_version. See README note in
// the repository report.
import { openDatabaseSync, type SQLiteDatabase } from "expo-sqlite";
import { drizzle } from "drizzle-orm/expo-sqlite";
import { tables } from "./schema";

export const DATABASE_NAME = "otto.db";

/** Forward-only DDL. Order is irrelevant — no FKs are enforced at the DB level. */
const CREATE_TABLE_STATEMENTS: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS routine (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    mode TEXT NOT NULL DEFAULT 'fixed',
    timezone TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS routine_anchors (
    id TEXT PRIMARY KEY NOT NULL,
    routine_id TEXT,
    label TEXT NOT NULL,
    kind TEXT NOT NULL,
    time TEXT NOT NULL,
    recurrence TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS reminders (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    notes TEXT,
    due_at TEXT,
    anchor_id TEXT,
    recurrence TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS medications (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    dosage TEXT,
    times TEXT NOT NULL,
    recurrence TEXT NOT NULL,
    quantity_remaining INTEGER,
    refill_reminder_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS bills (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    amount_minor TEXT NOT NULL,
    amount_currency TEXT NOT NULL,
    due_date TEXT NOT NULL,
    recurrence TEXT NOT NULL,
    is_autopay INTEGER NOT NULL DEFAULT 0,
    is_paid INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS income (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    source TEXT NOT NULL,
    amount_minor TEXT NOT NULL,
    amount_currency TEXT NOT NULL,
    cadence TEXT NOT NULL,
    next_pay_date TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    amount_minor TEXT NOT NULL,
    amount_currency TEXT NOT NULL,
    category_id TEXT,
    description TEXT,
    occurred_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS budget_categories (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    monthly_limit_amount_minor INTEGER,
    monthly_limit_currency TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS calendar_events (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    external_id TEXT NOT NULL,
    title TEXT NOT NULL,
    start_at TEXT NOT NULL,
    end_at TEXT NOT NULL,
    location TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS context_items (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    ref_id TEXT NOT NULL,
    source TEXT NOT NULL,
    title TEXT NOT NULL,
    at TEXT NOT NULL,
    meta TEXT
  );`,
  `CREATE TABLE IF NOT EXISTS consents (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    source TEXT NOT NULL,
    granted INTEGER NOT NULL,
    purpose TEXT NOT NULL,
    policy_version TEXT NOT NULL,
    granted_at TEXT,
    revoked_at TEXT
  );`,
  `CREATE TABLE IF NOT EXISTS audit_entries (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id TEXT,
    action TEXT NOT NULL,
    actor TEXT NOT NULL,
    at TEXT NOT NULL,
    note TEXT
  );`,
];

export type OttoDatabase = ReturnType<typeof drizzle<typeof tables>>;

let rawDb: SQLiteDatabase | undefined;
let db: OttoDatabase | undefined;

/** Open (once) and return the Drizzle-wrapped database handle. */
export function getDatabase(): OttoDatabase {
  if (!db) {
    rawDb = openDatabaseSync(DATABASE_NAME);
    db = drizzle(rawDb, { schema: tables });
  }
  return db;
}

/**
 * Create every table if it does not already exist. Idempotent — safe to call on
 * each app boot. Must run before any repository read/write.
 */
export function ensureSchema(): void {
  const handle = rawDb ?? openDatabaseSync(DATABASE_NAME);
  rawDb = handle;
  for (const statement of CREATE_TABLE_STATEMENTS) {
    handle.execSync(statement);
  }
}
