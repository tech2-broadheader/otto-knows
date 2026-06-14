// Finance — manual entry baseline (ADR-003). All entities here are SENSITIVE.
import { z } from "zod";
import { idSchema, dateSchema, isoDateTimeSchema, moneySchema, timestampFields } from "./common";

export const incomeCadenceSchema = z.enum(["weekly", "biweekly", "semi-monthly", "monthly", "custom"]);
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

/** SENSITIVE. A spending transaction (manual entry at launch). */
export const transactionSchema = z.object({
  id: idSchema,
  userId: idSchema,
  amount: moneySchema,
  categoryId: idSchema.optional(),
  description: z.string().max(280).optional(),
  occurredAt: isoDateTimeSchema,
  ...timestampFields,
});
export type Transaction = z.infer<typeof transactionSchema>;
