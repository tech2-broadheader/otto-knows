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

/** SENSITIVE. A spending transaction (manual entry at launch). */
export const transactionSchema = z.object({
  id: idSchema,
  userId: idSchema,
  amount: moneySchema,
  // Optional until story 11.3 makes it required alongside the transaction type.
  accountId: idSchema.optional(),
  categoryId: idSchema.optional(),
  description: z.string().max(280).optional(),
  occurredAt: isoDateTimeSchema,
  ...timestampFields,
});
export type Transaction = z.infer<typeof transactionSchema>;
