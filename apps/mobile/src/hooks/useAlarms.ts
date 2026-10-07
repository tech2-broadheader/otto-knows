// Alarms state (story 12.3): list, save, switch on/off, delete — each change is
// mirrored to the Android alarm module — plus the next alarm and whether the
// phone lets alarms ring on time. Permissions are re-read when Otto returns to
// the foreground (the user may have just granted them in system settings).
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";
import { alarmSchema, type Alarm } from "@otto/schemas";
import { formatTimeUntil, nextAlarm } from "@otto/core";
import type { LoadState } from "../components/AsyncBoundary";
import { alarmRepository } from "../data";
import {
  alarmPermissions,
  reconcileAlarmsWithPhone,
  removeAlarmFromPhone,
  syncAlarmToPhone,
  type AlarmPermissions,
} from "../lib/alarms";
import { LOCAL_USER_ID } from "../lib/constants";
import { nowIso, todayDate } from "../lib/datetime";
import { newUuid } from "../lib/id";
import { requestNotificationPermission } from "../notifications";

export type AlarmInput = Pick<Alarm, "time" | "label" | "repeatDays" | "vibrate" | "snoozeMinutes">;

export type AlarmsState = {
  state: LoadState;
  error?: string;
  /** Sorted by time of day. */
  alarms: Alarm[];
  get: (id: string) => Alarm | undefined;
  /** "Wake up, 06:00" and "7 h 20 min", or null when nothing is on. */
  next: { alarm: Alarm; inText: string } | null;
  permissions: AlarmPermissions;
  save: (input: AlarmInput, id?: string) => Promise<Alarm>;
  setEnabled: (id: string, enabled: boolean) => Promise<void>;
  remove: (id: string) => Promise<void>;
  reload: () => Promise<void>;
};

function nowLocal(): { date: string; time: string } {
  const now = new Date();
  const pad = (n: number): string => `${n}`.padStart(2, "0");
  return { date: todayDate(now), time: `${pad(now.getHours())}:${pad(now.getMinutes())}` };
}

export function useAlarms(): AlarmsState {
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | undefined>();
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [permissions, setPermissions] = useState<AlarmPermissions>(() => alarmPermissions());

  const reload = useCallback(async () => {
    setState("loading");
    try {
      // One-off alarms that rang while Otto was closed get switched off here.
      await reconcileAlarmsWithPhone(LOCAL_USER_ID);
      const list = await alarmRepository.list(LOCAL_USER_ID);
      setAlarms(list.sort((a, b) => a.time.localeCompare(b.time)));
      setPermissions(alarmPermissions());
      setState("ready");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load your alarms.");
      setState("error");
    }
  }, []);

  useEffect(() => {
    void reload();
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") void reload();
    });
    return () => sub.remove();
  }, [reload]);

  const get = useCallback((id: string) => alarms.find((a) => a.id === id), [alarms]);

  const next = useMemo(() => {
    const found = nextAlarm(alarms, nowLocal());
    return found ? { alarm: found.alarm, inText: formatTimeUntil(found.minutesUntil) } : null;
  }, [alarms]);

  const save = useCallback(
    async (input: AlarmInput, id?: string) => {
      const existing = id ? alarms.find((a) => a.id === id) : undefined;
      const now = nowIso();
      const alarm = alarmSchema.parse({
        ...existing,
        ...input,
        id: existing?.id ?? newUuid(),
        userId: LOCAL_USER_ID,
        // Saving an alarm means the user wants it to ring.
        enabled: true,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      });
      // Android 13+ needs notification permission for the alarm to show.
      await requestNotificationPermission();
      const saved = existing
        ? await alarmRepository.update(alarm)
        : await alarmRepository.create(alarm);
      syncAlarmToPhone(saved);
      await reload();
      return saved;
    },
    [alarms, reload],
  );

  const setEnabled = useCallback(
    async (id: string, enabled: boolean) => {
      const alarm = alarms.find((a) => a.id === id);
      if (!alarm) return;
      const saved = await alarmRepository.update({ ...alarm, enabled, updatedAt: nowIso() });
      syncAlarmToPhone(saved);
      await reload();
    },
    [alarms, reload],
  );

  const remove = useCallback(
    async (id: string) => {
      await alarmRepository.delete(LOCAL_USER_ID, id);
      removeAlarmFromPhone(id);
      await reload();
    },
    [reload],
  );

  return { state, error, alarms, get, next, permissions, save, setEnabled, remove, reload };
}
