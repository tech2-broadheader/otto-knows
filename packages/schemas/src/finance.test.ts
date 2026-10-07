import { describe, expect, it } from "vitest";
import {
  accountSchema,
  expenseDraftSchema,
  isSensitiveEntity,
  monthlyReportSchema,
  nudgeKindSchema,
  safeToSpendSchema,
  storedTransactionSchema,
  transactionSchema,
} from "./index";

const ISO = "2026-10-08T08:00:00+08:00";
const UUID = "11111111-1111-4111-8111-111111111111";
const ACCOUNT_ID = "22222222-2222-4222-8222-222222222222";

const baseAccount = {
  id: ACCOUNT_ID,
  userId: UUID,
  name: "GCash",
  type: "ewallet",
  provider: "GCash",
  openingBalance: { amountMinor: 150000, currency: "PHP" },
  createdAt: ISO,
  updatedAt: ISO,
};

describe("accountSchema", () => {
  it.each(["cash", "ewallet", "bank", "credit_card"])("accepts type %s", (type) => {
    expect(accountSchema.safeParse({ ...baseAccount, type }).success).toBe(true);
  });

  it("rejects an unknown wallet type", () => {
    expect(accountSchema.safeParse({ ...baseAccount, type: "crypto" }).success).toBe(false);
  });

  it("bounds the name (1-80) and provider (max 40)", () => {
    expect(accountSchema.safeParse({ ...baseAccount, name: "" }).success).toBe(false);
    expect(accountSchema.safeParse({ ...baseAccount, name: "x".repeat(81) }).success).toBe(false);
    expect(accountSchema.safeParse({ ...baseAccount, provider: "x".repeat(41) }).success).toBe(
      false,
    );
  });

  it("allows a negative opening balance (credit card amount owed)", () => {
    const card = {
      ...baseAccount,
      type: "credit_card",
      openingBalance: { amountMinor: -500000, currency: "PHP" },
    };
    expect(accountSchema.safeParse(card).success).toBe(true);
  });

  it("accepts an optional archivedAt timestamp", () => {
    expect(accountSchema.safeParse({ ...baseAccount, archivedAt: ISO }).success).toBe(true);
    expect(accountSchema.safeParse({ ...baseAccount, archivedAt: "yesterday" }).success).toBe(
      false,
    );
  });
});

describe("transactionSchema (typed, story 11.3)", () => {
  const OTHER = "33333333-3333-4333-8333-333333333333";
  const base = {
    id: UUID,
    userId: UUID,
    amount: { amountMinor: 2500, currency: "PHP" },
    accountId: ACCOUNT_ID,
    occurredAt: ISO,
    createdAt: ISO,
    updatedAt: ISO,
  };
  const ok = (v: object): boolean => transactionSchema.safeParse(v).success;

  it("accepts expense and income with a wallet", () => {
    expect(ok({ ...base, type: "expense", categoryId: OTHER })).toBe(true);
    expect(ok({ ...base, type: "income" })).toBe(true);
  });

  it("requires a type and a wallet", () => {
    expect(ok({ ...base })).toBe(false);
    const { accountId: _omit, ...noWallet } = base;
    expect(ok({ ...noWallet, type: "expense" })).toBe(false);
  });

  it("requires a different destination wallet for a transfer", () => {
    expect(ok({ ...base, type: "transfer", toAccountId: OTHER })).toBe(true);
    expect(ok({ ...base, type: "transfer" })).toBe(false);
    expect(ok({ ...base, type: "transfer", toAccountId: ACCOUNT_ID })).toBe(false);
  });

  it("rejects a destination wallet on expense or income", () => {
    expect(ok({ ...base, type: "expense", toAccountId: OTHER })).toBe(false);
    expect(ok({ ...base, type: "income", toAccountId: OTHER })).toBe(false);
  });

  it("only lets expenses carry a budget category", () => {
    expect(ok({ ...base, type: "income", categoryId: OTHER })).toBe(false);
    expect(ok({ ...base, type: "transfer", toAccountId: OTHER, categoryId: OTHER })).toBe(false);
  });

  it("requires a positive amount (direction comes from the type)", () => {
    expect(ok({ ...base, type: "expense", amount: { amountMinor: 0, currency: "PHP" } })).toBe(
      false,
    );
    expect(ok({ ...base, type: "expense", amount: { amountMinor: -5, currency: "PHP" } })).toBe(
      false,
    );
  });
});

describe("expenseDraftSchema.accountId", () => {
  it("lets quick-add drafts optionally name a wallet", () => {
    const draft = { amount: { amountMinor: 100, currency: "PHP" }, occurredAt: ISO };
    expect(expenseDraftSchema.safeParse(draft).success).toBe(true);
    expect(expenseDraftSchema.safeParse({ ...draft, accountId: ACCOUNT_ID }).success).toBe(true);
    expect(expenseDraftSchema.safeParse({ ...draft, accountId: "gcash" }).success).toBe(false);
  });
});

describe("account sensitivity", () => {
  it("treats wallets as sensitive (encrypted + audit-logged)", () => {
    expect(isSensitiveEntity("account")).toBe(true);
  });
});

describe("safeToSpendSchema", () => {
  const common = {
    asOf: "2026-10-08",
    onHandMinor: 1,
    billsBeforePaydayMinor: 0,
    cardOwedMinor: 0,
    safeMinor: 1,
    currency: "PHP",
  };

  it("accepts an ok result and a no-income result", () => {
    const ok = {
      ...common,
      status: "ok",
      nextPayday: "2026-10-15",
      daysUntilPayday: 7,
      perDayMinor: 0,
    };
    expect(safeToSpendSchema.safeParse(ok).success).toBe(true);
    expect(safeToSpendSchema.safeParse({ ...common, status: "no-income" }).success).toBe(true);
    expect(safeToSpendSchema.safeParse({ ...common, status: "maybe" }).success).toBe(false);
  });

  it("adds a safe-to-spend nudge kind", () => {
    expect(nudgeKindSchema.safeParse("safe-to-spend").success).toBe(true);
  });
});

describe("monthlyReportSchema", () => {
  const report = {
    month: "2026-10",
    currency: "PHP",
    incomeMinor: 100,
    spendingMinor: 50,
    netMinor: 50,
    categories: [
      {
        categoryId: null,
        name: "Uncategorized",
        spentMinor: 50,
        previousMinor: 0,
        changeMinor: 50,
        changePct: null,
      },
    ],
    previous: null,
  };

  it("accepts a report and rejects a malformed month", () => {
    expect(monthlyReportSchema.safeParse(report).success).toBe(true);
    expect(monthlyReportSchema.safeParse({ ...report, month: "Oct 2026" }).success).toBe(false);
  });
});

describe("stored vs new transactions (review fix 2026-10-08)", () => {
  const legacyZero = {
    id: UUID,
    userId: UUID,
    type: "expense",
    amount: { amountMinor: 0, currency: "PHP" },
    accountId: ACCOUNT_ID,
    occurredAt: ISO,
    createdAt: ISO,
    updatedAt: ISO,
  };

  it("still reads a legacy ₱0 row saved before amounts had to be positive", () => {
    expect(storedTransactionSchema.safeParse(legacyZero).success).toBe(true);
  });

  it("rejects ₱0 for anything newly written", () => {
    expect(transactionSchema.safeParse(legacyZero).success).toBe(false);
  });

  it("keeps the transfer rules on stored rows too", () => {
    expect(storedTransactionSchema.safeParse({ ...legacyZero, type: "transfer" }).success).toBe(
      false,
    );
  });

  it("rejects a quick-add expense draft of ₱0 or less", () => {
    const draft = { amount: { amountMinor: 0, currency: "PHP" }, occurredAt: ISO };
    expect(expenseDraftSchema.safeParse(draft).success).toBe(false);
    expect(
      expenseDraftSchema.safeParse({ ...draft, amount: { amountMinor: -5, currency: "PHP" } })
        .success,
    ).toBe(false);
  });
});
