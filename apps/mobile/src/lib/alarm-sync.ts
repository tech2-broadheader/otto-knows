// How Otto's alarms map onto the Android alarm module (story 12.3, ADR-005).
// PURE — unit-tested. The module rings alarms on its own (app closed, after a
// reboot); Otto's database is the source of truth, and at start-up the two are
// reconciled.
import type { Alarm, DayOfWeek } from "@otto/schemas";
import { t } from "../i18n";

/** What the native module needs to arm one alarm. */
export type NativeAlarm = {
  id: string;
  hour: number;
  minute: number;
  /** ISO weekdays, Mon = 1 … Sun = 7, ascending; empty = rings once. */
  days: number[];
  label: string;
  snoozeMinutes: number;
  vibrate: boolean;
};

const ISO_DAY: Record<DayOfWeek, number> = {
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
  sun: 7,
};

/** Also shown by the native module on the ringing screen. */
export const DEFAULT_ALARM_LABEL = t("tasks.alarms.defaultLabel");

export function toNativeAlarm(alarm: Alarm): NativeAlarm {
  const [hour, minute] = alarm.time.split(":").map(Number);
  return {
    id: alarm.id,
    hour: hour ?? 0,
    minute: minute ?? 0,
    days: alarm.repeatDays.map((d) => ISO_DAY[d]).sort((a, b) => a - b),
    label: alarm.label ?? DEFAULT_ALARM_LABEL,
    snoozeMinutes: alarm.snoozeMinutes,
    vibrate: alarm.vibrate,
  };
}

/**
 * Compare Otto's alarms with the ids the phone has armed.
 * - An enabled repeating alarm the phone lost is re-armed.
 * - An enabled one-off alarm the phone no longer holds has already rung (the
 *   module drops one-offs when they fire), so it is switched off, like a clock app.
 * - Anything armed that Otto no longer has enabled is cancelled.
 */
export function reconcileAlarms(
  alarms: readonly Alarm[],
  armedIds: readonly string[],
): { rearm: Alarm[]; switchOff: Alarm[]; cancel: string[] } {
  const armed = new Set(armedIds);
  const enabled = new Set(alarms.filter((a) => a.enabled).map((a) => a.id));
  const missing = alarms.filter((a) => a.enabled && !armed.has(a.id));
  return {
    rearm: missing.filter((a) => a.repeatDays.length > 0),
    switchOff: missing.filter((a) => a.repeatDays.length === 0),
    cancel: armedIds.filter((id) => !enabled.has(id)),
  };
}
