// The user's home currency, locale and timezone (story 13.1), loaded once at
// boot by App.tsx and read anywhere with useSettings(). Until boot finishes the
// value is the device's suggestion, so screens never format with a hard-coded
// locale.
import { createContext, useContext, type ReactNode } from "react";
import { suggestSettings } from "@otto/core";
import type { UserSettings } from "@otto/schemas";
import { LOCAL_USER_ID } from "./constants";
import { readDeviceLocale } from "./device-locale";

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
