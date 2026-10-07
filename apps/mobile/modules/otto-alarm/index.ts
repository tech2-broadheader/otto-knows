// Otto's Android alarm module (story 12.3, ADR-005). Null where the native code
// isn't built in (Expo Go, iOS, tests) — callers degrade to "alarms unavailable".
import { requireOptionalNativeModule } from "expo";

export type NativeAlarmInput = {
  id: string;
  hour: number;
  minute: number;
  days: number[];
  label: string;
  snoozeMinutes: number;
  vibrate: boolean;
};

export interface OttoAlarmNative {
  /** "Alarms & reminders" granted (always true below Android 12). */
  canScheduleExact(): boolean;
  /** Full-screen ringing allowed (always true below Android 14). */
  canUseFullScreen(): boolean;
  openExactAlarmSettings(): void;
  openFullScreenSettings(): void;
  /** Arms the alarm; returns its next ring time in epoch ms. */
  set(alarm: NativeAlarmInput): number;
  cancel(id: string): void;
  /** Ids of alarms currently armed on the phone. */
  armedIds(): string[];
}

export const OttoAlarm = requireOptionalNativeModule<OttoAlarmNative>("OttoAlarm");
