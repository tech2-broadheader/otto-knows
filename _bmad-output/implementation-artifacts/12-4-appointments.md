# Story 12.4: Appointments (calendar write, confirmed)

Status: in-progress — Otto appointments + UI done; device/Google destinations wait for expo-calendar approval and 3.4 live

## Story

As someone juggling appointments,
I want to add an appointment in Otto (by typing or tapping) and have it show on my day with a heads-up before it,
so that my dentist, meetings and errands live next to my reminders and budget.

## Acceptance Criteria

1. Create an appointment: title, start, end (or duration), optional location, notes, and "remind me N minutes before".
2. Destination: **Otto** (stored on device) now; **device calendar** (`expo-calendar`) and **Google Calendar** later in this story once approved.
3. Writes are propose-and-confirm; nothing is created until the user taps Confirm.
4. Quick-add "dentist Tue 3pm" → `create_event` proposal; accepting creates the appointment and, when asked, a reminder before it.
5. Appointments appear on the Today timeline on their day.
6. Google write needs the `calendar.events` scope, requested only when the user first saves to Google (incremental consent).

## Tasks / Subtasks

**Design-independent, no new dependency**

- [ ] **Task 1 — Contract** (AC 1, 3, 4): `appointmentSchema` (`packages/schemas/src/appointments.ts`; end after start; title ≤ 140; notes ≤ 2,000; reminder 0–10,080 min); `eventDraftSchema` + `create_event` proposal action. Tests.
- [ ] **Task 2 — Storage** (AC 1): migration step 5 `appointments` table (own table — never mixed with synced provider events); Drizzle + wipe list; mappers; `appointmentRepository` (non-sensitive tier, like reminders).
- [ ] **Task 3 — Today** (AC 5): `DaySources.appointments`, projected as `event` items on their start date.
- [ ] **Task 4 — Quick-add** (AC 3, 4): `appointmentFromDraft`, `reminderBeforeAppointment`; `applyProposal` case; LLM tool `create_event` + prompt; proposal display tables.

**Needs approval / design**

- [ ] **Task 5 — Device calendar** (AC 2): `expo-calendar` (owner approval), write on confirm, store `externalId`.
- [ ] **Task 6 — Google Calendar** (AC 2, 6): `calendar.events` incremental scope + server insert route; depends on 3.4 live.
- [x] **Task 7 — Screens**: appointment form + destination picker per approved design.
- [ ] **Task 8 — Gates** + manual check.

## Dev Notes

- Own `appointments` table: a future provider sync that replaces `calendar_events` can never delete user-created appointments, and no calendar-source consent is needed for data the user typed.
- The reminder-before is an ordinary reminder (existing notification scheduling picks it up).

### References
- [Source: epics-and-stories.md#Story 12.4] · [Source: sprint-change-proposal-2026-10-08.md] · [Source: packages/core/src/context-graph.ts]

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (claude-opus-5-5)

### Completion Notes List

- UI built 2026-10-08 from the approved design (canvas "Otto — Budgeting+ & Daily Tasks screens"), on the user's currency/locale (story 13.1). Pure form validation in `apps/mobile/src/lib/forms.ts` (14 tests); screens are not unit-tested (project convention) — verified by typecheck, lint and a full Android Metro/Hermes bundle (`expo export`). **Manual on-device check still pending.**
- `AppointmentFormScreen` (date chips, 24-hour time, length, where, remind-me, destination list with phone/Google shown disabled); Appointments view in the Reminders tab with delete; heads-up reminder triggers a notification reschedule.

- Tasks 1–4 implemented 2026-10-08, tests first (schema, core, migration, mapper and LLM suites each seen failing):
  - `appointmentSchema` (end after start; destination default `otto`), `eventDraftSchema` (end time or duration required), `create_event` proposal action.
  - Migration step 5 (`appointments` table, own table), Drizzle + wipe list, mappers, `appointmentRepository`.
  - Core `addMinutesToIso` (keeps the UTC offset; `Z` written as `+00:00`); `DaySources.appointments` projected as `event` items (source `events`, meta `appointment: true`) only on their start date.
  - Quick-add: `appointmentFromDraft` (end from duration), `reminderBeforeAppointment` ("Dentist at 15:00", using the existing 24-hour `timeLabel`); `applyProposal` creates both; LLM tool `create_event` + prompt (assume 60 min when no duration); proposal tables updated (mobile + web playground).
  - Today loads appointments without source consent (user-created data).
  - Gates: typecheck ✅, tests ✅ 458 (schemas 44, core 126, mobile 177, web 111), lint ✅, web build ✅.
- Remaining: Task 5 (expo-calendar — needs approval), Task 6 (Google write — needs 3.4 live + `calendar.events` scope), Task 7 (screens — design), Task 8.

### File List

- packages/schemas/src/appointments.ts (+ test), proposals.ts, index.ts; packages/types/src/index.ts
- packages/core/src/appointments.ts (+ test), context-graph.ts, index.ts
- apps/mobile/src/db/migration-steps.ts, schema.ts, migrations.test.ts; src/data/mappers.ts (+ test), repositories.ts
- apps/mobile/src/lib/proposal-mappers.ts (+ test), apply-proposal.ts; src/hooks/useToday.ts
- apps/mobile/src/components/ProposalCard.tsx, screens/QuickAddScreen.tsx, screens/TodayScreen.tsx
- apps/web/src/server/llm/tools.ts, prompts.ts, llm.test.ts; apps/web/src/app/playground/page.tsx
