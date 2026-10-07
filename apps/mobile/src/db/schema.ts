// Drizzle sqlite-core table definitions mirroring the @otto/schemas Zod contracts.
//
// Conventions (matching the Zod shapes):
// - Money is split into `<field>AmountMinor` (integer, centavos) + `<field>Currency` (text).
// - Complex sub-objects (recurrence, time arrays, context meta, briefing items/nudges)
//   are stored as JSON in text columns and (de)serialized by the pure mappers.
// - Booleans are stored as integers (0/1) per SQLite convention.
// - SENSITIVE finance/health fields are stored ENCRYPTED (ciphertext text); see
//   src/security/encryption.ts and the repositories that wire it in.
// - This file is pure schema metadata; it imports no native modules, so mappers
//   and tests can reference column shapes without pulling in expo-sqlite.
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** Routine — the model of the user's day (anchors stored on their own table). */
export const routine = sqliteTable("routine", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  mode: text("mode").notNull().default("fixed"),
  timezone: text("timezone").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/** Routine anchors — single recurring moments in the day. */
export const routineAnchors = sqliteTable("routine_anchors", {
  id: text("id").primaryKey(),
  routineId: text("routine_id"),
  label: text("label").notNull(),
  kind: text("kind").notNull(),
  time: text("time").notNull(),
  // recurrence object serialized as JSON text
  recurrence: text("recurrence").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/** Reminders — routine-timed reminders. */
export const reminders = sqliteTable("reminders", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  notes: text("notes"),
  dueAt: text("due_at"),
  anchorId: text("anchor_id"),
  // recurrence object serialized as JSON text (nullable)
  recurrence: text("recurrence"),
  status: text("status").notNull().default("pending"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/** Medications — SENSITIVE (health). Name/dosage encrypted at rest. */
export const medications = sqliteTable("medications", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  // ENCRYPTED ciphertext
  name: text("name").notNull(),
  // ENCRYPTED ciphertext (nullable)
  dosage: text("dosage"),
  // HH:mm[] serialized as JSON text
  times: text("times").notNull(),
  // recurrence object serialized as JSON text
  recurrence: text("recurrence").notNull(),
  quantityRemaining: integer("quantity_remaining"),
  refillReminderAt: text("refill_reminder_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/** Bills — SENSITIVE (finance). Amount encrypted at rest. */
export const bills = sqliteTable("bills", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  // ENCRYPTED ciphertext of the minor-units amount
  amountMinor: text("amount_minor").notNull(),
  amountCurrency: text("amount_currency").notNull(),
  dueDate: text("due_date").notNull(),
  // recurrence object serialized as JSON text
  recurrence: text("recurrence").notNull(),
  isAutopay: integer("is_autopay").notNull().default(0),
  isPaid: integer("is_paid").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/** Income — SENSITIVE (finance). Amount encrypted at rest. */
export const income = sqliteTable("income", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  source: text("source").notNull(),
  // ENCRYPTED ciphertext of the minor-units amount
  amountMinor: text("amount_minor").notNull(),
  amountCurrency: text("amount_currency").notNull(),
  cadence: text("cadence").notNull(),
  nextPayDate: text("next_pay_date").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/** Transactions — SENSITIVE (finance). Amount + description encrypted at rest. */
export const transactions = sqliteTable("transactions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  // ENCRYPTED ciphertext of the minor-units amount
  amountMinor: text("amount_minor").notNull(),
  amountCurrency: text("amount_currency").notNull(),
  // expense | income | transfer (story 11.3; migration step 3, default expense).
  type: text("type").notNull(),
  // Wallet the money left (expense, transfer) or arrived in (income). Step 2.
  accountId: text("account_id"),
  // Transfers only: the wallet the money arrived in. Step 3.
  toAccountId: text("to_account_id"),
  categoryId: text("category_id"),
  // ENCRYPTED ciphertext (nullable)
  description: text("description"),
  occurredAt: text("occurred_at").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/** Wallets / accounts — SENSITIVE (finance). Opening balance encrypted at rest. */
export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  provider: text("provider"),
  // ENCRYPTED ciphertext of the signed minor-units opening balance; NULL = 0
  openingBalanceMinor: text("opening_balance_minor"),
  openingBalanceCurrency: text("opening_balance_currency").notNull(),
  archivedAt: text("archived_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/** Notes (story 12.1) — plain text, not sensitive-tier (like reminders). */
export const notes = sqliteTable("notes", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title"),
  body: text("body").notNull(),
  pinned: integer("pinned").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/** Appointments (story 12.4) — user-created; not sensitive-tier (like reminders). */
export const appointments = sqliteTable("appointments", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  startAt: text("start_at").notNull(),
  endAt: text("end_at").notNull(),
  location: text("location"),
  notes: text("notes"),
  remindMinutesBefore: integer("remind_minutes_before"),
  destination: text("destination").notNull(),
  externalId: text("external_id"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/** Budget categories — not sensitive (limit is a user-set target, not real money flow). */
export const budgetCategories = sqliteTable("budget_categories", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  // optional monthly limit money (nullable)
  monthlyLimitAmountMinor: integer("monthly_limit_amount_minor"),
  monthlyLimitCurrency: text("monthly_limit_currency"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/** Calendar events — read from a connected provider. */
export const calendarEvents = sqliteTable("calendar_events", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  provider: text("provider").notNull(),
  externalId: text("external_id").notNull(),
  title: text("title").notNull(),
  startAt: text("start_at").notNull(),
  endAt: text("end_at").notNull(),
  location: text("location"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/** Context items — the unified day-model projection. */
export const contextItems = sqliteTable("context_items", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  kind: text("kind").notNull(),
  refId: text("ref_id").notNull(),
  source: text("source").notNull(),
  title: text("title").notNull(),
  at: text("at").notNull(),
  // optional meta record serialized as JSON text
  meta: text("meta"),
});

/** Consents — granular, revocable per-source consent records. */
export const consents = sqliteTable("consents", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  source: text("source").notNull(),
  granted: integer("granted").notNull(),
  purpose: text("purpose").notNull(),
  policyVersion: text("policy_version").notNull(),
  grantedAt: text("granted_at"),
  revokedAt: text("revoked_at"),
});

/** Audit entries — append-only access log for sensitive entities. */
export const auditEntries = sqliteTable("audit_entries", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id"),
  action: text("action").notNull(),
  actor: text("actor").notNull(),
  at: text("at").notNull(),
  note: text("note"),
});

/** All tables, used by the client to build the schema object and DDL. */
export const tables = {
  routine,
  routineAnchors,
  reminders,
  medications,
  bills,
  income,
  transactions,
  accounts,
  notes,
  appointments,
  budgetCategories,
  calendarEvents,
  contextItems,
  consents,
  auditEntries,
} as const;
