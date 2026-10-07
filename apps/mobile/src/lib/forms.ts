// Form validation for the Budgeting+ and Daily-tasks screens (E11/E12, approved
// design 2026-10-08). PURE — no React, no native imports — so every rule is
// unit-tested in Node. Each validator returns a typed value or ONE friendly
// message for the form to show; amounts are parsed in the user's currency and
// locale (story 13.1).
import type { AccountType, CurrencyCode, IncomeCadence, TransactionType } from "@otto/schemas";
import { addMinutesToIso } from "@otto/core";
import { isoFromDateTime } from "./datetime";
import { parseMoneyInput } from "./money";

export type Money = { currency: CurrencyCode; locale: string };
export type FormResult<T> = { ok: true; value: T } | { ok: false; error: string };

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const DESCRIPTION_MAX = 280;

/** Parse a required, non-negative amount with a specific message for each failure. */
function parseAmount(
  text: string,
  money: Money,
  { allowZero }: { allowZero: boolean },
): FormResult<number> {
  if (text.trim() === "") return { ok: false, error: "Enter an amount." };
  const minor = parseMoneyInput(text, money.currency, money.locale);
  if (minor === null) return { ok: false, error: "That amount doesn't look right." };
  if (minor === 0 && !allowZero) return { ok: false, error: "Enter an amount above zero." };
  return { ok: true, value: minor };
}

// ─────────── Transactions (story 11.3) ───────────

export type TransactionFormInput = {
  type: TransactionType;
  amountText: string;
  accountId: string | undefined;
  toAccountId: string | undefined;
  categoryId: string | undefined;
  note: string;
  date: string;
};

export type TransactionFormValue = {
  type: TransactionType;
  amountMinor: number;
  accountId: string;
  toAccountId: string | undefined;
  categoryId: string | undefined;
  description: string | undefined;
  date: string;
};

export function validateTransactionForm(
  input: TransactionFormInput,
  money: Money,
): FormResult<TransactionFormValue> {
  const amount = parseAmount(input.amountText, money, { allowZero: false });
  if (!amount.ok) return amount;
  if (!input.accountId) return { ok: false, error: "Pick a wallet." };
  const isTransfer = input.type === "transfer";
  if (isTransfer && !input.toAccountId) return { ok: false, error: "Pick where the money goes." };
  if (isTransfer && input.toAccountId === input.accountId) {
    return { ok: false, error: "Pick two different wallets." };
  }
  if (!DATE_PATTERN.test(input.date)) return { ok: false, error: "Use a date like 2026-10-08." };
  const note = input.note.trim().slice(0, DESCRIPTION_MAX);
  return {
    ok: true,
    value: {
      type: input.type,
      amountMinor: amount.value,
      accountId: input.accountId,
      toAccountId: isTransfer ? input.toAccountId : undefined,
      categoryId: input.type === "expense" ? input.categoryId : undefined,
      description: note === "" ? undefined : note,
      date: input.date,
    },
  };
}

// ─────────── Wallets (story 11.2) ───────────

export type WalletFormInput = {
  type: AccountType;
  name: string;
  provider: string;
  /** Balance today — or, for a credit card, the amount owed. Empty means zero. */
  balanceText: string;
};

export type WalletFormValue = {
  type: AccountType;
  name: string;
  provider: string | undefined;
  /** Signed: money held positive, card debt negative (ADR-004). */
  openingMinor: number;
};

export function validateWalletForm(
  input: WalletFormInput,
  money: Money,
): FormResult<WalletFormValue> {
  const name = input.name.trim();
  if (name === "") return { ok: false, error: "Give the wallet a name." };
  let openingMinor = 0;
  if (input.balanceText.trim() !== "") {
    const amount = parseAmount(input.balanceText, money, { allowZero: true });
    if (!amount.ok) return amount;
    openingMinor = input.type === "credit_card" ? -amount.value : amount.value;
  }
  const provider = input.provider.trim();
  return {
    ok: true,
    value: {
      type: input.type,
      name,
      provider: provider === "" ? undefined : provider,
      openingMinor,
    },
  };
}

// ─────────── Income (stories 3.2 / 13.5) ───────────

export type IncomeFormInput = {
  source: string;
  amountText: string;
  cadence: IncomeCadence;
  nextPayDate: string;
  /** Semi-monthly only: the two days of the month pay arrives. */
  firstDayText: string;
  secondDayText: string;
};

export type IncomeFormValue = {
  source: string;
  amountMinor: number;
  cadence: IncomeCadence;
  nextPayDate: string;
  payDays: [number, number] | undefined;
};

export function validateIncomeForm(
  input: IncomeFormInput,
  money: Money,
): FormResult<IncomeFormValue> {
  const source = input.source.trim();
  if (source === "") return { ok: false, error: "Where does this income come from?" };
  const amount = parseAmount(input.amountText, money, { allowZero: false });
  if (!amount.ok) return amount;
  if (!DATE_PATTERN.test(input.nextPayDate)) {
    return { ok: false, error: "Use a date like 2026-10-08." };
  }
  let payDays: [number, number] | undefined;
  if (input.cadence === "semi-monthly") {
    const days = [input.firstDayText, input.secondDayText].map((t) => Number(t.trim()));
    const valid = days.every((d) => Number.isInteger(d) && d >= 1 && d <= 31);
    if (!valid || days[0] === days[1]) {
      return { ok: false, error: "Pick two different pay days between 1 and 31." };
    }
    const [a, b] = days as [number, number];
    payDays = a < b ? [a, b] : [b, a];
  }
  return {
    ok: true,
    value: {
      source,
      amountMinor: amount.value,
      cadence: input.cadence,
      nextPayDate: input.nextPayDate,
      payDays,
    },
  };
}

// ─────────── Appointments (story 12.4) ───────────

export type AppointmentFormInput = {
  title: string;
  date: string;
  time: string;
  durationMinutes: number;
  location: string;
  remindMinutesBefore: number | undefined;
};

export type AppointmentFormValue = {
  title: string;
  startAt: string;
  durationMinutes: number;
  location: string | undefined;
  remindMinutesBefore: number | undefined;
};

export function validateAppointmentForm(
  input: AppointmentFormInput,
  utcOffset: string,
): FormResult<AppointmentFormValue> {
  const title = input.title.trim();
  if (title === "") return { ok: false, error: "What's the appointment?" };
  if (!DATE_PATTERN.test(input.date)) return { ok: false, error: "Use a date like 2026-10-08." };
  if (!TIME_PATTERN.test(input.time)) return { ok: false, error: "Use a time like 15:00." };
  const location = input.location.trim();
  return {
    ok: true,
    value: {
      title,
      startAt: isoFromDateTime(input.date, input.time, utcOffset),
      durationMinutes: input.durationMinutes,
      location: location === "" ? undefined : location,
      remindMinutesBefore: input.remindMinutesBefore,
    },
  };
}

// ─────────── Quick date choices ───────────

export type DateChoice = "yesterday" | "today" | "tomorrow";

/** A calendar date relative to `today` (YYYY-MM-DD), month/year-safe. */
export function dateForChoice(choice: DateChoice, today: string): string {
  const shift = choice === "yesterday" ? -1 : choice === "tomorrow" ? 1 : 0;
  return addMinutesToIso(`${today}T00:00:00+00:00`, shift * 24 * 60).slice(0, 10);
}
