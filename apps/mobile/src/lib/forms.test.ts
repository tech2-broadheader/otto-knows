import { describe, expect, it } from "vitest";
import {
  dateForChoice,
  validateAlarmForm,
  validateAppointmentForm,
  validateIncomeForm,
  validateTransactionForm,
  validateWalletForm,
} from "./forms";

const US = { currency: "USD" as const, locale: "en-US" };
const DE = { currency: "EUR" as const, locale: "de-DE" };
const CASH = "00000000-0000-4000-8000-0000000000ca";
const BANK = "00000000-0000-4000-8000-0000000000bb";
const FOOD = "00000000-0000-4000-8000-0000000000f1";

describe("validateTransactionForm", () => {
  const base = {
    type: "expense" as const,
    amountText: "12.50",
    accountId: CASH,
    toAccountId: undefined,
    categoryId: FOOD,
    note: "  Lunch  ",
    date: "2026-10-08",
  };

  it("builds an expense in the user's currency", () => {
    expect(validateTransactionForm(base, US)).toEqual({
      ok: true,
      value: {
        type: "expense",
        amountMinor: 1250,
        accountId: CASH,
        toAccountId: undefined,
        categoryId: FOOD,
        description: "Lunch",
        date: "2026-10-08",
      },
    });
  });

  it("reads the locale's number format", () => {
    const result = validateTransactionForm({ ...base, amountText: "1.234,50" }, DE);
    expect(result.ok && result.value.amountMinor).toBe(123450);
  });

  it("asks for a positive, valid amount", () => {
    expect(validateTransactionForm({ ...base, amountText: "" }, US)).toEqual({
      ok: false,
      error: "Enter an amount.",
    });
    expect(validateTransactionForm({ ...base, amountText: "0" }, US)).toEqual({
      ok: false,
      error: "Enter an amount above zero.",
    });
    expect(validateTransactionForm({ ...base, amountText: "12.345" }, US)).toEqual({
      ok: false,
      error: "That amount doesn't look right.",
    });
  });

  it("needs a wallet, and a different destination for a transfer", () => {
    expect(validateTransactionForm({ ...base, accountId: undefined }, US)).toEqual({
      ok: false,
      error: "Pick a wallet.",
    });
    const transfer = { ...base, type: "transfer" as const, categoryId: undefined };
    expect(validateTransactionForm(transfer, US)).toEqual({
      ok: false,
      error: "Pick where the money goes.",
    });
    expect(validateTransactionForm({ ...transfer, toAccountId: CASH }, US)).toEqual({
      ok: false,
      error: "Pick two different wallets.",
    });
    const ok = validateTransactionForm({ ...transfer, toAccountId: BANK }, US);
    expect(ok.ok && ok.value.toAccountId).toBe(BANK);
  });

  it("drops the category and destination when they don't apply", () => {
    const income = validateTransactionForm({ ...base, type: "income", toAccountId: BANK }, US);
    expect(income.ok && income.value.categoryId).toBeUndefined();
    expect(income.ok && income.value.toAccountId).toBeUndefined();
  });

  it("rejects a malformed date", () => {
    expect(validateTransactionForm({ ...base, date: "08/10/2026" }, US)).toEqual({
      ok: false,
      error: "Use a date like 2026-10-08.",
    });
  });
});

describe("validateWalletForm", () => {
  it("stores money held as positive and card debt as negative", () => {
    expect(
      validateWalletForm({ type: "bank", name: " BDO ", provider: "", balanceText: "1,000" }, US),
    ).toEqual({
      ok: true,
      value: { type: "bank", name: "BDO", provider: undefined, openingMinor: 100000 },
    });
    const card = validateWalletForm(
      { type: "credit_card", name: "Visa", provider: "BPI", balanceText: "300" },
      US,
    );
    expect(card.ok && card.value.openingMinor).toBe(-30000);
  });

  it("allows an empty balance (zero) and requires a name", () => {
    const empty = validateWalletForm(
      { type: "cash", name: "Cash", provider: "", balanceText: "" },
      US,
    );
    expect(empty.ok && empty.value.openingMinor).toBe(0);
    expect(
      validateWalletForm({ type: "cash", name: "  ", provider: "", balanceText: "" }, US),
    ).toEqual({ ok: false, error: "Give the wallet a name." });
  });
});

describe("validateIncomeForm", () => {
  const base = {
    source: "Salary",
    amountText: "2500",
    cadence: "semi-monthly" as const,
    nextPayDate: "2026-10-15",
    firstDayText: "1",
    secondDayText: "15",
  };

  it("keeps the two pay days for semi-monthly pay", () => {
    expect(validateIncomeForm(base, US)).toEqual({
      ok: true,
      value: {
        source: "Salary",
        amountMinor: 250000,
        cadence: "semi-monthly",
        nextPayDate: "2026-10-15",
        payDays: [1, 15],
      },
    });
  });

  it("orders the days and rejects bad ones", () => {
    const swapped = validateIncomeForm({ ...base, firstDayText: "30", secondDayText: "15" }, US);
    expect(swapped.ok && swapped.value.payDays).toEqual([15, 30]);
    expect(validateIncomeForm({ ...base, secondDayText: "1" }, US)).toEqual({
      ok: false,
      error: "Pick two different pay days between 1 and 31.",
    });
    expect(validateIncomeForm({ ...base, firstDayText: "40" }, US)).toEqual({
      ok: false,
      error: "Pick two different pay days between 1 and 31.",
    });
  });

  it("ignores the day fields for other schedules", () => {
    const monthly = validateIncomeForm({ ...base, cadence: "monthly" }, US);
    expect(monthly.ok && monthly.value.payDays).toBeUndefined();
  });
});

describe("validateAppointmentForm", () => {
  const base = {
    title: " Dentist ",
    date: "2026-10-13",
    time: "15:00",
    durationMinutes: 60,
    location: "Makati",
    remindMinutesBefore: 60 as number | undefined,
  };

  it("builds an event draft at the user's UTC offset", () => {
    expect(validateAppointmentForm(base, "+08:00")).toEqual({
      ok: true,
      value: {
        title: "Dentist",
        startAt: "2026-10-13T15:00:00+08:00",
        durationMinutes: 60,
        location: "Makati",
        remindMinutesBefore: 60,
      },
    });
  });

  it("needs a title and a valid 24-hour time", () => {
    expect(validateAppointmentForm({ ...base, title: "" }, "+08:00")).toEqual({
      ok: false,
      error: "What's the appointment?",
    });
    expect(validateAppointmentForm({ ...base, time: "3pm" }, "+08:00")).toEqual({
      ok: false,
      error: "Use a time like 15:00.",
    });
  });
});

describe("dateForChoice", () => {
  it("resolves today / yesterday / tomorrow from a given day", () => {
    expect(dateForChoice("today", "2026-10-01")).toBe("2026-10-01");
    expect(dateForChoice("yesterday", "2026-10-01")).toBe("2026-09-30");
    expect(dateForChoice("tomorrow", "2026-12-31")).toBe("2027-01-01");
  });
});

describe("validateAlarmForm", () => {
  it("pads the hour and minute and trims the label", () => {
    expect(validateAlarmForm({ hour: "6", minute: "5", label: "  Wake up " })).toEqual({
      ok: true,
      value: { time: "06:05", label: "Wake up" },
    });
  });

  it("treats a blank label as none", () => {
    expect(validateAlarmForm({ hour: "23", minute: "59", label: " " })).toEqual({
      ok: true,
      value: { time: "23:59", label: undefined },
    });
  });

  it("rejects an hour or minute out of range, or not a number", () => {
    expect(validateAlarmForm({ hour: "24", minute: "00", label: "" }).ok).toBe(false);
    expect(validateAlarmForm({ hour: "07", minute: "60", label: "" }).ok).toBe(false);
    expect(validateAlarmForm({ hour: "", minute: "30", label: "" }).ok).toBe(false);
    expect(validateAlarmForm({ hour: "7a", minute: "30", label: "" }).ok).toBe(false);
  });
});
