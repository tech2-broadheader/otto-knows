// Otto ↔ the Android alarm module (story 12.3, ADR-005). Every alarm change in
// Otto's database is mirrored here; at start-up the two are reconciled. Where
// the native module isn't built in (Expo Go, iOS) alarms are saved but can't
// ring, and the UI says so.
import type { Alarm } from "@otto/schemas";
import { OttoAlarm } from "../../modules/otto-alarm";
import { alarmRepository } from "../data";
import { reconcileAlarms, toNativeAlarm } from "./alarm-sync";
import { nowIso } from "./datetime";

export type AlarmPermissions = {
  /** The native module is present (an Android dev/production build). */
  supported: boolean;
  /** "Alarms & reminders" granted: alarms ring on the minute. */
  exact: boolean;
  /** Full-screen ringing allowed on the lock screen. */
  fullScreen: boolean;
};

export function alarmPermissions(): AlarmPermissions {
  if (!OttoAlarm) return { supported: false, exact: false, fullScreen: false };
  return {
    supported: true,
    exact: OttoAlarm.canScheduleExact(),
    fullScreen: OttoAlarm.canUseFullScreen(),
  };
}

export function openExactAlarmSettings(): void {
  OttoAlarm?.openExactAlarmSettings();
}

export function openFullScreenSettings(): void {
  OttoAlarm?.openFullScreenSettings();
}

/** Arm an enabled alarm on the phone, or cancel a switched-off one. */
export function syncAlarmToPhone(alarm: Alarm): void {
  if (!OttoAlarm) return;
  if (alarm.enabled) OttoAlarm.set(toNativeAlarm(alarm));
  else OttoAlarm.cancel(alarm.id);
}

export function removeAlarmFromPhone(id: string): void {
  OttoAlarm?.cancel(id);
}

/**
 * Bring the phone in line with Otto's alarms (app start): re-arm lost repeats,
 * switch off one-off alarms that already rang, cancel anything stale.
 */
export async function reconcileAlarmsWithPhone(userId: string): Promise<void> {
  if (!OttoAlarm) return;
  const alarms = await alarmRepository.list(userId);
  const plan = reconcileAlarms(alarms, OttoAlarm.armedIds());
  for (const alarm of plan.rearm) OttoAlarm.set(toNativeAlarm(alarm));
  for (const id of plan.cancel) OttoAlarm.cancel(id);
  for (const alarm of plan.switchOff) {
    await alarmRepository.update({ ...alarm, enabled: false, updatedAt: nowIso() });
  }
}
