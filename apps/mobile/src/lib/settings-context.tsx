// The user's home currency, locale and timezone (story 13.1), loaded once at
// boot by App.tsx and read anywhere with useSettings(). Until boot finishes the
// value is the device's suggestion, so screens never format with a hard-coded
// locale.
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { formatMoney, formatShortDate, suggestSettings } from "@otto/core";
import type { UserSettings } from "@otto/schemas";
import { LOCAL_USER_ID } from "./constants";
import { readDeviceLocale } from "./device-locale";
import { currencySymbol } from "./money";

/** What the device suggests, as a complete settings value (used before load). */
export function deviceSettings(userId: string = LOCAL_USER_ID): UserSettings {
  const device = readDeviceLocale();
  return { userId, ...suggestSettings(device.locale, device.timeZone) };
}

const SettingsContext = createContext<UserSettings>(deviceSettings());

export function SettingsProvider({
  value,
  children,
}: {
  value: UserSettings;
  children: ReactNode;
}): React.JSX.Element {
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

/** The user's home currency, locale and timezone. */
export function useSettings(): UserSettings {
  return useContext(SettingsContext);
}

export type MoneyFormat = {
  currency: UserSettings["currency"];
  locale: string;
  /** Minor units → "$1,234.50" in the user's currency and locale. */
  format: (amountMinor: number) => string;
  /** The currency's symbol for input prefixes ("$", "€", "₱"). */
  symbol: string;
  /** "2026-10-15" → "Oct 15" / "15 Oct". */
  shortDate: (date: string) => string;
};

/** Money and date formatting bound to the user's settings (story 13.1). */
export function useMoney(): MoneyFormat {
  const { currency, locale } = useSettings();
  return useMemo(
    () => ({
      currency,
      locale,
      format: (amountMinor: number) => formatMoney({ amountMinor, currency }, locale),
      symbol: currencySymbol(currency, locale),
      shortDate: (date: string) => formatShortDate(date, locale),
    }),
    [currency, locale],
  );
}
