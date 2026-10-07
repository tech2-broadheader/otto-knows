// Finance state (stories 3.2, 11.2–11.5, 13.1, 13.5): wallets, typed
// transactions, bills, income and budget categories, plus everything derived
// from them (budget summary, wallet balances, safe-to-spend, monthly report).
// Sensitive repositories get RepositoryDeps (encrypt + audit). Every new amount
// uses the user's home currency (ADR-007). Free caps apply to free users only.
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  accountSchema,
  billSchema,
  budgetCategorySchema,
  incomeSchema,
  transactionSchema,
  type Account,
  type AccountType,
  type Bill,
  type BudgetCategory,
  type Income,
  type IncomeCadence,
  type MonthlyReport,
  type SafeToSpend,
  type Transaction,
  type TransactionType,
} from "@otto/schemas";
import {
  canArchiveAccount,
  computeBudgetSummary,
  computeMonthlyReport,
  computeSafeToSpend,
  pickDefaultAccountId,
  summarizeWallets,
  type BudgetSummary,
  type WalletSummary,
} from "@otto/core";
import {
  budgetCategoryRepository,
  makeAccountRepository,
  makeBillRepository,
  makeIncomeRepository,
  makeTransactionRepository,
  type RepositoryDeps,
} from "../data";
import { FREE_CAPS } from "../lib/caps";
import { DEFAULT_CASH_ACCOUNT_ID, LOCAL_USER_ID } from "../lib/constants";
import { newUuid } from "../lib/id";
import { currentMonth, isoFromDateTime, localUtcOffset, nowIso, todayDate } from "../lib/datetime";
import { useSettings } from "../lib/settings-context";
import type { LoadState } from "../components/AsyncBoundary";

/** Transactions logged without a time are placed at midday so the date never shifts. */
const DEFAULT_TRANSACTION_TIME = "12:00";

export type TransactionInput = {
  type: TransactionType;
  amountMinor: number;
  accountId?: string;
  toAccountId?: string;
  categoryId?: string;
  description?: string;
  /** YYYY-MM-DD; defaults to today. */
  date?: string;
};

export type WalletInput = {
  type: AccountType;
  name: string;
  provider?: string;
  /** Signed opening balance: card debt is negative. */
  openingMinor: number;
};

export type FinanceState = {
  state: LoadState;
  error?: string;
  bills: Bill[];
  income: Income[];
  transactions: Transaction[];
  categories: BudgetCategory[];
  accounts: Account[];
  activeAccounts: Account[];
  summary: BudgetSummary;
  wallets: WalletSummary;
  safeToSpend: SafeToSpend;
  billsAtCap: boolean;
  categoriesAtCap: boolean;
  walletsAtCap: boolean;
  /** The wallet a new entry defaults to: last used, else Cash. */
  defaultAccountId: string | undefined;
  monthlyReport: (month: string) => MonthlyReport;
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
    payDays?: [number, number];
  }) => Promise<Income>;
  addTransaction: (input: TransactionInput) => Promise<Transaction>;
  updateTransaction: (id: string, input: TransactionInput) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;
  addCategory: (input: {
    name: string;
    monthlyLimitMinor?: number;
  }) => Promise<BudgetCategory | "at-cap">;
  addAccount: (input: WalletInput) => Promise<Account | "at-cap">;
  updateAccount: (id: string, input: WalletInput) => Promise<Account>;
  /** Archive only at a zero balance (ADR-004); returns false when refused. */
  archiveAccount: (id: string) => Promise<boolean>;
  restoreAccount: (id: string) => Promise<Account | "at-cap">;
  reload: () => Promise<void>;
};

export function useFinance(deps: RepositoryDeps, options: { isPro?: boolean } = {}): FinanceState {
  const isPro = options.isPro ?? false;
  const { currency } = useSettings();
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
  const [accounts, setAccounts] = useState<Account[]>([]);

  const reload = useCallback(async () => {
    setState("loading");
    try {
      // After a data wipe the app returns to onboarding without rebooting, so the
      // boot-time default wallet may be gone; recreate it before any transaction.
      await accountRepo.ensureDefault(LOCAL_USER_ID, currency);
      const [b, i, t, c, a] = await Promise.all([
        billRepo.list(LOCAL_USER_ID),
        incomeRepo.list(LOCAL_USER_ID),
        txRepo.list(LOCAL_USER_ID),
        budgetCategoryRepository.list(LOCAL_USER_ID),
        accountRepo.list(LOCAL_USER_ID),
      ]);
      setBills(b);
      setIncome(i);
      // Newest first everywhere the app lists transactions.
      setTransactions([...t].sort((x, y) => y.occurredAt.localeCompare(x.occurredAt)));
      setCategories(c);
      setAccounts(a);
      setState("ready");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load your finances.");
      setState("error");
    }
  }, [accountRepo, billRepo, incomeRepo, txRepo, currency]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const activeAccounts = useMemo(
    () => accounts.filter((a) => a.archivedAt === undefined),
    [accounts],
  );
  const summary = useMemo(
    () => computeBudgetSummary(categories, transactions, currentMonth()),
    [categories, transactions],
  );
  const wallets = useMemo(() => summarizeWallets(accounts, transactions), [accounts, transactions]);
  const safeToSpend = useMemo(
    () =>
      computeSafeToSpend({ accounts, transactions, bills, incomes: income, asOfDate: todayDate() }),
    [accounts, transactions, bills, income],
  );
  const defaultAccountId = useMemo(
    () => pickDefaultAccountId(accounts, transactions, DEFAULT_CASH_ACCOUNT_ID),
    [accounts, transactions],
  );
  const monthlyReport = useCallback(
    (month: string) => computeMonthlyReport(categories, transactions, month),
    [categories, transactions],
  );

  const capped = (count: number, cap: number): boolean => !isPro && count >= cap;
  const money = useCallback((amountMinor: number) => ({ amountMinor, currency }), [currency]);

  const addBill = useCallback(
    async (input: { name: string; amountMinor: number; dueDate: string }) => {
      if (!isPro && bills.length >= FREE_CAPS.bills) return "at-cap" as const;
      const now = nowIso();
      const created = await billRepo.create(
        billSchema.parse({
          id: newUuid(),
          userId: LOCAL_USER_ID,
          name: input.name,
          amount: money(input.amountMinor),
          dueDate: input.dueDate,
          recurrence: { freq: "monthly" },
          isAutopay: false,
          isPaid: false,
          createdAt: now,
          updatedAt: now,
        }),
      );
      await reload();
      return created;
    },
    [billRepo, bills.length, isPro, money, reload],
  );

  const addIncome = useCallback(
    async (input: Parameters<FinanceState["addIncome"]>[0]) => {
      const now = nowIso();
      const created = await incomeRepo.create(
        incomeSchema.parse({
          id: newUuid(),
          userId: LOCAL_USER_ID,
          source: input.source,
          amount: money(input.amountMinor),
          cadence: input.cadence,
          nextPayDate: input.nextPayDate,
          payDays: input.payDays,
          createdAt: now,
          updatedAt: now,
        }),
      );
      await reload();
      return created;
    },
    [incomeRepo, money, reload],
  );

  const toTransaction = useCallback(
    (id: string, input: TransactionInput, createdAt: string): Transaction =>
      transactionSchema.parse({
        id,
        userId: LOCAL_USER_ID,
        type: input.type,
        amount: money(input.amountMinor),
        accountId: input.accountId ?? defaultAccountId ?? DEFAULT_CASH_ACCOUNT_ID,
        toAccountId: input.type === "transfer" ? input.toAccountId : undefined,
        categoryId: input.type === "expense" ? input.categoryId : undefined,
        description: input.description,
        occurredAt: isoFromDateTime(
          input.date ?? todayDate(),
          DEFAULT_TRANSACTION_TIME,
          localUtcOffset(),
        ),
        createdAt,
        updatedAt: nowIso(),
      }),
    [defaultAccountId, money],
  );

  const addTransaction = useCallback(
    async (input: TransactionInput) => {
      const created = await txRepo.create(toTransaction(newUuid(), input, nowIso()));
      await reload();
      return created;
    },
    [toTransaction, txRepo, reload],
  );

  const updateTransaction = useCallback(
    async (id: string, input: TransactionInput) => {
      const existing = transactions.find((t) => t.id === id);
      const updated = await txRepo.update(
        toTransaction(id, input, existing?.createdAt ?? nowIso()),
      );
      await reload();
      return updated;
    },
    [toTransaction, transactions, txRepo, reload],
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      await txRepo.delete(LOCAL_USER_ID, id);
      await reload();
    },
    [txRepo, reload],
  );

  const addCategory = useCallback(
    async (input: { name: string; monthlyLimitMinor?: number }) => {
      if (!isPro && categories.length >= FREE_CAPS.budgetCategories) return "at-cap" as const;
      const now = nowIso();
      const created = await budgetCategoryRepository.create(
        budgetCategorySchema.parse({
          id: newUuid(),
          userId: LOCAL_USER_ID,
          name: input.name,
          monthlyLimit:
            input.monthlyLimitMinor !== undefined ? money(input.monthlyLimitMinor) : undefined,
          createdAt: now,
          updatedAt: now,
        }),
      );
      await reload();
      return created;
    },
    [categories.length, isPro, money, reload],
  );

  const addAccount = useCallback(
    async (input: WalletInput) => {
      if (!isPro && activeAccounts.length >= FREE_CAPS.wallets) return "at-cap" as const;
      const now = nowIso();
      const created = await accountRepo.create(
        accountSchema.parse({
          id: newUuid(),
          userId: LOCAL_USER_ID,
          name: input.name,
          type: input.type,
          provider: input.provider,
          openingBalance: money(input.openingMinor),
          createdAt: now,
          updatedAt: now,
        }),
      );
      await reload();
      return created;
    },
    [accountRepo, activeAccounts.length, isPro, money, reload],
  );

  const updateAccount = useCallback(
    async (id: string, input: WalletInput) => {
      const existing = accounts.find((a) => a.id === id);
      if (!existing) throw new Error("That wallet no longer exists.");
      const updated = await accountRepo.update(
        accountSchema.parse({
          ...existing,
          name: input.name,
          type: input.type,
          provider: input.provider,
          openingBalance: money(input.openingMinor),
          updatedAt: nowIso(),
        }),
      );
      await reload();
      return updated;
    },
    [accountRepo, accounts, money, reload],
  );

  const archiveAccount = useCallback(
    async (id: string) => {
      const existing = accounts.find((a) => a.id === id);
      const balance = wallets.perAccount.find((a) => a.accountId === id)?.balanceMinor ?? 0;
      if (!existing || !canArchiveAccount(balance)) return false;
      await accountRepo.update({ ...existing, archivedAt: nowIso(), updatedAt: nowIso() });
      await reload();
      return true;
    },
    [accountRepo, accounts, wallets, reload],
  );

  const restoreAccount = useCallback(
    async (id: string) => {
      const existing = accounts.find((a) => a.id === id);
      if (!existing) throw new Error("That wallet no longer exists.");
      if (!isPro && activeAccounts.length >= FREE_CAPS.wallets) return "at-cap" as const;
      const restored = await accountRepo.update({
        ...existing,
        archivedAt: undefined,
        updatedAt: nowIso(),
      });
      await reload();
      return restored;
    },
    [accountRepo, accounts, activeAccounts.length, isPro, reload],
  );

  return {
    state,
    error,
    bills,
    income,
    transactions,
    categories,
    accounts,
    activeAccounts,
    summary,
    wallets,
    safeToSpend,
    billsAtCap: capped(bills.length, FREE_CAPS.bills),
    categoriesAtCap: capped(categories.length, FREE_CAPS.budgetCategories),
    walletsAtCap: capped(activeAccounts.length, FREE_CAPS.wallets),
    defaultAccountId,
    monthlyReport,
    addBill,
    addIncome,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addCategory,
    addAccount,
    updateAccount,
    archiveAccount,
    restoreAccount,
    reload,
  };
}
