// State for the on-device Google Calendar connect action (Story 3.1). Wraps the
// connector so a Settings card can connect, sync today's events, and disconnect —
// all explicit user actions. Surfaces a clear, friendly status string and never
// throws into the UI (the connector returns typed results; missing config no-ops).
import { useCallback, useEffect, useState } from "react";
import { consentRepository, type RepositoryDeps } from "../data";
import {
  connectGoogleCalendar,
  disconnectGoogleCalendar,
  isGoogleCalendarConfigured,
  isGoogleCalendarConnected,
  syncTodayGoogleCalendar,
} from "../connectors/google-calendar";
import { t } from "../i18n";

export type GoogleCalendarState = {
  /** True when EXPO_PUBLIC_GOOGLE_CLIENT_ID is set (flow can run). */
  configured: boolean;
  /** True when a token is stored on device. */
  connected: boolean;
  busy: boolean;
  /** Friendly status message for the UI. */
  message?: string;
  connect: () => Promise<void>;
  syncToday: () => Promise<void>;
  disconnect: () => Promise<void>;
};

export function useGoogleCalendar(deps: RepositoryDeps): GoogleCalendarState {
  const configured = isGoogleCalendarConfigured();
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | undefined>();

  const refreshConnected = useCallback(async () => {
    setConnected(await isGoogleCalendarConnected());
  }, []);

  useEffect(() => {
    void refreshConnected();
  }, [refreshConnected]);

  const connect = useCallback(async () => {
    setBusy(true);
    setMessage(undefined);
    const result = await connectGoogleCalendar();
    if (result.ok) {
      setMessage(t("account.googleCalendar.connected"));
    } else if (result.reason === "not-configured") {
      setMessage(t("account.googleCalendar.notConfigured"));
    } else if (result.reason === "cancelled") {
      setMessage(t("account.googleCalendar.cancelled"));
    } else {
      setMessage(t("account.googleCalendar.connectFailed"));
    }
    await refreshConnected();
    setBusy(false);
  }, [refreshConnected]);

  const syncToday = useCallback(async () => {
    setBusy(true);
    setMessage(undefined);
    const result = await syncTodayGoogleCalendar(deps, (userId) => consentRepository.list(userId));
    if (result.ok) {
      setMessage(t("account.googleCalendar.synced", { count: result.count }));
    } else if (result.reason === "consent-required") {
      setMessage(t("account.googleCalendar.consentRequired"));
    } else if (result.reason === "not-connected") {
      setMessage(t("account.googleCalendar.notConnected"));
    } else if (result.reason === "not-configured") {
      setMessage(t("account.googleCalendar.notConfigured"));
    } else {
      setMessage(t("account.googleCalendar.syncFailed"));
    }
    setBusy(false);
  }, [deps]);

  const disconnect = useCallback(async () => {
    setBusy(true);
    await disconnectGoogleCalendar();
    setMessage(t("account.googleCalendar.disconnected"));
    await refreshConnected();
    setBusy(false);
  }, [refreshConnected]);

  return { configured, connected, busy, message, connect, syncToday, disconnect };
}
