// Finance state (story 3.2): add income / bills / transactions / budget
// categories and show the monthly budget summary. Sensitive repositories obtain
// RepositoryDeps via createRepositoryDeps() (encrypt + audit). Free caps are
// enforced client-side with an upgrade prompt at the cap.
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  billSchema,
  budgetCategorySchema,
  incomeSchema,
  transactionSchema,
  type Bill,
  type BudgetCategory,
  type Income,
  type IncomeCadence,
  type Transaction,
} from "@otto/schemas";
import { computeBudgetSummary, type BudgetSummary } from "@otto/core";
import {
  budgetCategoryRepository,
  makeAccountRepository,
  makeBillRepository,
  makeIncomeRepository,
  makeTransactionRepository,
  type RepositoryDeps,
} from "../data";
import { FREE_CAPS, isAtCap } from "../lib/caps";
import { DEFAULT_CASH_ACCOUNT_ID, LOCAL_USER_ID } from "../lib/constants";
import { newUuid } from "../lib/id";
import { currentMonth, isoFromDateTime, localUtcOffset, nowIso, todayDate } from "../lib/datetime";
import type { LoadState } from "../components/AsyncBoundary";

export type FinanceState = {
  state: LoadState;
  error?: string;
  bills: Bill[];
  income: Income[];
  transactions: Transaction[];
  categories: BudgetCategory[];
  summary: BudgetSummary;
  /** True when the user has reached the free cap for the entity. */
  billsAtCap: boolean;
  categoriesAtCap: boolean;
  addBill: (input: {
    name: string;
    amountMinor: number;
    dueDate: string;
  }) => Promise<Bill | "at-cap">;
  addIncome: (input: {
    source: string;
    amountMinor: number;
    cadence: IncomeCadence;
    nextPayDate: string;
  }) => Promise<Income>;
  addTransaction: (input: {
    amountMinor: number;
    description?: string;
    categoryId?: string;
  }) => Promise<Transaction>;
  addCategory: (input: {
    name: string;
    monthlyLimitMinor?: number;
  }) => Promise<BudgetCategory | "at-cap">;
  reload: () => Promise<void>;
};

export function useFinance(deps: RepositoryDeps): FinanceState {
  const billRepo = useMemo(() => makeBillRepository(deps), [deps]);
  const incomeRepo = useMemo(() => makeIncomeRepository(deps), [deps]);
  const txRepo = useMemo(() => makeTransactionRepository(deps), [deps]);
  const accountRepo = useMemo(() => makeAccountRepository(deps), [deps]);

  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | undefined>();
  const [bills, setBills] = useState<Bill[]>([]);
  const [income, setIncome] = useState<Income[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<BudgetCategory[]>([]);

  const reload = useCallback(async () => {
    setState("loading");
    try {
      // After a data wipe the app returns to onboarding without rebooting, so the
      // boot-time default wallet may be gone; recreate it before any transaction.
      await accountRepo.ensureDefault(LOCAL_USER_ID);
      const [b, i, t, c] = await Promise.all([
        billRepo.list(LOCAL_USER_ID),
        incomeRepo.list(LOCAL_USER_ID),
        txRepo.list(LOCAL_USER_ID),
        budgetCategoryRepository.list(LOCAL_USER_ID),
      ]);
      setBills(b);
      setIncome(i);
      setTransactions(t);
      setCategories(c);
      setState("ready");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load your finances.");
      setState("error");
    }
  }, [accountRepo, billRepo, incomeRepo, txRepo]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const summary = useMemo(
    () => computeBudgetSummary(categories, transactions, currentMonth()),
    [categories, transactions],
  );

  const addBill = useCallback(
    async (input: { name: string; amountMinor: number; dueDate: string }) => {
      if (isAtCap("bills", bills.length)) return "at-cap" as const;
      const now = nowIso();
      const bill = billSchema.parse({
        id: newUuid(),
        userId: LOCAL_USER_ID,
        name: input.name,
        amount: { amountMinor: input.amountMinor, currency: "PHP" },
        dueDate: input.dueDate,
        recurrence: { freq: "monthly" },
        isAutopay: false,
        isPaid: false,
        createdAt: now,
        updatedAt: now,
      });
      const created = await billRepo.create(bill);
      await reload();
      return created;
    },
    [billRepo, bills.length, reload],
  );

  const addIncome = useCallback(
    async (input: {
      source: string;
      amountMinor: number;
      cadence: IncomeCadence;
      nextPayDate: string;
    }) => {
      const now = nowIso();
      const record = incomeSchema.parse({
        id: newUuid(),
        userId: LOCAL_USER_ID,
        source: input.source,
        amount: { amountMinor: input.amountMinor, currency: "PHP" },
        cadence: input.cadence,
        nextPayDate: input.nextPayDate,
        createdAt: now,
        updatedAt: now,
      });
      const created = await incomeRepo.create(record);
      await reload();
      return created;
    },
    [incomeRepo, reload],
  );

  const addTransaction = useCallback(
    async (input: { amountMinor: number; description?: string; categoryId?: string }) => {
      const now = nowIso();
      const tx = transactionSchema.parse({
        id: newUuid(),
        userId: LOCAL_USER_ID,
        amount: { amountMinor: input.amountMinor, currency: "PHP" },
        // Story 11.3 replaces this with the wallet the user picks.
        accountId: DEFAULT_CASH_ACCOUNT_ID,
        categoryId: input.categoryId,
        description:
          input.description && input.description.length > 0 ? input.description : undefined,
        occurredAt: isoFromDateTime(todayDate(), "12:00", localUtcOffset()),
        createdAt: now,
        updatedAt: now,
      });
      const created = await txRepo.create(tx);
      await reload();
      return created;
    },
    [txRepo, reload],
  );

  const addCategory = useCallback(
    async (input: { name: string; monthlyLimitMinor?: number }) => {
      if (isAtCap("budgetCategories", categories.length)) return "at-cap" as const;
      const now = nowIso();
      const category = budgetCategorySchema.parse({
        id: newUuid(),
        userId: LOCAL_USER_ID,
        name: input.name,
        monthlyLimit:
          input.monthlyLimitMinor !== undefined
            ? { amountMinor: input.monthlyLimitMinor, currency: "PHP" }
            : undefined,
        createdAt: now,
        updatedAt: now,
      });
      const created = await budgetCategoryRepository.create(category);
      await reload();
      return created;
    },
    [categories.length, reload],
  );

  return {
    state,
    error,
    bills,
    income,
    transactions,
    categories,
    summary,
    billsAtCap: bills.length >= FREE_CAPS.bills,
    categoriesAtCap: categories.length >= FREE_CAPS.budgetCategories,
    addBill,
    addIncome,
    addTransaction,
    addCategory,
    reload,
  };
}
