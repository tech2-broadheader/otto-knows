import { describe, expect, it } from "vitest";
import type { Account, Transaction } from "@otto/schemas";
import { canArchiveAccount, summarizeWallets } from "./accounts";

const T = "2026-10-08T08:00:00+08:00";
const USER = "00000000-0000-4000-8000-000000000001";
let seq = 0;
const id = (): string => `00000000-0000-4000-8000-${String((seq += 1)).padStart(12, "0")}`;

function account(
  type: Account["type"],
  openingMinor: number,
  extra: Partial<Account> = {},
): Account {
  return {
    id: id(),
    userId: USER,
    name: type,
    type,
    openingBalance: { amountMinor: openingMinor, currency: "PHP" },
    createdAt: T,
    updatedAt: T,
    ...extra,
  };
}

function spend(accountId: string | undefined, amountMinor: number): Transaction {
  return {
    id: id(),
    userId: USER,
    amount: { amountMinor, currency: "PHP" },
    accountId,
    occurredAt: T,
    createdAt: T,
    updatedAt: T,
  };
}

describe("summarizeWallets", () => {
  it("derives each balance from the opening balance minus spending", () => {
    const cash = account("cash", 500000);
    const gcash = account("ewallet", 120000);
    const summary = summarizeWallets([cash, gcash], [spend(cash.id, 25000), spend(cash.id, 5050)]);
    expect(summary.perAccount.map((a) => [a.accountId, a.balanceMinor])).toEqual([
      [cash.id, 469950],
      [gcash.id, 120000],
    ]);
    expect(summary.onHandMinor).toBe(589950);
    expect(summary.cardOwedMinor).toBe(0);
  });

  it("treats credit cards as debt: spending on the card increases the amount owed", () => {
    const bank = account("bank", 1000000);
    const card = account("credit_card", -200000); // ₱2,000 owed at start
    const summary = summarizeWallets([bank, card], [spend(card.id, 150000)]);
    expect(summary.cardOwedMinor).toBe(350000);
    expect(summary.onHandMinor).toBe(1000000); // card debt never counts as money on hand
    expect(summary.perAccount.find((a) => a.accountId === card.id)?.balanceMinor).toBe(-350000);
  });

  it("ignores a card's credit balance in money on hand and owed", () => {
    const card = account("credit_card", 5000); // overpaid
    const summary = summarizeWallets([card], []);
    expect(summary.cardOwedMinor).toBe(0);
    expect(summary.onHandMinor).toBe(0);
  });

  it("excludes archived wallets from totals but keeps their history", () => {
    const cash = account("cash", 10000);
    const old = account("bank", 0, { archivedAt: T });
    const summary = summarizeWallets([cash, old], [spend(old.id, 0)]);
    expect(summary.onHandMinor).toBe(10000);
    expect(summary.perAccount.find((a) => a.accountId === old.id)?.archived).toBe(true);
    expect(summary.orphanTransactionIds).toEqual([]);
  });

  it("reports transactions whose wallet is missing instead of dropping them silently", () => {
    const cash = account("cash", 0);
    const lost = spend("99999999-9999-4999-8999-999999999999", 100);
    const unassigned = spend(undefined, 200);
    const summary = summarizeWallets([cash], [lost, unassigned]);
    expect(summary.orphanTransactionIds).toEqual([lost.id, unassigned.id]);
    expect(summary.onHandMinor).toBe(0);
  });

  it("handles no wallets and no transactions", () => {
    expect(summarizeWallets([], [])).toEqual({
      currency: "PHP",
      onHandMinor: 0,
      cardOwedMinor: 0,
      perAccount: [],
      orphanTransactionIds: [],
    });
  });

  it("stays exact with large integer amounts", () => {
    const bank = account("bank", 9_000_000_000_00);
    const summary = summarizeWallets([bank], [spend(bank.id, 1), spend(bank.id, 2)]);
    expect(summary.onHandMinor).toBe(899_999_999_997);
  });
});

describe("canArchiveAccount", () => {
  it("allows archiving only at a zero balance", () => {
    expect(canArchiveAccount(0)).toBe(true);
    expect(canArchiveAccount(1)).toBe(false);
    expect(canArchiveAccount(-1)).toBe(false);
  });
});
