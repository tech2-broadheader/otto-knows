import { describe, expect, it } from "vitest";
import { accountSchema, isSensitiveEntity, transactionSchema } from "./index";

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

describe("transactionSchema.accountId", () => {
  const tx = {
    id: UUID,
    userId: UUID,
    amount: { amountMinor: 2500, currency: "PHP" },
    occurredAt: ISO,
    createdAt: ISO,
    updatedAt: ISO,
  };

  it("accepts a transaction with or without a wallet (required from story 11.3)", () => {
    expect(transactionSchema.safeParse(tx).success).toBe(true);
    expect(transactionSchema.safeParse({ ...tx, accountId: ACCOUNT_ID }).success).toBe(true);
    expect(transactionSchema.safeParse({ ...tx, accountId: "cash" }).success).toBe(false);
  });
});

describe("account sensitivity", () => {
  it("treats wallets as sensitive (encrypted + audit-logged)", () => {
    expect(isSensitiveEntity("account")).toBe(true);
  });
});
