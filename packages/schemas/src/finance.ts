// Finance — manual entry baseline (ADR-003). All entities here are SENSITIVE.
import { z } from "zod";
import { idSchema, dateSchema, isoDateTimeSchema, moneySchema, timestampFields } from "./common";

export const incomeCadenceSchema = z.enum([
  "weekly",
  "biweekly",
  "semi-monthly",
  "monthly",
  "custom",
]);
export type IncomeCadence = z.infer<typeof incomeCadenceSchema>;

/** SENSITIVE. Salary / recurring income. `nextPayDate` drives payday-vs-bill nudges. */
export const incomeSchema = z.object({
  id: idSchema,
  userId: idSchema,
  source: z.string().min(1).max(140),
  amount: moneySchema,
  cadence: incomeCadenceSchema,
  nextPayDate: dateSchema,
  ...timestampFields,
});
export type Income = z.infer<typeof incomeSchema>;

/** A user-defined budget category with an optional monthly limit. */
export const budgetCategorySchema = z.object({
  id: idSchema,
  userId: idSchema,
  name: z.string().min(1).max(80),
  monthlyLimit: moneySchema.optional(),
  ...timestampFields,
});
export type BudgetCategory = z.infer<typeof budgetCategorySchema>;

/** Kinds of wallet (ADR-004). Credit cards hold debt rather than money. */
export const accountTypeSchema = z.enum(["cash", "ewallet", "bank", "credit_card"]);
export type AccountType = z.infer<typeof accountTypeSchema>;

/**
 * SENSITIVE. A wallet / account the user keeps money in (story 11.2). Balances
 * are derived from `openingBalance` + transactions, never stored. The opening
 * balance is signed: money held is positive; a credit card's amount owed is
 * stored negative.
 */
export const accountSchema = z.object({
  id: idSchema,
  userId: idSchema,
  name: z.string().min(1).max(80),
  type: accountTypeSchema,
  /** Optional brand label, e.g. "GCash", "Maya", "BDO". */
  provider: z.string().min(1).max(40).optional(),
  openingBalance: moneySchema,
  archivedAt: isoDateTimeSchema.optional(),
  ...timestampFields,
});
export type Account = z.infer<typeof accountSchema>;

/** What a transaction does to money (story 11.3). */
export const transactionTypeSchema = z.enum(["expense", "income", "transfer"]);
export type TransactionType = z.infer<typeof transactionTypeSchema>;

/**
 * SENSITIVE. Money leaving a wallet (expense), arriving (income) or moving
 * between two wallets (transfer — e.g. bank → GCash, or paying a credit card).
 * The amount is always positive; `type` decides the direction.
 */
export const transactionSchema = z
  .object({
    id: idSchema,
    userId: idSchema,
    type: transactionTypeSchema,
    amount: moneySchema.refine((m) => m.amountMinor > 0, {
      message: "amount must be positive; the type gives the direction",
    }),
    /** The wallet money leaves (expense, transfer) or arrives in (income). */
    accountId: idSchema,
    /** Transfers only: the wallet money arrives in. */
    toAccountId: idSchema.optional(),
    /** Expenses only. */
    categoryId: idSchema.optional(),
    description: z.string().max(280).optional(),
    occurredAt: isoDateTimeSchema,
    ...timestampFields,
  })
  .superRefine((t, ctx) => {
    if (t.type === "transfer") {
      if (t.toAccountId === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["toAccountId"],
          message: "a transfer needs a destination wallet",
        });
      } else if (t.toAccountId === t.accountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["toAccountId"],
          message: "a transfer must go to a different wallet",
        });
      }
    } else if (t.toAccountId !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["toAccountId"],
        message: "only transfers have a destination wallet",
      });
    }
    if (t.type !== "expense" && t.categoryId !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["categoryId"],
        message: "only expenses have a budget category",
      });
    }
  });
export type Transaction = z.infer<typeof transactionSchema>;

/**
 * Safe-to-spend until the next payday (story 11.4) — a derived, on-device value.
 * `ok`: computed against a payday. `no-income`: no income set up yet.
 * `needs-payday-update`: only a custom-cadence payday exists and it has passed.
 */
export const safeToSpendSchema = z.object({
  status: z.enum(["ok", "no-income", "needs-payday-update"]),
  asOf: dateSchema,
  nextPayday: dateSchema.optional(),
  daysUntilPayday: z.number().int().min(0).optional(),
  onHandMinor: z.number().int(),
  billsBeforePaydayMinor: z.number().int().min(0),
  cardOwedMinor: z.number().int().min(0),
  /** May be negative: bills before payday can exceed money on hand. */
  safeMinor: z.number().int(),
  /** Floor of safeMinor / days left (min 1 day); 0 when safeMinor ≤ 0. */
  perDayMinor: z.number().int().min(0).optional(),
  currency: z.string().min(1),
});
export type SafeToSpend = z.infer<typeof safeToSpendSchema>;
