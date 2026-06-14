import { describe, expect, it } from "vitest";
import {
  billSchema,
  budgetCategorySchema,
  calendarEventSchema,
  consentSchema,
  contextItemSchema,
  incomeSchema,
  medicationSchema,
  reminderSchema,
  routineAnchorSchema,
  transactionSchema,
  type Bill,
  type BudgetCategory,
  type CalendarEvent,
  type Consent,
  type ContextItem,
  type Income,
  type Medication,
  type Reminder,
  type RoutineAnchor,
  type Transaction,
} from "@otto/schemas";
import {
  anchorFromRow,
  anchorToRow,
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
  transactionFromRow,
  transactionToRow,
} from "./mappers";

const T = "2026-06-14T08:00:00+08:00";
const ID = (n: number) =>
  `${n}${n}${n}${n}${n}${n}${n}${n}-${n}${n}${n}${n}-4${n}${n}${n}-8${n}${n}${n}-${n}${n}${n}${n}${n}${n}${n}${n}${n}${n}${n}${n}`;

describe("non-sensitive mappers round-trip (entity -> row -> entity)", () => {
  it("routine anchor", () => {
    const anchor: RoutineAnchor = routineAnchorSchema.parse({
      id: ID(1),
      label: "Lunch",
      kind: "meal",
      time: "12:30",
      recurrence: { freq: "daily" },
      createdAt: T,
      updatedAt: T,
    });
    expect(anchorFromRow(anchorToRow(anchor))).toEqual(anchor);
  });

  it("reminder with recurrence and notes", () => {
    const reminder: Reminder = reminderSchema.parse({
      id: ID(2),
      userId: ID(3),
      title: "Pay rent",
      notes: "GCash",
      dueAt: T,
      recurrence: { freq: "monthly", dayOfMonth: 1 },
      status: "pending",
      createdAt: T,
      updatedAt: T,
    });
    expect(reminderFromRow(reminderToRow(reminder))).toEqual(reminder);
  });

  it("reminder without optional fields", () => {
    const reminder: Reminder = reminderSchema.parse({
      id: ID(2),
      userId: ID(3),
      title: "Stretch",
      status: "pending",
      createdAt: T,
      updatedAt: T,
    });
    expect(reminderFromRow(reminderToRow(reminder))).toEqual(reminder);
  });

  it("budget category with and without limit", () => {
    const withLimit: BudgetCategory = budgetCategorySchema.parse({
      id: ID(4),
      userId: ID(3),
      name: "Groceries",
      monthlyLimit: { amountMinor: 500000, currency: "PHP" },
      createdAt: T,
      updatedAt: T,
    });
    const noLimit: BudgetCategory = budgetCategorySchema.parse({
      id: ID(5),
      userId: ID(3),
      name: "Misc",
      createdAt: T,
      updatedAt: T,
    });
    expect(budgetCategoryFromRow(budgetCategoryToRow(withLimit))).toEqual(withLimit);
    expect(budgetCategoryFromRow(budgetCategoryToRow(noLimit))).toEqual(noLimit);
  });

  it("calendar event", () => {
    const event: CalendarEvent = calendarEventSchema.parse({
      id: ID(6),
      userId: ID(3),
      provider: "google",
      externalId: "abc123",
      title: "Standup",
      startAt: T,
      endAt: T,
      location: "Zoom",
      createdAt: T,
      updatedAt: T,
    });
    expect(calendarEventFromRow(calendarEventToRow(event))).toEqual(event);
  });

  it("context item with meta", () => {
    const item: ContextItem = contextItemSchema.parse({
      id: ID(7),
      userId: ID(3),
      kind: "bill",
      refId: ID(8),
      source: "finance",
      title: "Electric bill",
      at: T,
      meta: { amountMinor: 120000, urgent: true },
    });
    expect(contextItemFromRow(contextItemToRow(item))).toEqual(item);
  });

  it("consent", () => {
    const consent: Consent = consentSchema.parse({
      id: ID(9),
      userId: ID(3),
      source: "finance",
      granted: true,
      purpose: "Track your spending",
      policyVersion: "2026-06-14",
      grantedAt: T,
    });
    expect(consentFromRow(consentToRow(consent))).toEqual(consent);
  });
});

describe("sensitive mappers round-trip (identity seal/open)", () => {
  it("bill", () => {
    const bill: Bill = billSchema.parse({
      id: ID(1),
      userId: ID(3),
      name: "Internet",
      amount: { amountMinor: 199900, currency: "PHP" },
      dueDate: "2026-06-20",
      recurrence: { freq: "monthly", dayOfMonth: 20 },
      isAutopay: true,
      isPaid: false,
      createdAt: T,
      updatedAt: T,
    });
    const row = billToRow(bill, { amountMinor: String(bill.amount.amountMinor) });
    expect(billFromRow(row, row.amountMinor)).toEqual(bill);
  });

  it("income", () => {
    const income: Income = incomeSchema.parse({
      id: ID(2),
      userId: ID(3),
      source: "Acme Corp",
      amount: { amountMinor: 5000000, currency: "PHP" },
      cadence: "monthly",
      nextPayDate: "2026-06-30",
      createdAt: T,
      updatedAt: T,
    });
    const row = incomeToRow(income, { amountMinor: String(income.amount.amountMinor) });
    expect(incomeFromRow(row, row.amountMinor)).toEqual(income);
  });

  it("transaction with description", () => {
    const tx: Transaction = transactionSchema.parse({
      id: ID(4),
      userId: ID(3),
      amount: { amountMinor: 25050, currency: "PHP" },
      categoryId: ID(5),
      description: "Lunch",
      occurredAt: T,
      createdAt: T,
      updatedAt: T,
    });
    const row = transactionToRow(tx, {
      amountMinor: String(tx.amount.amountMinor),
      description: tx.description ?? null,
    });
    expect(transactionFromRow(row, row.amountMinor, row.description)).toEqual(tx);
  });

  it("transaction without description", () => {
    const tx: Transaction = transactionSchema.parse({
      id: ID(4),
      userId: ID(3),
      amount: { amountMinor: 9900, currency: "PHP" },
      occurredAt: T,
      createdAt: T,
      updatedAt: T,
    });
    const row = transactionToRow(tx, {
      amountMinor: String(tx.amount.amountMinor),
      description: null,
    });
    expect(transactionFromRow(row, row.amountMinor, row.description)).toEqual(tx);
  });

  it("medication with dosage", () => {
    const med: Medication = medicationSchema.parse({
      id: ID(6),
      userId: ID(3),
      name: "Losartan",
      dosage: "50mg",
      times: ["08:00", "20:00"],
      recurrence: { freq: "daily" },
      quantityRemaining: 30,
      createdAt: T,
      updatedAt: T,
    });
    const row = medicationToRow(med, { name: med.name, dosage: med.dosage ?? null });
    expect(medicationFromRow(row, row.name, row.dosage)).toEqual(med);
  });

  it("medication without dosage", () => {
    const med: Medication = medicationSchema.parse({
      id: ID(6),
      userId: ID(3),
      name: "Vitamin D",
      times: ["08:00"],
      recurrence: { freq: "weekdays" },
      createdAt: T,
      updatedAt: T,
    });
    const row = medicationToRow(med, { name: med.name, dosage: null });
    expect(medicationFromRow(row, row.name, row.dosage)).toEqual(med);
  });
});
