// The ordered list of on-device schema steps (ADR-004).
//
// RULES — read before editing:
// - A shipped step is IMMUTABLE. Every schema change is a NEW step appended at the
//   end with the next version number; never edit or reorder an existing one.
// - Each step runs in one transaction with its user_version bump (migrations.ts).
// - SQLite ALTER TABLE limits: ADD COLUMN with NOT NULL needs a DEFAULT; dropping
//   or retyping a column needs a table rebuild (create new, copy, drop, rename).
// - New tables must also be added to ALL_TABLE_NAMES so data wipe covers them.
// PURE — no native imports, so Node tests can run every step against node:sqlite.
import type { Migration } from "./migrations";

/**
 * Step 1 — baseline: the schema as it shipped before versioned migrations, kept
 * verbatim. On a pre-migration install (tables exist, user_version 0) every
 * statement is a no-op thanks to IF NOT EXISTS, so existing rows are untouched.
 */
const BASELINE: Migration = {
  version: 1,
  name: "baseline",
  statements: [
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
  ],
};

/** Timestamp in the ISO-with-offset shape isoDateTimeSchema expects. */
const SQL_NOW = "strftime('%Y-%m-%dT%H:%M:%S+00:00', 'now')";

/**
 * Step 2 — wallets (story 11.2, ADR-004). Creates `accounts`, links transactions
 * to a wallet, and moves every existing transaction into a default "Cash" wallet.
 * Ids are inlined literals (DEFAULT_CASH_ACCOUNT_ID / LOCAL_USER_ID in
 * lib/constants.ts) so this shipped step never changes if a constant does.
 * opening_balance_minor is NULL (= 0) because SQL cannot encrypt; the repository
 * encrypts any real opening balance.
 */
const ACCOUNTS: Migration = {
  version: 2,
  name: "accounts",
  statements: [
    `CREATE TABLE accounts (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      provider TEXT,
      opening_balance_minor TEXT,
      opening_balance_currency TEXT NOT NULL DEFAULT 'PHP',
      archived_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`,
    "ALTER TABLE transactions ADD COLUMN account_id TEXT;",
    `INSERT INTO accounts (id, user_id, name, type, created_at, updated_at)
      VALUES ('00000000-0000-4000-8000-0000000000ca', '00000000-0000-4000-8000-000000000001',
              'Cash', 'cash', ${SQL_NOW}, ${SQL_NOW});`,
    "UPDATE transactions SET account_id = '00000000-0000-4000-8000-0000000000ca' WHERE account_id IS NULL;",
  ],
};

/**
 * Step 3 — transaction types (story 11.3). Existing rows become expenses (the
 * only kind there was); NOT NULL needs the DEFAULT for ADD COLUMN in SQLite.
 */
const TRANSACTION_TYPES: Migration = {
  version: 3,
  name: "transaction-types",
  statements: [
    "ALTER TABLE transactions ADD COLUMN type TEXT NOT NULL DEFAULT 'expense';",
    "ALTER TABLE transactions ADD COLUMN to_account_id TEXT;",
  ],
};

/** Step 4 — notes (story 12.1). Plain text, not sensitive-tier (like reminders). */
const NOTES: Migration = {
  version: 4,
  name: "notes",
  statements: [
    `CREATE TABLE notes (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      title TEXT,
      body TEXT NOT NULL,
      pinned INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`,
  ],
};

/**
 * Step 5 — appointments (story 12.4). Own table, separate from synced provider
 * events, so a calendar sync can never delete what the user created.
 */
const APPOINTMENTS: Migration = {
  version: 5,
  name: "appointments",
  statements: [
    `CREATE TABLE appointments (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      start_at TEXT NOT NULL,
      end_at TEXT NOT NULL,
      location TEXT,
      notes TEXT,
      remind_minutes_before INTEGER,
      destination TEXT NOT NULL DEFAULT 'otto',
      external_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`,
  ],
};

/**
 * Step 6 — home currency, locale and timezone (story 13.1, ADR-007). Installs
 * that already hold money data were all Philippine (PHP-only before this step),
 * so they keep PHP / en-PH / Asia/Manila. Fresh installs get no row; the app
 * fills it from the device locale on first run.
 */
const USER_SETTINGS: Migration = {
  version: 6,
  name: "user-settings",
  statements: [
    `CREATE TABLE user_settings (
      user_id TEXT PRIMARY KEY NOT NULL,
      currency TEXT NOT NULL,
      locale TEXT NOT NULL,
      timezone TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`,
    `INSERT INTO user_settings (user_id, currency, locale, timezone, updated_at)
      SELECT '00000000-0000-4000-8000-000000000001', 'PHP', 'en-PH', 'Asia/Manila', ${SQL_NOW}
      WHERE EXISTS (SELECT 1 FROM transactions)
         OR EXISTS (SELECT 1 FROM income)
         OR EXISTS (SELECT 1 FROM bills)
         OR EXISTS (SELECT 1 FROM accounts WHERE opening_balance_minor IS NOT NULL);`,
  ],
};

/** Step 7 — the user's two semi-monthly pay days (story 13.5); NULL = infer. */
const INCOME_PAY_DAYS: Migration = {
  version: 7,
  name: "income-pay-days",
  statements: ["ALTER TABLE income ADD COLUMN pay_days TEXT;"],
};

export const MIGRATIONS: readonly Migration[] = [
  BASELINE,
  ACCOUNTS,
  TRANSACTION_TYPES,
  NOTES,
  APPOINTMENTS,
  USER_SETTINGS,
  INCOME_PAY_DAYS,
];

/** Derived from the list — never hand-maintained. */
export const LATEST_SCHEMA_VERSION = MIGRATIONS.length;

/** Every table the migrations create — used by wipeAllData() (DPA erasure). */
export const ALL_TABLE_NAMES: readonly string[] = [
  "routine",
  "routine_anchors",
  "reminders",
  "medications",
  "bills",
  "income",
  "transactions",
  "budget_categories",
  "calendar_events",
  "context_items",
  "consents",
  "audit_entries",
  "accounts",
  "notes",
  "appointments",
  "user_settings",
];
