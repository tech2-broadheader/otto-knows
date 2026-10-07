# Story 12.3: Alarms

Status: review — built 2026-10-08; the native module compiles; needs an on-device check (dev build) before done

## Story

As an Otto user, I want real alarms (time, repeat days, label, on/off) that ring with sound and a full-screen screen, even when Otto is closed or the phone restarted, so that I can rely on Otto for waking up and can't-miss moments.

## Acceptance Criteria

1. **AC1** Create / edit / delete alarms: time, repeat days, label, on/off.
2. **AC2** Alarm rings with sound and full-screen UI (as policy allows), with Snooze and Dismiss.
3. **AC3** Alarms survive reboot and app kill; the permission flow explains why exact alarms are needed and degrades to a high-priority notification if denied.
4. **AC4** Optional: a "wake" routine anchor can create a matching alarm (propose-and-confirm). **Not built** (optional; follow-up).

## Decisions

- ADR-005 accepted by the product owner on 2026-10-08 ("go with alarms"): in-repo Expo module, `SCHEDULE_EXACT_ALARM` path.
- Approved design: canvas "Otto — Budgeting+ & Daily Tasks screens", row "Still to build" (Alarms list, New alarm, Alarm ringing), docs/ux-spec.md §9.

## Tasks / Subtasks

- [x] Contract: `alarmSchema` (packages/schemas/src/alarms.ts) — HH:mm, unique repeat days, label ≤ 60, enabled, vibrate, snooze 5/10/15 (4 tests)
- [x] Core: `nextAlarmAt`, `nextAlarm`, `describeRepeat`, `formatTimeUntil` on local wall-clock time (6 tests)
- [x] Data: migration step 8 `alarms` table (+ upgrade test), Drizzle table, mappers (+ round-trip test), `alarmRepository`, wipe list, export-my-data includes alarms
- [x] Bridge: `toNativeAlarm` + `reconcileAlarms` (4 tests); `lib/alarms.ts` mirrors every change to the module and reconciles at boot and on screen focus
- [x] Native module `apps/mobile/modules/otto-alarm` (Kotlin): `setAlarmClock` / inexact fallback, insistent alarm notification + full-screen intent, native ringing screen, Snooze / Dismiss (screen and notification actions), re-arm on boot / update / clock / timezone / permission change, native store of armed alarms
- [x] UI: Reminders → fourth "Alarms" segment ("Appts" shortened), next-alarm line, list with switches, notices that open "Alarms & reminders" / full-screen settings; New / Edit alarm form with Delete; form validation (3 tests)
- [ ] On-device check in a dev build (EAS or `expo run:android`): ring when closed, after reboot, with the permission denied, snooze and dismiss, lock screen

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (claude-opus-5-5)

### Completion Notes

- Verification: typecheck clean; lint 0; 529 tests pass (schemas 56, core 143, mobile 219, web 111). `expo prebuild` + `./gradlew :otto-alarm:compileDebugKotlin` → BUILD SUCCESSFUL (JDK 21; the machine's `JAVA_HOME` points to a missing folder, so it was overridden for the command only). The generated `android/` folder is git-ignored; `prebuild`'s edit to package.json scripts was reverted.
- App level: `:app:processDebugMainManifest` + `:app:compileDebugKotlin` → BUILD SUCCESSFUL; the merged manifest has the alarm permissions, receivers and AlarmActivity, and no `USE_EXACT_ALARM`. A full local `assembleDebug` stops in react-native-safe-area-context's C++ build on the Windows 260-character path limit (unrelated to alarms; EAS builds on Linux, or enable Windows long paths / move the repo to a shorter path).
- Not verified: nothing has run on a phone or emulator yet. Kotlin has no unit tests (the scheduling rule mirrors the tested TS `nextAlarmAt`).
- Differences from the approved design (deliberate, for the owner to accept):
  - The ringing screen is native Android, not React Native, so it opens instantly on a locked phone without starting the JS app. It uses the system font, not the app fonts, and leaves out the design's "about your day" line (that data is not available natively when the alarm fires).
  - Sound is the phone's default alarm sound and is shown as plain text (no picker in v1).
  - The schema and TDD tests for the contract were written together with the code in one step (the rest followed red → green).
- iOS / Expo Go: the module is absent; alarms save but cannot ring, and the Alarms tab says so.
- Play: no `USE_EXACT_ALARM`; full-screen intent needs the Play Console declaration / user grant on Android 14+ (GATE-4, re-check at release).

### File List

- packages/schemas/src/alarms.ts, alarms.test.ts, index.ts
- packages/core/src/alarms.ts, alarms.test.ts, index.ts
- apps/mobile/modules/otto-alarm/ (expo-module.config.json, index.ts, android/build.gradle, android/src/main/AndroidManifest.xml, Kotlin: OttoAlarmModule, AlarmSpec, AlarmStore, AlarmScheduler, AlarmReceiver, RearmReceiver, AlarmNotifier, AlarmActivity)
- apps/mobile/src/db/migration-steps.ts, schema.ts, migrations.test.ts
- apps/mobile/src/data/mappers.ts, mappers.test.ts, repositories.ts, privacy.ts
- apps/mobile/src/lib/alarm-sync.ts, alarm-sync.test.ts, alarms.ts, forms.ts, forms.test.ts, data-export.test.ts
- apps/mobile/src/hooks/useAlarms.ts
- apps/mobile/src/components/AlarmsSection.tsx
- apps/mobile/src/screens/AlarmFormScreen.tsx, RemindersScreen.tsx, YourDataScreen.tsx
- apps/mobile/App.tsx

### Change Log

- 2026-10-08: Story implemented (status → review).
