# Story 12.2: Alarms spike (GATE-4)

Status: done — ADR-005 approved by the product owner on 2026-10-08 ("go with alarms")

## Question

How can Otto ring a real alarm on Android (sound + full-screen, snooze/dismiss, survives reboot/app kill) in a way Google Play will accept, from an Expo dev build?

## Findings — platform & policy (verified 2026-10-08)

1. **Exact alarms are restricted.** On Android 14+, `SCHEDULE_EXACT_ALARM` is *denied by default* for newly installed apps targeting Android 13+; the user must grant it in system settings. `setAlarmClock()`, `setExact()` and `setExactAndAllowWhileIdle()` throw `SecurityException` without it. Apps must degrade gracefully (inexact `setAndAllowWhileIdle()` / `setWindow()`). [Android 14: schedule exact alarms](https://developer.android.com/about/versions/14/changes/schedule-exact-alarms)
2. **`USE_EXACT_ALARM`** (granted at install, not revocable) is reserved by Play policy for apps whose **core functionality** is an alarm clock or calendar; apps that don't qualify are rejected at review. [Android 13 exact alarm restrictions (Esper)](https://www.esper.io/blog/android-13-exact-alarm-api-restrictions) · [Play permission compliance overview](https://www.technetexperts.com/android-play-store-permissions/) · [Upcoming Play policies](https://support.google.com/googleplay/android-developer/answer/14554661)
3. **Full-screen intents.** For apps targeting Android 14+, Play auto-grants `USE_FULL_SCREEN_INTENT` only to apps with **calling or alarm** functionality (Play Console declaration required since 2024-05-31; enforced from 2025-01-22). Others must ask the user. [Foreground service & full-screen intent requirements](https://support.google.com/googleplay/android-developer/answer/13392821) · [AOSP: full-screen intent limits](https://source.android.com/docs/core/permissions/fsi-limits)

**Implication for Otto:** Otto is a daily assistant whose features include alarms and a calendar, but its *core* function is not "alarm clock". Declaring `USE_EXACT_ALARM` risks rejection. The safe path is `SCHEDULE_EXACT_ALARM` + an in-app explainer that opens the system "Alarms & reminders" setting, with graceful fallback.

## Findings — implementation options

| Option | Status | Assessment |
|---|---|---|
| `expo-alarm-module` (npm) | Last release 1.2.0 on 2025-04-06; Android-only; single maintainer; MIT | Fits Expo (config plugin) but thin maintenance — risky for a core feature |
| `react-native-alarm-module` | Author states it is no longer updated | Rejected |
| `@notifee/react-native` | Last registry update 2024-12-20 (v9.1.8) | Trigger notifications, not true ringing alarms; maintenance unclear — not chosen |
| **Own small Expo Module (Expo Modules API, Kotlin)** wrapping `AlarmManager.setAlarmClock` + a high-priority full-screen notification + a boot receiver | No third-party dependency | **Recommended** — small surface (schedule/cancel/list, permission check, open settings), fully under our control, testable on device |

Sources: [expo-alarm-module (npm)](https://npmjs.com/package/expo-alarm-module) · [react-native-alarm-module](https://github.com/jd1378/react-native-alarm-module) · [Expo forums: alarm clock without detaching](https://forums.expo.dev/t/alarm-clock-without-detaching-from-expo/23549) · [AlarmManagerCompat](https://developer.android.com/reference/androidx/core/app/AlarmManagerCompat)

## Recommendation (proposed ADR-005)

- Build an in-repo Expo module `apps/mobile/modules/otto-alarm` (Expo Modules API; no new npm dependency) exposing: `canScheduleExact()`, `openExactAlarmSettings()`, `schedule({ id, at, label, snoozeMinutes })`, `cancel(id)`, `listScheduled()`.
- Manifest: `SCHEDULE_EXACT_ALARM` (not `USE_EXACT_ALARM`), `USE_FULL_SCREEN_INTENT` (request from user on Android 14+), `RECEIVE_BOOT_COMPLETED`, `POST_NOTIFICATIONS`.
- Ring via a full-screen, high-priority notification with Snooze / Dismiss actions; re-register alarms on boot from the local DB.
- Fallback when exact alarms are denied: schedule an inexact alarm + tell the user it may be a few minutes late, with a button to grant the permission.
- iOS (later): no third-party alarm API equivalent; use time-sensitive local notifications.

## Decision needed from the product owner

1. Approve the in-repo native Expo module approach (ADR-005), or prefer `expo-alarm-module` despite its maintenance risk.
2. Accept the `SCHEDULE_EXACT_ALARM` path (user grants "Alarms & reminders" once) rather than claiming alarm-clock core functionality.

GATE-4 status: **policy verified 2026-10-08**; re-check at release time, since Play policy changes.

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (claude-opus-5-5)

### Completion Notes List

- Web research 2026-10-08 (sources above). npm publish dates read from the registry (`npm view <pkg> time`).
