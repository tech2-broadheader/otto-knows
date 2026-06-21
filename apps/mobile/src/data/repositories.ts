// Typed repositories: create / get / list / update / delete per entity.
//
// WRITES parse input through the entity's Zod schema BEFORE persisting.
// READS return Zod-validated typed entities.
// SENSITIVE entities (finance/health) encrypt sensitive fields on write,
// decrypt on read, and append an AuditEntry for every access.
// Source-backed reads are gated behind requireConsent().
//
// This module imports the db client (native expo-sqlite) and so is NOT covered
// by the Node unit tests; the logic it composes (mappers, encryption core,
// consent + audit decisions) is pure and tested in isolation.
import { and, eq } from "drizzle-orm";
import {
  auditEntrySchema,
  billSchema,
  budgetCategorySchema,
  calendarEventSchema,
  consentSchema,
  contextItemSchema,
  incomeSchema,
  medicationSchema,
  reminderSchema,
  routineSchema,
  routineAnchorSchema,
  transactionSchema,
  type Bill,
  type BudgetCategory,
  type CalendarEvent,
  type Consent,
  type ContextItem,
  type DataSource,
  type Income,
  type Medication,
  type Reminder,
  type Routine,
  type RoutineAnchor,
  type Transaction,
} from "@otto/schemas";
import { getDatabase } from "../db/client";
import { newUuid } from "../lib/id";
import { tables } from "../db/schema";
import type { EncryptionProvider } from "../security/encryption";
import { requireConsent } from "../security/consent";
import { buildAuditEntry, shouldAudit, type AuditContext } from "../security/audit";
import {
  billFromRow,
  billToRow,
  budgetCategoryFromRow,
  budgetCategoryToRow,
  calendarEventFromRow,
  calendarEventToRow,
  consentFromRow,
  consentToRow,
  contextItemFromRow,
  contextItemToRow,
  incomeFromRow,
  incomeToRow,
  medicationFromRow,
  medicationToRow,
  reminderFromRow,
  reminderToRow,
  routineFromRow,
  routineToRow,
  anchorFromRow,
  anchorToRow,
  transactionFromRow,
  transactionToRow,
} from "./mappers";

/** Side-effect ports the sensitive repositories need (injected, testable). */
export interface RepositoryDeps {
  encryption: EncryptionProvider;
  /** Returns the current consent records for the given user. */
  loadConsents: (userId: string) => Promise<readonly Consent[]>;
  /** Persist an audit entry (validated against auditEntrySchema). */
  writeAudit: (ctx: AuditContext) => Promise<void>;
}

// --- non-sensitive repositories ---------------------------------------------

export const reminderRepository = {
  async create(input: Reminder): Promise<Reminder> {
    const entity = reminderSchema.parse(input);
    getDatabase().insert(tables.reminders).values(reminderToRow(entity)).run();
    return entity;
  },
  async get(id: string): Promise<Reminder | undefined> {
    const row = getDatabase()
      .select()
      .from(tables.reminders)
      .where(eq(tables.reminders.id, id))
      .get();
    return row ? reminderSchema.parse(reminderFromRow(row)) : undefined;
  },
  async list(userId: string): Promise<Reminder[]> {
    const rows = getDatabase()
      .select()
      .from(tables.reminders)
      .where(eq(tables.reminders.userId, userId))
      .all();
    return rows.map((r) => reminderSchema.parse(reminderFromRow(r)));
  },
  async update(input: Reminder): Promise<Reminder> {
    const entity = reminderSchema.parse(input);
    getDatabase()
      .update(tables.reminders)
      .set(reminderToRow(entity))
      .where(eq(tables.reminders.id, entity.id))
      .run();
    return entity;
  },
  async delete(id: string): Promise<void> {
    getDatabase().delete(tables.reminders).where(eq(tables.reminders.id, id)).run();
  },
};

/**
 * Routine repository (story 2.1). One routine per user; its anchors live in the
 * routine_anchors table keyed by routineId. Writes validate the routine via
 * routineSchema and each anchor via routineAnchorSchema; reads return validated
 * entities with anchors re-attached. Non-sensitive — no encryption or audit.
 */
export const routineRepository = {
  /** Persist a new routine and its anchors. */
  async create(input: Routine): Promise<Routine> {
    const entity = routineSchema.parse(input);
    const db = getDatabase();
    db.insert(tables.routine).values(routineToRow(entity)).run();
    for (const anchor of entity.anchors) {
      db.insert(tables.routineAnchors).values(anchorToRow(anchor, entity.id)).run();
    }
    return entity;
  },
  /** The user's routine (with anchors), or undefined if none set yet. */
  async getForUser(userId: string): Promise<Routine | undefined> {
    const db = getDatabase();
    const row = db.select().from(tables.routine).where(eq(tables.routine.userId, userId)).get();
    if (!row) return undefined;
    const anchorRows = db
      .select()
      .from(tables.routineAnchors)
      .where(eq(tables.routineAnchors.routineId, row.id))
      .all();
    const anchors = anchorRows.map((a) => routineAnchorSchema.parse(anchorFromRow(a)));
    return routineSchema.parse(routineFromRow(row, anchors));
  },
  /** Replace the routine record and its full anchor set (full upsert of anchors). */
  async update(input: Routine): Promise<Routine> {
    const entity = routineSchema.parse(input);
    const db = getDatabase();
    db.update(tables.routine)
      .set(routineToRow(entity))
      .where(eq(tables.routine.id, entity.id))
      .run();
    // Replace anchors wholesale: delete this routine's anchors, re-insert.
    db.delete(tables.routineAnchors).where(eq(tables.routineAnchors.routineId, entity.id)).run();
    for (const anchor of entity.anchors) {
      db.insert(tables.routineAnchors).values(anchorToRow(anchor, entity.id)).run();
    }
    return entity;
  },
  /** Add a single anchor to an existing routine. */
  async addAnchor(routineId: string, input: RoutineAnchor): Promise<RoutineAnchor> {
    const anchor = routineAnchorSchema.parse(input);
    getDatabase().insert(tables.routineAnchors).values(anchorToRow(anchor, routineId)).run();
    return anchor;
  },
  /** Update a single anchor in place. */
  async updateAnchor(routineId: string, input: RoutineAnchor): Promise<RoutineAnchor> {
    const anchor = routineAnchorSchema.parse(input);
    getDatabase()
      .update(tables.routineAnchors)
      .set(anchorToRow(anchor, routineId))
      .where(eq(tables.routineAnchors.id, anchor.id))
      .run();
    return anchor;
  },
  /** Remove a single anchor. */
  async deleteAnchor(anchorId: string): Promise<void> {
    getDatabase().delete(tables.routineAnchors).where(eq(tables.routineAnchors.id, anchorId)).run();
  },
};

export const budgetCategoryRepository = {
  async create(input: BudgetCategory): Promise<BudgetCategory> {
    const entity = budgetCategorySchema.parse(input);
    getDatabase().insert(tables.budgetCategories).values(budgetCategoryToRow(entity)).run();
    return entity;
  },
  async get(id: string): Promise<BudgetCategory | undefined> {
    const row = getDatabase()
      .select()
      .from(tables.budgetCategories)
      .where(eq(tables.budgetCategories.id, id))
      .get();
    return row ? budgetCategorySchema.parse(budgetCategoryFromRow(row)) : undefined;
  },
  async list(userId: string): Promise<BudgetCategory[]> {
    const rows = getDatabase()
      .select()
      .from(tables.budgetCategories)
      .where(eq(tables.budgetCategories.userId, userId))
      .all();
    return rows.map((r) => budgetCategorySchema.parse(budgetCategoryFromRow(r)));
  },
  async update(input: BudgetCategory): Promise<BudgetCategory> {
    const entity = budgetCategorySchema.parse(input);
    getDatabase()
      .update(tables.budgetCategories)
      .set(budgetCategoryToRow(entity))
      .where(eq(tables.budgetCategories.id, entity.id))
      .run();
    return entity;
  },
  async delete(id: string): Promise<void> {
    getDatabase().delete(tables.budgetCategories).where(eq(tables.budgetCategories.id, id)).run();
  },
};

export const consentRepository = {
  async create(input: Consent): Promise<Consent> {
    const entity = consentSchema.parse(input);
    getDatabase().insert(tables.consents).values(consentToRow(entity)).run();
    return entity;
  },
  async list(userId: string): Promise<Consent[]> {
    const rows = getDatabase()
      .select()
      .from(tables.consents)
      .where(eq(tables.consents.userId, userId))
      .all();
    return rows.map((r) => consentSchema.parse(consentFromRow(r)));
  },
  async update(input: Consent): Promise<Consent> {
    const entity = consentSchema.parse(input);
    getDatabase()
      .update(tables.consents)
      .set(consentToRow(entity))
      .where(eq(tables.consents.id, entity.id))
      .run();
    return entity;
  },
  async delete(id: string): Promise<void> {
    getDatabase().delete(tables.consents).where(eq(tables.consents.id, id)).run();
  },
};

/** Persist a validated audit entry to the audit_entries table (append-only). */
export async function persistAuditEntry(ctx: AuditContext): Promise<void> {
  const entry = auditEntrySchema.parse(buildAuditEntry(ctx));
  getDatabase()
    .insert(tables.auditEntries)
    .values({
      id: entry.id,
      userId: entry.userId,
      entity: entry.entity,
      entityId: entry.entityId ?? null,
      action: entry.action,
      actor: entry.actor,
      at: entry.at,
      note: entry.note ?? null,
    })
    .run();
}

// --- source-backed read (consent-gated) -------------------------------------

/**
 * Calendar events are read from the `calendar` source — refuse the read unless a
 * granted, non-revoked consent record exists.
 */
export function makeCalendarEventRepository(deps: Pick<RepositoryDeps, "loadConsents">) {
  const SOURCE: DataSource = "calendar";
  return {
    async create(input: CalendarEvent): Promise<CalendarEvent> {
      const entity = calendarEventSchema.parse(input);
      getDatabase().insert(tables.calendarEvents).values(calendarEventToRow(entity)).run();
      return entity;
    },
    async list(userId: string): Promise<CalendarEvent[]> {
      requireConsent(await deps.loadConsents(userId), SOURCE);
      const rows = getDatabase()
        .select()
        .from(tables.calendarEvents)
        .where(eq(tables.calendarEvents.userId, userId))
        .all();
      return rows.map((r) => calendarEventSchema.parse(calendarEventFromRow(r)));
    },
    async delete(id: string): Promise<void> {
      getDatabase().delete(tables.calendarEvents).where(eq(tables.calendarEvents.id, id)).run();
    },
  };
}

/** Context items carry a `source`; gate reads on that source's consent. */
export function makeContextItemRepository(deps: Pick<RepositoryDeps, "loadConsents">) {
  return {
    async create(input: ContextItem): Promise<ContextItem> {
      const entity = contextItemSchema.parse(input);
      getDatabase().insert(tables.contextItems).values(contextItemToRow(entity)).run();
      return entity;
    },
    async listForSource(userId: string, source: DataSource): Promise<ContextItem[]> {
      requireConsent(await deps.loadConsents(userId), source);
      const rows = getDatabase()
        .select()
        .from(tables.contextItems)
        .where(and(eq(tables.contextItems.userId, userId), eq(tables.contextItems.source, source)))
        .all();
      return rows.map((r) => contextItemSchema.parse(contextItemFromRow(r)));
    },
  };
}

// --- SENSITIVE repositories (encrypt + audit) --------------------------------

function newId(): string {
  // Audit ids must be RFC-4122 UUIDs (auditEntrySchema.id is uuid). Hermes/Expo Go
  // has no globalThis.crypto.randomUUID, so use expo-crypto's native generator
  // (same as the UI edge). This file already imports native db, so that's fine.
  return newUuid();
}

function nowIso(): string {
  return new Date().toISOString();
}

export function makeBillRepository(deps: RepositoryDeps) {
  const ENTITY = "bill";
  async function audit(
    userId: string,
    entityId: string | undefined,
    action: AuditContext["action"],
  ): Promise<void> {
    if (!shouldAudit(ENTITY)) return;
    await deps.writeAudit({
      id: newId(),
      userId,
      entity: ENTITY,
      entityId,
      action,
      actor: "user",
      at: nowIso(),
    });
  }

  return {
    async create(input: Bill): Promise<Bill> {
      const entity = billSchema.parse(input);
      const amountMinor = await deps.encryption.encrypt(String(entity.amount.amountMinor));
      getDatabase().insert(tables.bills).values(billToRow(entity, { amountMinor })).run();
      await audit(entity.userId, entity.id, "write");
      return entity;
    },
    async get(userId: string, id: string): Promise<Bill | undefined> {
      const row = getDatabase().select().from(tables.bills).where(eq(tables.bills.id, id)).get();
      if (!row) return undefined;
      await audit(userId, id, "read");
      const openedAmount = await deps.encryption.decrypt(row.amountMinor);
      return billSchema.parse(billFromRow(row, openedAmount));
    },
    async list(userId: string): Promise<Bill[]> {
      const rows = getDatabase()
        .select()
        .from(tables.bills)
        .where(eq(tables.bills.userId, userId))
        .all();
      await audit(userId, undefined, "read");
      const out: Bill[] = [];
      for (const row of rows) {
        const openedAmount = await deps.encryption.decrypt(row.amountMinor);
        out.push(billSchema.parse(billFromRow(row, openedAmount)));
      }
      return out;
    },
    async update(input: Bill): Promise<Bill> {
      const entity = billSchema.parse(input);
      const amountMinor = await deps.encryption.encrypt(String(entity.amount.amountMinor));
      getDatabase()
        .update(tables.bills)
        .set(billToRow(entity, { amountMinor }))
        .where(eq(tables.bills.id, entity.id))
        .run();
      await audit(entity.userId, entity.id, "write");
      return entity;
    },
    async delete(userId: string, id: string): Promise<void> {
      getDatabase().delete(tables.bills).where(eq(tables.bills.id, id)).run();
      await audit(userId, id, "delete");
    },
  };
}

export function makeIncomeRepository(deps: RepositoryDeps) {
  const ENTITY = "income";
  async function audit(
    userId: string,
    entityId: string | undefined,
    action: AuditContext["action"],
  ): Promise<void> {
    if (!shouldAudit(ENTITY)) return;
    await deps.writeAudit({
      id: newId(),
      userId,
      entity: ENTITY,
      entityId,
      action,
      actor: "user",
      at: nowIso(),
    });
  }

  return {
    async create(input: Income): Promise<Income> {
      const entity = incomeSchema.parse(input);
      const amountMinor = await deps.encryption.encrypt(String(entity.amount.amountMinor));
      getDatabase().insert(tables.income).values(incomeToRow(entity, { amountMinor })).run();
      await audit(entity.userId, entity.id, "write");
      return entity;
    },
    async get(userId: string, id: string): Promise<Income | undefined> {
      const row = getDatabase().select().from(tables.income).where(eq(tables.income.id, id)).get();
      if (!row) return undefined;
      await audit(userId, id, "read");
      const openedAmount = await deps.encryption.decrypt(row.amountMinor);
      return incomeSchema.parse(incomeFromRow(row, openedAmount));
    },
    async list(userId: string): Promise<Income[]> {
      const rows = getDatabase()
        .select()
        .from(tables.income)
        .where(eq(tables.income.userId, userId))
        .all();
      await audit(userId, undefined, "read");
      const out: Income[] = [];
      for (const row of rows) {
        const openedAmount = await deps.encryption.decrypt(row.amountMinor);
        out.push(incomeSchema.parse(incomeFromRow(row, openedAmount)));
      }
      return out;
    },
    async update(input: Income): Promise<Income> {
      const entity = incomeSchema.parse(input);
      const amountMinor = await deps.encryption.encrypt(String(entity.amount.amountMinor));
      getDatabase()
        .update(tables.income)
        .set(incomeToRow(entity, { amountMinor }))
        .where(eq(tables.income.id, entity.id))
        .run();
      await audit(entity.userId, entity.id, "write");
      return entity;
    },
    async delete(userId: string, id: string): Promise<void> {
      getDatabase().delete(tables.income).where(eq(tables.income.id, id)).run();
      await audit(userId, id, "delete");
    },
  };
}

export function makeTransactionRepository(deps: RepositoryDeps) {
  const ENTITY = "transaction";
  async function audit(
    userId: string,
    entityId: string | undefined,
    action: AuditContext["action"],
  ): Promise<void> {
    if (!shouldAudit(ENTITY)) return;
    await deps.writeAudit({
      id: newId(),
      userId,
      entity: ENTITY,
      entityId,
      action,
      actor: "user",
      at: nowIso(),
    });
  }

  return {
    async create(input: Transaction): Promise<Transaction> {
      const entity = transactionSchema.parse(input);
      const amountMinor = await deps.encryption.encrypt(String(entity.amount.amountMinor));
      const description =
        entity.description === undefined ? null : await deps.encryption.encrypt(entity.description);
      getDatabase()
        .insert(tables.transactions)
        .values(transactionToRow(entity, { amountMinor, description }))
        .run();
      await audit(entity.userId, entity.id, "write");
      return entity;
    },
    async get(userId: string, id: string): Promise<Transaction | undefined> {
      const row = getDatabase()
        .select()
        .from(tables.transactions)
        .where(eq(tables.transactions.id, id))
        .get();
      if (!row) return undefined;
      await audit(userId, id, "read");
      const openedAmount = await deps.encryption.decrypt(row.amountMinor);
      const openedDescription =
        row.description === null ? null : await deps.encryption.decrypt(row.description);
      return transactionSchema.parse(transactionFromRow(row, openedAmount, openedDescription));
    },
    async list(userId: string): Promise<Transaction[]> {
      const rows = getDatabase()
        .select()
        .from(tables.transactions)
        .where(eq(tables.transactions.userId, userId))
        .all();
      await audit(userId, undefined, "read");
      const out: Transaction[] = [];
      for (const row of rows) {
        const openedAmount = await deps.encryption.decrypt(row.amountMinor);
        const openedDescription =
          row.description === null ? null : await deps.encryption.decrypt(row.description);
        out.push(transactionSchema.parse(transactionFromRow(row, openedAmount, openedDescription)));
      }
      return out;
    },
    async update(input: Transaction): Promise<Transaction> {
      const entity = transactionSchema.parse(input);
      const amountMinor = await deps.encryption.encrypt(String(entity.amount.amountMinor));
      const description =
        entity.description === undefined ? null : await deps.encryption.encrypt(entity.description);
      getDatabase()
        .update(tables.transactions)
        .set(transactionToRow(entity, { amountMinor, description }))
        .where(eq(tables.transactions.id, entity.id))
        .run();
      await audit(entity.userId, entity.id, "write");
      return entity;
    },
    async delete(userId: string, id: string): Promise<void> {
      getDatabase().delete(tables.transactions).where(eq(tables.transactions.id, id)).run();
      await audit(userId, id, "delete");
    },
  };
}

export function makeMedicationRepository(deps: RepositoryDeps) {
  const ENTITY = "medication";
  async function audit(
    userId: string,
    entityId: string | undefined,
    action: AuditContext["action"],
  ): Promise<void> {
    if (!shouldAudit(ENTITY)) return;
    await deps.writeAudit({
      id: newId(),
      userId,
      entity: ENTITY,
      entityId,
      action,
      actor: "user",
      at: nowIso(),
    });
  }

  return {
    async create(input: Medication): Promise<Medication> {
      const entity = medicationSchema.parse(input);
      const name = await deps.encryption.encrypt(entity.name);
      const dosage =
        entity.dosage === undefined ? null : await deps.encryption.encrypt(entity.dosage);
      getDatabase()
        .insert(tables.medications)
        .values(medicationToRow(entity, { name, dosage }))
        .run();
      await audit(entity.userId, entity.id, "write");
      return entity;
    },
    async get(userId: string, id: string): Promise<Medication | undefined> {
      const row = getDatabase()
        .select()
        .from(tables.medications)
        .where(eq(tables.medications.id, id))
        .get();
      if (!row) return undefined;
      await audit(userId, id, "read");
      const openedName = await deps.encryption.decrypt(row.name);
      const openedDosage = row.dosage === null ? null : await deps.encryption.decrypt(row.dosage);
      return medicationSchema.parse(medicationFromRow(row, openedName, openedDosage));
    },
    async list(userId: string): Promise<Medication[]> {
      const rows = getDatabase()
        .select()
        .from(tables.medications)
        .where(eq(tables.medications.userId, userId))
        .all();
      await audit(userId, undefined, "read");
      const out: Medication[] = [];
      for (const row of rows) {
        const openedName = await deps.encryption.decrypt(row.name);
        const openedDosage = row.dosage === null ? null : await deps.encryption.decrypt(row.dosage);
        out.push(medicationSchema.parse(medicationFromRow(row, openedName, openedDosage)));
      }
      return out;
    },
    async update(input: Medication): Promise<Medication> {
      const entity = medicationSchema.parse(input);
      const name = await deps.encryption.encrypt(entity.name);
      const dosage =
        entity.dosage === undefined ? null : await deps.encryption.encrypt(entity.dosage);
      getDatabase()
        .update(tables.medications)
        .set(medicationToRow(entity, { name, dosage }))
        .where(eq(tables.medications.id, entity.id))
        .run();
      await audit(entity.userId, entity.id, "write");
      return entity;
    },
    async delete(userId: string, id: string): Promise<void> {
      getDatabase().delete(tables.medications).where(eq(tables.medications.id, id)).run();
      await audit(userId, id, "delete");
    },
  };
}
