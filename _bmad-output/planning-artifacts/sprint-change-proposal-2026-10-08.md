# Sprint Change Proposal — Daily tasks, token storage, billing (2026-10-08)

| | |
|--|--|
| Date | 2026-10-08 |
| Trigger | Product owner: plan the remaining requested items ("alarm, reminders, notes, appointments, setting of meetings") plus open pre-launch gaps |
| Change type | New requirements (additive) + detailing of existing epics |
| Scope classification | **Moderate** — one new epic (E12), one new story in E3, E9 detailed |
| Status | **Approved** by product owner 2026-10-08 ("plan it … make it happen") |

---

## 1. Issue summary

The product owner defined the product as **(1) Budgeting** and **(3) small daily tasks: alarms, reminders, notes, appointments, setting meetings** (2026-10-07). Budgeting is planned (E11). Of the daily tasks, only reminders exist. Two pre-launch gaps found in the 2026-10-07 review also have no story: connector tokens are kept only in server memory, and nothing grants Pro after payment.

Evidence:
- No notes entity/screen; `reminderSchema.notes` is a field, not a notes feature.
- Notifications only (`expo-notifications`); no alarm capability (no full-screen ringing alarm, no snooze-as-alarm).
- Calendar access is **read-only by design** (`GOOGLE_CALENDAR_READONLY_SCOPE` in `apps/web/src/server/google-oauth.ts`); no `expo-calendar` for the device calendar.
- `apps/web/src/server/token-store.ts`: `InMemoryTokenStore` with `// TODO: persist encrypted in Supabase`.
- `.env.example` has `REVENUECAT_PUBLIC_SDK_KEY` commented out; no billing code writes `profiles.entitlement`.

## 2. Impact analysis

| Area | Impact |
|------|--------|
| **New E12 Daily tasks** | Notes, alarms, appointments (device + Google calendar write), meetings with invites. |
| **E3** | New story 3.4: encrypted persistent connector-token storage. Also prerequisite for calendar write (12.4/12.5) via the web proxy. |
| **E9** | Detailed into stories 9.4–9.6 (store billing via RevenueCat, server-verified entitlement webhook, pricing). |
| **PRD** | FR-D1…FR-D5 added; FR-C4 write-back now includes device/Google calendar events (still propose-and-confirm). |
| **Architecture** | Calendar module gains write path; new ADR-005 (alarms via native module, gated) and ADR-006 (billing via RevenueCat as receipt verifier). |
| **UX** | New screens: Notes, Alarms, Appointment/Meeting form + confirm card. Claude Design pass required. |
| **Compliance gates** | **GATE-4** (new): verify current Google Play policy for exact alarms (`SCHEDULE_EXACT_ALARM` / `USE_EXACT_ALARM`) and full-screen intents (Android 14+) before 12.3. **GATE-5** (new): Google OAuth verification for the sensitive `calendar.events` scope before 12.5 ships. |
| **New dependencies (need owner approval before the story starts)** | `expo-calendar` (12.4); an alarm-capable native module — candidate chosen in spike 12.2; `react-native-purchases` (RevenueCat, 9.4). |

Priority order agreed: **E11 first** → 3.4 → E12 (12.1 notes first, it needs no new deps) → E9 billing (blocked on OD-5 pricing + store accounts).

Default product decisions taken while planning (owner may override):
- Notes, alarms and appointments are **Free** (local, no LLM cost). Natural-language "add a note / set an alarm" via quick-add stays within the existing free quota / Pro rules.
- Meetings with Google invites are **Free** but require a connected Google account.
- Everything that writes to a calendar is **propose-and-confirm** (CLAUDE.md §1.11).
- Medications / health / optimizer / caregiver: still undecided — **kept as-is**.

## 3. Recommended approach

Direct adjustment (add epic + stories). No rollback; MVP not reduced. Effort: E12 Medium–High (alarms are the risk), 3.4 Low–Medium, E9 billing Medium (mostly external setup).

## 4. Detailed changes

### 4.1 Epics & stories — ADD

```
## E12 — Daily tasks (Free core)
Goal: the small things in a day — notes, alarms, appointments, meetings — next to reminders.

### Story 12.1 — Notes
- AC1 Create, edit, delete, pin and search plain-text notes (title optional, body ≤ 10k chars).
- AC2 Notes are stored locally (new migration step) and listed newest-first, pinned on top.
- AC3 A note can be turned into a reminder (propose-and-confirm via the existing proposal card).
- AC4 Quick-add understands "note: …" → `add_note` proposal (new proposal action).
- Contract: NoteSchema; ProposalAction add_note. No new dependency. Design pass required.

### Story 12.2 — Alarms spike (GATE-4)
- AC1 Verify current Google Play policy for exact alarms and full-screen intents; record outcome.
- AC2 Evaluate alarm-capable options for Expo dev builds (maintained native module vs. config
      plugin over AlarmManager) on: ring over silent/DND rules allowed by policy, snooze, reboot
      survival, Android 14+ behavior. Recommend one; record ADR-005.
- AC3 Owner approves the dependency before 12.3 starts.

### Story 12.3 — Alarms
- AC1 Create/edit/delete alarms: time, repeat days, label, on/off.
- AC2 Alarm rings with sound and full-screen UI (as policy allows), with Snooze and Dismiss.
- AC3 Alarms survive reboot and app kill; permission flow explains why exact alarms are needed and
      degrades to a high-priority notification if denied.
- AC4 Optional: "wake" routine anchor can create a matching alarm (propose-and-confirm).
- Depends on: 12.2, GATE-4. Design pass required.

### Story 12.4 — Appointments (calendar write, confirmed)
- AC1 Create an appointment (title, date/time, duration, location, notes, reminder offset).
- AC2 User chooses where it goes: Otto only, device calendar (expo-calendar), or Google Calendar.
- AC3 Writes are propose-and-confirm; nothing is written until the user taps Confirm.
- AC4 Quick-add "dentist Tue 3pm" → `create_event` proposal; scheduling substrate suggests a free
      slot when no time is given.
- AC5 Google write requires a scope upgrade to calendar.events, requested only when the user first
      saves to Google (incremental consent); read-only users keep working.
- Depends on: 3.4 (tokens) for Google path; new dependency expo-calendar (approval). Design pass required.

### Story 12.5 — Meetings with invites
- AC1 Add attendees (email) to an appointment saved to Google Calendar; option to add a Google Meet link.
- AC2 Invites are sent only after explicit confirm, showing exactly who will be emailed.
- AC3 Edit/cancel a meeting Otto created (updates/cancellations sent to attendees after confirm).
- Depends on: 12.4, GATE-5. Design pass required.
```

```
### Story 3.4 — Encrypted persistent connector-token storage (E3)
- AC1 Replace InMemoryTokenStore with a Supabase-backed store (new table connector_tokens:
      user_id, provider, ciphertext, iv, key_version, expires_at, updated_at; RLS: service role only).
- AC2 Tokens encrypted with AES-256-GCM (node:crypto) using TOKEN_ENCRYPTION_KEY from env
      (32 bytes, base64), read via the typed config module; key_version allows rotation.
- AC3 Never log token material; access is audit-logged server-side.
- AC4 Disconnect deletes the row; account deletion (/api/account/delete) purges tokens.
- AC5 Falls back to in-memory ONLY in non-production when Supabase is not configured.
- Contract: StoredToken (existing). No new dependency.
```

```
## E9 — Monetization (detailed)
### Story 9.4 — Store billing via RevenueCat (mobile)
- AC1 Products: Pro monthly, Pro annual, Lifetime (ids per OD-5); paywall uses live offerings.
- AC2 Purchase + restore flows; no client-side entitlement trust.
- Depends on: OD-5 pricing, Google Play Console + RevenueCat accounts; new dependency
  react-native-purchases (approval).
### Story 9.5 — Server entitlement from verified purchases
- AC1 RevenueCat webhook route verifies the authorization header, maps app_user_id → Supabase user,
      writes profiles.entitlement (pro / lifetime / free on expiry).
- AC2 Idempotent; replay-safe; audit-logged. Never trusts client amounts (CLAUDE.md §6).
### Story 9.6 — Pricing & paywall copy (OD-5)
- AC1 Owner decides prices (PHP) for monthly / annual / lifetime; paywall reflects them.
```

### 4.2 PRD — ADD §5.10 Daily tasks
- **FR-D1** Notes: create/edit/pin/search; convert to reminder. [Free]
- **FR-D2** Alarms: ringing alarms with snooze/repeat, policy-compliant. [Free] (GATE-4)
- **FR-D3** Appointments: create to Otto / device / Google calendar — confirmed. [Free]
- **FR-D4** Meetings: Google Calendar invites to attendees — confirmed. [Free, needs Google] (GATE-5)
- **FR-D5** Quick-add understands notes, alarms, appointments. [Free quota / Pro]

### 4.3 Architecture
- §5 calendar row: "Read calendar/events; **create events and meetings (confirmed)**".
- ADR-005 (Proposed): alarm mechanism — decided by spike 12.2.
- ADR-006 (Proposed): billing — RevenueCat verifies store receipts; our server trusts only its webhook.

### 4.4 Sprint status — ADD
`3-4-encrypted-token-storage`, `epic-12` + `12-1…12-5`, `9-4…9-6` (all backlog).

## 5. Handoff

| Role | Action |
|------|--------|
| PM / owner | Approve new dependencies when each story starts; decide OD-5 pricing; confirm the Free/Pro defaults above. |
| Architect | ADR-005 after spike 12.2; ADR-006 before 9.4. |
| UX + Claude Design | Notes, Alarms, Appointment/Meeting screens (needs `/design-login`). |
| Dev | E11 logic now → 3.4 → 12.1 → 12.2 spike → rest as gates clear. |
