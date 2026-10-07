import { describe, expect, it } from "vitest";
import {
  anchorFromDraft,
  billFromDraft,
  medicationFromDraft,
  noteFromDraft,
  reminderFromDraft,
  reminderFromTimeBlock,
  transactionFromExpenseDraft,
  type ApplyContext,
} from "./proposal-mappers";
import { DEFAULT_CASH_ACCOUNT_ID, LOCAL_USER_ID } from "./constants";

// A deterministic context: ids come from a counter so assertions are stable.
function makeCtx(overrides: Partial<ApplyContext> = {}): ApplyContext {
  let n = 0;
  return {
    newId: () => `00000000-0000-4000-8000-00000000000${(n += 1)}`,
    now: "2026-06-15T08:00:00+08:00",
    ...overrides,
  };
}

const PHP = { amountMinor: 180000, currency: "PHP" as const };

describe("reminderFromDraft", () => {
  it("stamps id/userId/timestamps and defaults status to pending", () => {
    const reminder = reminderFromDraft(
      { title: "Call the clinic", dueAt: "2026-06-15T14:00:00+08:00" },
      makeCtx(),
    );
    expect(reminder.userId).toBe(LOCAL_USER_ID);
    expect(reminder.title).toBe("Call the clinic");
    expect(reminder.dueAt).toBe("2026-06-15T14:00:00+08:00");
    expect(reminder.status).toBe("pending");
    expect(reminder.createdAt).toBe("2026-06-15T08:00:00+08:00");
    expect(reminder.updatedAt).toBe("2026-06-15T08:00:00+08:00");
  });

  it("honours an explicit userId override", () => {
    const userId = "11111111-1111-4111-8111-111111111111";
    const reminder = reminderFromDraft({ title: "x" }, makeCtx({ userId }));
    expect(reminder.userId).toBe(userId);
  });

  it("rejects an empty title at the schema boundary", () => {
    expect(() => reminderFromDraft({ title: "" }, makeCtx())).toThrow();
  });
});

describe("transactionFromExpenseDraft", () => {
  it("maps amount (centavos), description and occurredAt", () => {
    const tx = transactionFromExpenseDraft(
      { amount: PHP, description: "Groceries", occurredAt: "2026-06-15T12:00:00+08:00" },
      makeCtx(),
    );
    expect(tx.amount.amountMinor).toBe(180000);
    expect(tx.amount.currency).toBe("PHP");
    expect(tx.description).toBe("Groceries");
    expect(tx.occurredAt).toBe("2026-06-15T12:00:00+08:00");
    expect(tx.userId).toBe(LOCAL_USER_ID);
  });

  it("records an expense, filed under the wallet the draft names", () => {
    const gcash = "00000000-0000-4000-8000-0000000000aa";
    const tx = transactionFromExpenseDraft(
      { amount: PHP, accountId: gcash, occurredAt: "2026-06-15T12:00:00+08:00" },
      makeCtx({ defaultAccountId: "00000000-0000-4000-8000-0000000000bb" }),
    );
    expect(tx.type).toBe("expense");
    expect(tx.accountId).toBe(gcash);
  });

  it("uses the context default wallet when the draft names none", () => {
    const tx = transactionFromExpenseDraft(
      { amount: PHP, occurredAt: "2026-06-15T12:00:00+08:00" },
      makeCtx({ defaultAccountId: "00000000-0000-4000-8000-0000000000bb" }),
    );
    expect(tx.accountId).toBe("00000000-0000-4000-8000-0000000000bb");
  });

  it("falls back to Cash when neither draft nor context names a wallet", () => {
    const tx = transactionFromExpenseDraft(
      { amount: PHP, occurredAt: "2026-06-15T12:00:00+08:00" },
      makeCtx(),
    );
    expect(tx.accountId).toBe(DEFAULT_CASH_ACCOUNT_ID);
  });
});

describe("noteFromDraft", () => {
  it("creates an unpinned note owned by the local user", () => {
    const note = noteFromDraft({ title: "Gift", body: "Buy gift for Ana" }, makeCtx());
    expect(note).toMatchObject({ title: "Gift", body: "Buy gift for Ana", pinned: false });
    expect(note.userId).toBe(LOCAL_USER_ID);
  });
});

describe("billFromDraft", () => {
  it("maps name/amount/dueDate/recurrence and defaults flags to false", () => {
    const bill = billFromDraft(
      { name: "Meralco", amount: PHP, dueDate: "2026-06-20", recurrence: { freq: "monthly" } },
      makeCtx(),
    );
    expect(bill.name).toBe("Meralco");
    expect(bill.amount.amountMinor).toBe(180000);
    expect(bill.dueDate).toBe("2026-06-20");
    expect(bill.recurrence.freq).toBe("monthly");
    expect(bill.isAutopay).toBe(false);
    expect(bill.isPaid).toBe(false);
  });

  it("rejects a malformed dueDate", () => {
    expect(() =>
      billFromDraft(
        { name: "x", amount: PHP, dueDate: "20-06-2026", recurrence: { freq: "once" } },
        makeCtx(),
      ),
    ).toThrow();
  });
});

describe("medicationFromDraft", () => {
  it("maps name/dosage/times/recurrence", () => {
    const med = medicationFromDraft(
      {
        name: "Metformin",
        dosage: "500mg",
        times: ["08:00", "20:00"],
        recurrence: { freq: "daily" },
      },
      makeCtx(),
    );
    expect(med.name).toBe("Metformin");
    expect(med.dosage).toBe("500mg");
    expect(med.times).toEqual(["08:00", "20:00"]);
    expect(med.recurrence.freq).toBe("daily");
  });
});

describe("anchorFromDraft", () => {
  it("builds a routine anchor with no userId field", () => {
    const anchor = anchorFromDraft(
      { label: "Lunch", kind: "meal", time: "12:30", recurrence: { freq: "daily" } },
      makeCtx(),
    );
    expect(anchor.label).toBe("Lunch");
    expect(anchor.kind).toBe("meal");
    expect(anchor.time).toBe("12:30");
    expect("userId" in anchor).toBe(false);
  });

  it("rejects a malformed time", () => {
    expect(() =>
      anchorFromDraft(
        { label: "x", kind: "custom", time: "25:00", recurrence: { freq: "daily" } },
        makeCtx(),
      ),
    ).toThrow();
  });
});

describe("reminderFromTimeBlock", () => {
  it("becomes a one-off reminder pinned to the start, end recorded in notes", () => {
    const reminder = reminderFromTimeBlock(
      {
        title: "Deep work",
        startAt: "2026-06-15T09:00:00+08:00",
        endAt: "2026-06-15T11:00:00+08:00",
      },
      makeCtx(),
    );
    expect(reminder.title).toBe("Deep work");
    expect(reminder.dueAt).toBe("2026-06-15T09:00:00+08:00");
    expect(reminder.recurrence?.freq).toBe("once");
    expect(reminder.notes).toContain("2026-06-15T11:00:00+08:00");
  });
});
