import { describe, expect, it } from "vitest";
import {
  accountSchema,
  appointmentSchema,
  billSchema,
  budgetCategorySchema,
  calendarEventSchema,
  consentSchema,
  contextItemSchema,
  incomeSchema,
  medicationSchema,
  alarmSchema,
  noteSchema,
  reminderSchema,
  routineSchema,
  routineAnchorSchema,
  transactionSchema,
  type Account,
  type Bill,
  type BudgetCategory,
  type CalendarEvent,
  type Consent,
  type ContextItem,
  type Income,
  type Medication,
  type Reminder,
  type Routine,
  type RoutineAnchor,
  type Transaction,
} from "@otto/schemas";
import {
  accountFromRow,
  appointmentFromRow,
  appointmentToRow,
  accountToRow,
  anchorFromRow,
  anchorToRow,
  billFromRow,
  billToRow,
  budgetCategoryFromRow,
  alarmFromRow,
  alarmToRow,
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
  noteFromRow,
  noteToRow,
  reminderFromRow,
  reminderToRow,
  routineFromRow,
  routineToRow,
  transactionFromRow,
  transactionToRow,
} from "./mappers";

const T = "2026-06-14T08:00:00+08:00";
const ID = (n: number) =>
  `${n}${n}${n}${n}${n}${n}${n}${n}-${n}${n}${n}${n}-4${n}${n}${n}-8${n}${n}${n}-${n}${n}${n}${n}${n}${n}${n}${n}${n}${n}${n}${n}`;

describe("income pay days round-trip (story 13.5)", () => {
  it("stores the two pay days as JSON and reads them back", () => {
    const income: Income = incomeSchema.parse({
      id: ID(1),
      userId: ID(3),
      source: "Salary",
      amount: { amountMinor: 250000, currency: "USD" },
      cadence: "semi-monthly",
      nextPayDate: "2026-10-15",
      payDays: [1, 15],
      createdAt: T,
      updatedAt: T,
    });
    const row = incomeToRow(income, { amountMinor: "250000" });
    expect(row.payDays).toBe("[1,15]");
    expect(incomeFromRow(row, row.amountMinor)).toEqual(income);
  });
});

describe("non-sensitive mappers round-trip (entity -> row -> entity)", () => {
  it("appointment with all optional fields, and a bare one", () => {
    const full = appointmentSchema.parse({
      id: ID(1),
      userId: ID(3),
      title: "Dentist",
      startAt: "2026-10-13T15:00:00+08:00",
      endAt: "2026-10-13T16:00:00+08:00",
      location: "Makati",
      notes: "Bring x-rays",
      remindMinutesBefore: 60,
      destination: "otto",
      createdAt: T,
      updatedAt: T,
    });
    expect(appointmentFromRow(appointmentToRow(full))).toEqual(full);
    const bare = appointmentSchema.parse({
      id: ID(2),
      userId: ID(3),
      title: "Call",
      startAt: "2026-10-13T09:00:00+08:00",
      endAt: "2026-10-13T09:15:00+08:00",
      createdAt: T,
      updatedAt: T,
    });
    expect(appointmentToRow(bare).location).toBeNull();
    expect(appointmentFromRow(appointmentToRow(bare))).toEqual(bare);
  });

  it("alarm: repeat days as JSON, switches as 0/1, label optional", () => {
    const weekdays = alarmSchema.parse({
      id: ID(1),
      userId: ID(3),
      time: "06:00",
      repeatDays: ["mon", "tue", "wed", "thu", "fri"],
      label: "Wake up",
      vibrate: false,
      createdAt: T,
      updatedAt: T,
    });
    const row = alarmToRow(weekdays);
    expect(row).toMatchObject({
      repeatDays: '["mon","tue","wed","thu","fri"]',
      enabled: 1,
      vibrate: 0,
    });
    expect(alarmFromRow(row)).toEqual(weekdays);
    const once = alarmSchema.parse({
      id: ID(2),
      userId: ID(3),
      time: "14:15",
      createdAt: T,
      updatedAt: T,
    });
    expect(alarmToRow(once).label).toBeNull();
    expect(alarmFromRow(alarmToRow(once))).toEqual(once);
  });

  it("note with and without a title, pinned stored as 0/1", () => {
    const pinned = noteSchema.parse({
      id: ID(1),
      userId: ID(3),
      title: "Birthday",
      body: "Buy gift for Ana",
      pinned: true,
      createdAt: T,
      updatedAt: T,
    });
    expect(noteToRow(pinned).pinned).toBe(1);
    expect(noteFromRow(noteToRow(pinned))).toEqual(pinned);
    const plain = noteSchema.parse({
      id: ID(2),
      userId: ID(3),
      body: "x",
      createdAt: T,
      updatedAt: T,
    });
    expect(noteToRow(plain).title).toBeNull();
    expect(noteFromRow(noteToRow(plain))).toEqual(plain);
  });

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

  it("routine (anchors re-attached on read)", () => {
    const anchor: RoutineAnchor = routineAnchorSchema.parse({
      id: ID(1),
      label: "Wake",
      kind: "wake",
      time: "06:30",
      recurrence: { freq: "daily" },
      createdAt: T,
      updatedAt: T,
    });
    const routine: Routine = routineSchema.parse({
      id: ID(2),
      userId: ID(3),
      mode: "fixed",
      timezone: "Asia/Manila",
      anchors: [anchor],
      createdAt: T,
      updatedAt: T,
    });
    expect(routineFromRow(routineToRow(routine), [anchor])).toEqual(routine);
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
      type: "expense",
      amount: { amountMinor: 25050, currency: "PHP" },
      accountId: ID(7),
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
      type: "income",
      amount: { amountMinor: 9900, currency: "PHP" },
      accountId: ID(7),
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

  it("transfer keeps its destination wallet", () => {
    const tx: Transaction = transactionSchema.parse({
      id: ID(4),
      userId: ID(3),
      type: "transfer",
      amount: { amountMinor: 300000, currency: "PHP" },
      accountId: ID(7),
      toAccountId: ID(8),
      occurredAt: T,
      createdAt: T,
      updatedAt: T,
    });
    const row = transactionToRow(tx, { amountMinor: "300000", description: null });
    expect(row.type).toBe("transfer");
    expect(row.toAccountId).toBe(ID(8));
    expect(transactionFromRow(row, row.amountMinor, row.description)).toEqual(tx);
  });

  it("refuses a stored transaction with no wallet instead of guessing one", () => {
    const row = {
      ...transactionToRow(
        transactionSchema.parse({
          id: ID(4),
          userId: ID(3),
          type: "expense",
          amount: { amountMinor: 1, currency: "PHP" },
          accountId: ID(7),
          occurredAt: T,
          createdAt: T,
          updatedAt: T,
        }),
        { amountMinor: "1", description: null },
      ),
      accountId: null,
    };
    expect(() => transactionFromRow(row, "1", null)).toThrow(/no wallet/);
  });

  it("wallet with provider, archived, negative (card owed) opening balance", () => {
    const account: Account = accountSchema.parse({
      id: ID(7),
      userId: ID(3),
      name: "BPI Visa",
      type: "credit_card",
      provider: "BPI",
      openingBalance: { amountMinor: -1250000, currency: "PHP" },
      archivedAt: T,
      createdAt: T,
      updatedAt: T,
    });
    const row = accountToRow(account, String(account.openingBalance.amountMinor));
    expect(accountFromRow(row, row.openingBalanceMinor)).toEqual(account);
  });

  it("wallet whose opening balance was never set (migration default) reads as zero", () => {
    const row = accountToRow(
      accountSchema.parse({
        id: ID(8),
        userId: ID(3),
        name: "Cash",
        type: "cash",
        openingBalance: { amountMinor: 0, currency: "PHP" },
        createdAt: T,
        updatedAt: T,
      }),
      null,
    );
    expect(row.openingBalanceMinor).toBeNull();
    expect(accountFromRow(row, null).openingBalance).toEqual({ amountMinor: 0, currency: "PHP" });
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
