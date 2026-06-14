// PURE row <-> entity mappers. No native imports — unit-testable in Node.
//
// Responsibilities:
// - Serialize/deserialize JSON sub-objects (recurrence, time arrays, meta).
// - Split/join money (amountMinor + currency).
// - Convert booleans <-> 0/1.
//
// Sensitive-field encryption is NOT done here (that needs async crypto). Instead
// the repository pre-encrypts sensitive strings and passes them in via the
// `Sealed*` inputs, and supplies decrypted plaintext via the `Opened*` inputs on
// the way out. With identity transforms these mappers round-trip losslessly,
// which is exactly what the unit tests assert.
import type {
  Bill,
  BudgetCategory,
  CalendarEvent,
  Consent,
  ContextItem,
  Income,
  Medication,
  Recurrence,
  Reminder,
  Routine,
  RoutineAnchor,
  RoutineMode,
  Transaction,
} from "@otto/schemas";

// --- small pure helpers -----------------------------------------------------

function toBit(value: boolean): number {
  return value ? 1 : 0;
}
function fromBit(value: number): boolean {
  return value === 1;
}
function jsonOrNull<T>(value: T | undefined): string | null {
  return value === undefined ? null : JSON.stringify(value);
}
function parseJson<T>(value: string | null): T | undefined {
  return value === null ? undefined : (JSON.parse(value) as T);
}
function nullable<T>(value: T | undefined): T | null {
  return value === undefined ? null : value;
}
function optional<T>(value: T | null): T | undefined {
  return value === null ? undefined : value;
}

// --- routine anchor (non-sensitive) -----------------------------------------

export interface RoutineAnchorRow {
  id: string;
  routineId: string | null;
  label: string;
  kind: string;
  time: string;
  recurrence: string;
  createdAt: string;
  updatedAt: string;
}

export function anchorToRow(a: RoutineAnchor, routineId?: string): RoutineAnchorRow {
  return {
    id: a.id,
    routineId: nullable(routineId),
    label: a.label,
    kind: a.kind,
    time: a.time,
    recurrence: JSON.stringify(a.recurrence),
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}

export function anchorFromRow(r: RoutineAnchorRow): RoutineAnchor {
  return {
    id: r.id,
    label: r.label,
    kind: r.kind as RoutineAnchor["kind"],
    time: r.time,
    recurrence: JSON.parse(r.recurrence) as Recurrence,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

// --- routine (non-sensitive) -------------------------------------------------
// The routine record itself (id/mode/timezone/timestamps). Its `anchors` array
// is persisted separately in the routine_anchors table and re-attached by the
// repository on read, so the row mapper takes/returns the routine WITHOUT anchors.

export interface RoutineRow {
  id: string;
  userId: string;
  mode: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export function routineToRow(r: Routine): RoutineRow {
  return {
    id: r.id,
    userId: r.userId,
    mode: r.mode,
    timezone: r.timezone,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

/** Re-attach the anchors (loaded from routine_anchors) to rebuild the entity. */
export function routineFromRow(r: RoutineRow, anchors: RoutineAnchor[]): Routine {
  return {
    id: r.id,
    userId: r.userId,
    mode: r.mode as RoutineMode,
    timezone: r.timezone,
    anchors,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

// --- reminder (non-sensitive) ------------------------------------------------

export interface ReminderRow {
  id: string;
  userId: string;
  title: string;
  notes: string | null;
  dueAt: string | null;
  anchorId: string | null;
  recurrence: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export function reminderToRow(r: Reminder): ReminderRow {
  return {
    id: r.id,
    userId: r.userId,
    title: r.title,
    notes: nullable(r.notes),
    dueAt: nullable(r.dueAt),
    anchorId: nullable(r.anchorId),
    recurrence: jsonOrNull(r.recurrence),
    status: r.status,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export function reminderFromRow(r: ReminderRow): Reminder {
  return {
    id: r.id,
    userId: r.userId,
    title: r.title,
    notes: optional(r.notes),
    dueAt: optional(r.dueAt),
    anchorId: optional(r.anchorId),
    recurrence: parseJson<Recurrence>(r.recurrence),
    status: r.status as Reminder["status"],
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

// --- budget category (non-sensitive) -----------------------------------------

export interface BudgetCategoryRow {
  id: string;
  userId: string;
  name: string;
  monthlyLimitAmountMinor: number | null;
  monthlyLimitCurrency: string | null;
  createdAt: string;
  updatedAt: string;
}

export function budgetCategoryToRow(b: BudgetCategory): BudgetCategoryRow {
  return {
    id: b.id,
    userId: b.userId,
    name: b.name,
    monthlyLimitAmountMinor: b.monthlyLimit ? b.monthlyLimit.amountMinor : null,
    monthlyLimitCurrency: b.monthlyLimit ? b.monthlyLimit.currency : null,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  };
}

export function budgetCategoryFromRow(r: BudgetCategoryRow): BudgetCategory {
  const hasLimit = r.monthlyLimitAmountMinor !== null && r.monthlyLimitCurrency !== null;
  return {
    id: r.id,
    userId: r.userId,
    name: r.name,
    monthlyLimit: hasLimit
      ? {
          amountMinor: r.monthlyLimitAmountMinor as number,
          currency: r.monthlyLimitCurrency as "PHP",
        }
      : undefined,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

// --- calendar event (non-sensitive) ------------------------------------------

export interface CalendarEventRow {
  id: string;
  userId: string;
  provider: string;
  externalId: string;
  title: string;
  startAt: string;
  endAt: string;
  location: string | null;
  createdAt: string;
  updatedAt: string;
}

export function calendarEventToRow(e: CalendarEvent): CalendarEventRow {
  return {
    id: e.id,
    userId: e.userId,
    provider: e.provider,
    externalId: e.externalId,
    title: e.title,
    startAt: e.startAt,
    endAt: e.endAt,
    location: nullable(e.location),
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}

export function calendarEventFromRow(r: CalendarEventRow): CalendarEvent {
  return {
    id: r.id,
    userId: r.userId,
    provider: r.provider as CalendarEvent["provider"],
    externalId: r.externalId,
    title: r.title,
    startAt: r.startAt,
    endAt: r.endAt,
    location: optional(r.location),
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

// --- context item (non-sensitive) --------------------------------------------

export interface ContextItemRow {
  id: string;
  userId: string;
  kind: string;
  refId: string;
  source: string;
  title: string;
  at: string;
  meta: string | null;
}

export function contextItemToRow(c: ContextItem): ContextItemRow {
  return {
    id: c.id,
    userId: c.userId,
    kind: c.kind,
    refId: c.refId,
    source: c.source,
    title: c.title,
    at: c.at,
    meta: jsonOrNull(c.meta),
  };
}

export function contextItemFromRow(r: ContextItemRow): ContextItem {
  return {
    id: r.id,
    userId: r.userId,
    kind: r.kind as ContextItem["kind"],
    refId: r.refId,
    source: r.source as ContextItem["source"],
    title: r.title,
    at: r.at,
    meta: parseJson<Record<string, unknown>>(r.meta),
  };
}

// --- consent (non-sensitive) -------------------------------------------------

export interface ConsentRow {
  id: string;
  userId: string;
  source: string;
  granted: number;
  purpose: string;
  policyVersion: string;
  grantedAt: string | null;
  revokedAt: string | null;
}

export function consentToRow(c: Consent): ConsentRow {
  return {
    id: c.id,
    userId: c.userId,
    source: c.source,
    granted: toBit(c.granted),
    purpose: c.purpose,
    policyVersion: c.policyVersion,
    grantedAt: nullable(c.grantedAt),
    revokedAt: nullable(c.revokedAt),
  };
}

export function consentFromRow(r: ConsentRow): Consent {
  return {
    id: r.id,
    userId: r.userId,
    source: r.source as Consent["source"],
    granted: fromBit(r.granted),
    purpose: r.purpose,
    policyVersion: r.policyVersion,
    grantedAt: optional(r.grantedAt),
    revokedAt: optional(r.revokedAt),
  };
}

// --- SENSITIVE entities ------------------------------------------------------
// For these, the repository pre-encrypts the sensitive strings and passes them
// in via `sealed`; on the way out it supplies decrypted plaintext via `opened`.
// The mappers stay pure and round-trip with identity transforms (tests use
// identity: sealed.* = String(plaintext), opened.* = ciphertext-as-plaintext).

/** Sealed (encrypted) string values for a bill. */
export interface SealedBill {
  amountMinor: string;
}
export interface BillRow {
  id: string;
  userId: string;
  name: string;
  amountMinor: string;
  amountCurrency: string;
  dueDate: string;
  recurrence: string;
  isAutopay: number;
  isPaid: number;
  createdAt: string;
  updatedAt: string;
}

export function billToRow(b: Bill, sealed: SealedBill): BillRow {
  return {
    id: b.id,
    userId: b.userId,
    name: b.name,
    amountMinor: sealed.amountMinor,
    amountCurrency: b.amount.currency,
    dueDate: b.dueDate,
    recurrence: JSON.stringify(b.recurrence),
    isAutopay: toBit(b.isAutopay),
    isPaid: toBit(b.isPaid),
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  };
}

/** `openedAmountMinor` is the decrypted minor-units string. */
export function billFromRow(r: BillRow, openedAmountMinor: string): Bill {
  return {
    id: r.id,
    userId: r.userId,
    name: r.name,
    amount: {
      amountMinor: Number.parseInt(openedAmountMinor, 10),
      currency: r.amountCurrency as Bill["amount"]["currency"],
    },
    dueDate: r.dueDate,
    recurrence: JSON.parse(r.recurrence) as Recurrence,
    isAutopay: fromBit(r.isAutopay),
    isPaid: fromBit(r.isPaid),
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export interface SealedIncome {
  amountMinor: string;
}
export interface IncomeRow {
  id: string;
  userId: string;
  source: string;
  amountMinor: string;
  amountCurrency: string;
  cadence: string;
  nextPayDate: string;
  createdAt: string;
  updatedAt: string;
}

export function incomeToRow(i: Income, sealed: SealedIncome): IncomeRow {
  return {
    id: i.id,
    userId: i.userId,
    source: i.source,
    amountMinor: sealed.amountMinor,
    amountCurrency: i.amount.currency,
    cadence: i.cadence,
    nextPayDate: i.nextPayDate,
    createdAt: i.createdAt,
    updatedAt: i.updatedAt,
  };
}

export function incomeFromRow(r: IncomeRow, openedAmountMinor: string): Income {
  return {
    id: r.id,
    userId: r.userId,
    source: r.source,
    amount: {
      amountMinor: Number.parseInt(openedAmountMinor, 10),
      currency: r.amountCurrency as Income["amount"]["currency"],
    },
    cadence: r.cadence as Income["cadence"],
    nextPayDate: r.nextPayDate,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

/** Sealed values for a transaction: amount + optional description. */
export interface SealedTransaction {
  amountMinor: string;
  description: string | null;
}
export interface TransactionRow {
  id: string;
  userId: string;
  amountMinor: string;
  amountCurrency: string;
  categoryId: string | null;
  description: string | null;
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
}

export function transactionToRow(t: Transaction, sealed: SealedTransaction): TransactionRow {
  return {
    id: t.id,
    userId: t.userId,
    amountMinor: sealed.amountMinor,
    amountCurrency: t.amount.currency,
    categoryId: nullable(t.categoryId),
    description: sealed.description,
    occurredAt: t.occurredAt,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

export function transactionFromRow(
  r: TransactionRow,
  openedAmountMinor: string,
  openedDescription: string | null,
): Transaction {
  return {
    id: r.id,
    userId: r.userId,
    amount: {
      amountMinor: Number.parseInt(openedAmountMinor, 10),
      currency: r.amountCurrency as Transaction["amount"]["currency"],
    },
    categoryId: optional(r.categoryId),
    description: openedDescription === null ? undefined : openedDescription,
    occurredAt: r.occurredAt,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

/** Sealed values for a medication: name + optional dosage. */
export interface SealedMedication {
  name: string;
  dosage: string | null;
}
export interface MedicationRow {
  id: string;
  userId: string;
  name: string;
  dosage: string | null;
  times: string;
  recurrence: string;
  quantityRemaining: number | null;
  refillReminderAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function medicationToRow(m: Medication, sealed: SealedMedication): MedicationRow {
  return {
    id: m.id,
    userId: m.userId,
    name: sealed.name,
    dosage: sealed.dosage,
    times: JSON.stringify(m.times),
    recurrence: JSON.stringify(m.recurrence),
    quantityRemaining: nullable(m.quantityRemaining),
    refillReminderAt: nullable(m.refillReminderAt),
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  };
}

export function medicationFromRow(
  r: MedicationRow,
  openedName: string,
  openedDosage: string | null,
): Medication {
  const times = JSON.parse(r.times) as string[];
  return {
    id: r.id,
    userId: r.userId,
    name: openedName,
    dosage: openedDosage === null ? undefined : openedDosage,
    times: times as Medication["times"],
    recurrence: JSON.parse(r.recurrence) as Recurrence,
    quantityRemaining: optional(r.quantityRemaining),
    refillReminderAt: optional(r.refillReminderAt),
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}
