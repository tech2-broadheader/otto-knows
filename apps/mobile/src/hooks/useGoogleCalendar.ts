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
      setMessage("Connected. Tap “Sync today” to pull today’s events.");
    } else if (result.reason === "not-configured") {
      setMessage("Google Calendar isn’t set up in this build (missing client id).");
    } else if (result.reason === "cancelled") {
      setMessage("Sign-in was cancelled.");
    } else {
      setMessage("Couldn’t connect. Please try again.");
    }
    await refreshConnected();
    setBusy(false);
  }, [refreshConnected]);

  const syncToday = useCallback(async () => {
    setBusy(true);
    setMessage(undefined);
    const result = await syncTodayGoogleCalendar(deps, (userId) => consentRepository.list(userId));
    if (result.ok) {
      setMessage(`Synced ${result.count} event${result.count === 1 ? "" : "s"} for today.`);
    } else if (result.reason === "consent-required") {
      setMessage("Turn on the Calendar source above before syncing.");
    } else if (result.reason === "not-connected") {
      setMessage("Connect your Google account first.");
    } else if (result.reason === "not-configured") {
      setMessage("Google Calendar isn’t set up in this build (missing client id).");
    } else {
      setMessage("Couldn’t sync today’s events. Please try again.");
    }
    setBusy(false);
  }, [deps]);

  const disconnect = useCallback(async () => {
    setBusy(true);
    await disconnectGoogleCalendar();
    setMessage("Disconnected. Otto will stop pulling new calendar events.");
    await refreshConnected();
    setBusy(false);
  }, [refreshConnected]);

  return { configured, connected, busy, message, connect, syncToday, disconnect };
}
