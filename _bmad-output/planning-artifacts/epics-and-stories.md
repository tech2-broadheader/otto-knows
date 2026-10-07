# Epics & Stories — Otto (Personal Daily Assistant)

| | |
|--|--|
| Author | BMAD SM (from PRD) |
| Date | 2026-06-14 |
| Status | Draft v1 — Phase 1 stories detailed; later phases epic-level |

> Story IDs are `E.S` (epic.story). Each story has Acceptance Criteria (AC) and the Zod contract it needs (Contract-first, `CLAUDE.md §1.2`). Definition of Ready/Done per `CLAUDE.md §9`. Phase-1 (E1–E4) stories are sequenced for the free organizer core (M3 / v0.5.0).

---

## E1 — Foundation & data model
Goal: a working TS monorepo, shared Zod contracts, on-device store, and the consent spine — everything else builds on this.

### Story 1.1 — Monorepo & tooling scaffold
- **AC1** pnpm monorepo with `/apps/mobile` (Expo + RN + TS strict), `/apps/web` (Next.js App Router), `/packages/schemas`, `/packages/core`, `/packages/types`.
- **AC2** ESLint + Prettier + TS strict pass across the workspace; `@otto/*` workspace imports resolve.
- **AC3** Mobile app boots to a placeholder screen on Android; web app boots to a placeholder route.
- **AC4** Vitest runs in CI; one trivial passing test per package.
- **Contract:** none (scaffold). **Tier-3 note:** no real data yet.

### Story 1.2 — Shared Zod contracts (core entities)
- **AC1** `RoutineSchema`, `RoutineAnchorSchema`, `ReminderSchema`, `BillSchema`, `MedicationSchema`, `IncomeSchema`, `TransactionSchema`, `BudgetCategorySchema`, `ContextItemSchema`, `ConsentSchema` defined in `/packages/schemas`.
- **AC2** Types derived via `z.infer` in `/packages/types`; no hand-maintained duplicates.
- **AC3** Each schema has unit tests for valid + invalid inputs.
- **Contract:** these schemas ARE the contract.

### Story 1.3 — Local store (SQLite + Drizzle)
- **AC1** Drizzle schema + initial migration on `expo-sqlite` matching the Zod entities.
- **AC2** Typed repository functions (create/read/update/delete) validate with the Zod schema at the boundary.
- **AC3** Sensitive fields (finance, health) flagged for encryption at rest; encryption helper in place.
- **AC4** Happy + one error path tested per repository.
- **Contract:** `1.2` schemas.

### Story 1.4 — Consent & privacy spine
- **AC1** Consent record per data source (calendar, finance, health); nothing reads a source until consent is granted.
- **AC2** Consent screen explains *what* and *why* per source; granular toggles; revocable.
- **AC3** Access to finance/health records writes an audit entry (Tier 3).
- **AC4** Export-my-data and delete-my-data stubs wired to the store.
- **Contract:** `ConsentSchema`, `AuditEntrySchema`.
- **Gate:** GATE-3 design review before merge.

---

## E2 — Routine layer (the lens)
Goal: fixed routine anchors and the scheduling substrate that times everything.

### Story 2.1 — Define fixed routine anchors
- **AC1** User adds/edits/removes anchors (label, time, recurrence: daily/weekdays/custom).
- **AC2** Seeded defaults (wake, meds, lunch, wind-down, sleep) offered on first run, all editable.
- **AC3** Anchors persist locally and validate against `RoutineAnchorSchema`.
- **Contract:** `RoutineSchema`, `RoutineAnchorSchema`.

### Story 2.2 — Scheduling substrate (free-space slotting)
- **AC1** Given anchors + fixed commitments, `core` computes free slots for a given day.
- **AC2** A new reminder can be placed "after lunch, before your 2pm block" → resolves to a concrete time.
- **AC3** Pure functions in `/packages/core`, fully unit-tested (boundary/overlap cases).
- **Contract:** `RoutineSchema`, `ReminderSchema`.

---

## E3 — Connectors & context graph
Goal: read calendar/tasks, capture finance manually, unify into the context graph.

### Story 3.1 — Google Calendar / Tasks read (consented)
- **AC1** OAuth connect flow; tokens stored encrypted; read-only scope at first.
- **AC2** Today's events/tasks fetched and normalized into `ContextItem`s.
- **AC3** Disconnect revokes and purges cached items; gated on `ConsentSchema`.
- **Contract:** `ContextItemSchema`, `CalendarEventSchema`.

### Story 3.2 — Manual finance entry + basic budget
- **AC1** Add income (salary, recurring), bills (with due dates), transactions; define budget categories.
- **AC2** Free caps enforced: ~5 bills, ~3 meds, few categories — clear upgrade prompt at cap.
- **AC3** Basic monthly budget view (spent vs category).
- **AC4** All entries validated; finance data encrypted at rest; access audit-logged.
- **Contract:** `IncomeSchema`, `BillSchema`, `TransactionSchema`, `BudgetCategorySchema`, `MedicationSchema`.

### Story 3.3 — Context graph unification
- **AC1** Calendar items, reminders, bills, meds merge into one queryable day model.
- **AC2** Query "what's on today" returns a unified, routine-ordered list.
- **AC3** Pure unification logic in `/packages/core`, tested.
- **Contract:** `ContextItemSchema`.

### Story 3.4 — Encrypted persistent connector-token storage (E3)
- **AC1** Replace InMemoryTokenStore with a Supabase-backed store (new table connector_tokens: user_id, provider, ciphertext, iv, key_version, expires_at, updated_at; RLS: service role only).
- **AC2** Tokens encrypted with AES-256-GCM (node:crypto) using TOKEN_ENCRYPTION_KEY from env (32 bytes, base64), read via the typed config module; key_version allows rotation.
- **AC3** Never log token material; access is audit-logged server-side.
- **AC4** Disconnect deletes the row; account deletion (/api/account/delete) purges tokens.
- **AC5** Falls back to in-memory ONLY in non-production when Supabase is not configured.
- **Contract**: StoredToken (existing). No new dependency. *(added 2026-10-08)*

---

## E4 — Briefing & routine-timed reminders (free)
Goal: the basic daily brief + reminders firing at the right moment, with local notifications.

### Story 4.1 — Routine-timed reminders & local notifications
- **AC1** Reminders (meds, bills, tasks) schedule local notifications anchored to routine times.
- **AC2** Notifications fire at the right moment; tapping opens the relevant item.
- **AC3** Permission requested with clear rationale; degrade gracefully if denied.
- **Contract:** `ReminderSchema`.

### Story 4.2 — Basic "today" briefing
- **AC1** Morning/midday/evening brief composed from the context graph, ordered by routine — **template-based, no LLM** (free tier).
- **AC2** One coherent summary, not a flat dump; empty-state handled.
- **AC3** Brief reachable from home; respects anchors for timing.
- **Contract:** `BriefingSchema`.

---

## E5 — The brain (LLM) [Pro]
Goal: LLM proxy + conversational quick-add + proactive cross-domain reasoning.
- **5.1** Next.js LLM proxy (keys server-side, usage metered, rate-limited, entitlement-checked).
- **5.2** Natural-language quick-add → structured items (free daily quota; unlimited Pro).
- **5.3** Proactive cross-domain briefing (LLM reads context graph through routine lens).
- **5.4** Tool-calling write-back that emits a **proposal** the user confirms (never silent).
- **Depends on:** E1–E4. **Scoped by:** OD-2 (conversational depth).

## E6 — Optimizer & tips [Pro]
- **6.1** Routine optimizer: analyze day → propose reshaped day with reasoning → user confirms (FR-O1; never auto-applies).
- **6.2** Finance tips — general/informational guardrails.
- **6.3** Health tips — gentle, non-medical, no numeric targets / streak-shaming.

## E7 — Adaptive routine & forecasts [Pro]
- **7.1** Adaptive routine: learn actual action times via light heuristics.
- **7.2** Deviation radar (gentle).
- **7.3** Forecasts: overspend prediction, med-refill warnings, payday-vs-bill heads-ups.

## E8 — Health + caregiver [Pro]
- **8.1** Health Connect / HealthKit read (gated, consented). **Gate:** GATE-2.
- **8.2** Caregiver/family mode: relay a linked person's med alerts + bill due dates, mutual revocable consent.

## E9 — Monetization & entitlements
- **9.1** Entitlement model (free / Pro monthly / annual / Lifetime); server-side receipt verification.
- **9.2** Free caps + quota enforcement; upgrade prompts at limits.
- **9.3** No-ads guarantee enforced in code/policy. **Depends on:** OD-5 (pricing).

### Story 9.4 — Store billing via RevenueCat (mobile)
- **AC1** Products: Pro monthly, Pro annual, Lifetime (ids per OD-5); paywall uses live offerings.
- **AC2** Purchase + restore flows; no client-side entitlement trust.
- **Depends** on: OD-5 pricing, Google Play Console + RevenueCat accounts; new dependency
  react-native-purchases (approval).
### Story 9.5 — Server entitlement from verified purchases
- **AC1** RevenueCat webhook route verifies the authorization header, maps app_user_id → Supabase user, writes profiles.entitlement (pro / lifetime / free on expiry).
- **AC2** Idempotent; replay-safe; audit-logged. Never trusts client amounts (CLAUDE.md §6).
### Story 9.6 — Pricing & paywall copy (OD-5)
- **AC1** Owner decides prices (PHP) for monthly / annual / lifetime; paywall reflects them.


## E10 — Continuity & polish [Pro]
- **10.1** Cloud backup + cross-device sync (local→cloud reconciliation on upgrade).
- **10.2** Export (PDF / CSV).
- **10.3** Widgets + themes.

---

## E11 — Budgeting+ (Free core)
Goal: know where your money is, what came in, and how much you can safely spend until payday. Added 2026-10-07 by product-owner direction — see `sprint-change-proposal-2026-10-07.md`. Current priority.

### Story 11.1 — Versioned local DB migrations (enabler)
- **AC1** The mobile store tracks a schema version (SQLite `PRAGMA user_version`) and applies ordered, idempotent migration steps at boot; fresh installs and upgraded installs end at the same schema.
- **AC2** A failed migration is rolled back in a transaction and surfaced as a typed error screen — never a half-migrated database or silent data loss.
- **AC3** Tests: fresh install → latest; v0 (current shipped schema with data) → latest with data preserved; failure path rolls back.
- **Contract:** none (infrastructure). Never edit a shipped migration step.

### Story 11.2 — Wallets / accounts
- **AC1** User can add, rename, archive wallets of type `cash | ewallet | bank | credit_card`, with an optional provider label (e.g. GCash, Maya, BDO) and an opening balance.
- **AC2** Balances are **derived** (opening balance + transactions), never stored as a mutable total. Credit cards show "amount owed" (spending increases it, payments reduce it).
- **AC3** Migration creates a default "Cash" wallet and assigns all existing transactions to it.
- **AC4** Finance screen shows each wallet's balance and a total "money on hand" (cash + e-wallet + bank; credit card owed shown separately).
- **AC5** Free cap: 3 wallets (Pro unlimited) with the standard upgrade prompt.
- **AC6** Wallet data is SENSITIVE: amounts encrypted at rest, access audit-logged.
- **Contract:** `AccountSchema` (new). **Depends on:** 11.1. **Design:** Claude Design pass required.

### Story 11.3 — Income & transfer transactions
- **AC1** A transaction has type `expense | income | transfer`. Expense/income require `accountId`; transfer requires `accountId` (from) and `toAccountId` (to), which must differ.
- **AC2** Add-transaction form has a type picker; transfer shows from/to wallets. Paying a credit card = transfer from a wallet to the card.
- **AC3** Edit and delete transactions; balances update accordingly.
- **AC4** Transfers are excluded from spending totals, budgets, overspend forecasts and tips.
- **AC5** Quick-add `log_expense` proposals resolve to a wallet (last-used, else Cash) and the user can change it before confirming (propose-and-confirm preserved).
- **AC6** Existing data loads as `type=expense` (backward compatible); invalid shapes rejected at the schema boundary.
- **Contract:** `TransactionSchema` (extended), `ExpenseDraftSchema` (optional `accountId`). **Depends on:** 11.2. **Design:** Claude Design pass required.

### Story 11.4 — Safe-to-spend until payday
- **AC1** Core computes: money on hand − unpaid bills due on/before next payday − credit card amount owed = safe-to-spend; plus a per-day figure (÷ days until payday, min 1).
- **AC2** Next payday is derived from each Income's cadence and advances automatically once passed (fixes stale `nextPayDate`; payday-vs-bill nudge uses the same function).
- **AC3** Shown as the hero number on Finance and as a line in the Today briefing ("₱3,200 safe to spend until the 15th — about ₱400/day").
- **AC4** Edge cases handled with gentle copy: no income set up, payday today, negative result ("Bills before payday exceed what's on hand by ₱X" — never scolding).
- **AC5** Pure functions in `/packages/core` with boundary tests (month ends, semi-monthly 15/30, February, payday = today, no bills, overdue bills).
- **Contract:** `SafeToSpendSchema` (new). Free tier. **Depends on:** 11.2, 11.3. **Design:** Claude Design pass required.

### Story 11.5 — Monthly report
- **AC1** For a selected month: total income, total spending, net; spending by category (incl. uncategorized), sorted by amount.
- **AC2** Comparison to previous month per category and in total (amount + % change), with "no data" handling for the first month.
- **AC3** Transfers excluded; credit-card purchases count as spending when made.
- **AC4** Month switcher (previous/next); works offline; computed on device.
- **Contract:** `MonthlyReportSchema` (new). Free tier. **Depends on:** 11.3. **Design:** Claude Design pass required.

---

## E12 — Daily tasks (Free core)
Goal: the small things in a day — notes, alarms, appointments, meetings — next to reminders.

### Story 12.1 — Notes
- **AC1** Create, edit, delete, pin and search plain-text notes (title optional, body ≤ 10k chars).
- **AC2** Notes are stored locally (new migration step) and listed newest-first, pinned on top.
- **AC3** A note can be turned into a reminder (propose-and-confirm via the existing proposal card).
- **AC4** Quick-add understands "note: …" → `add_note` proposal (new proposal action).
- **Contract**: NoteSchema; ProposalAction add_note. No new dependency. Design pass required.

### Story 12.2 — Alarms spike (GATE-4)
- **AC1** Verify current Google Play policy for exact alarms and full-screen intents; record outcome.
- **AC2** Evaluate alarm-capable options for Expo dev builds (maintained native module vs. config plugin over AlarmManager) on: ring over silent/DND rules allowed by policy, snooze, reboot survival, Android 14+ behavior. Recommend one; record ADR-005.
- **AC3** Owner approves the dependency before 12.3 starts.

### Story 12.3 — Alarms
- **AC1** Create/edit/delete alarms: time, repeat days, label, on/off.
- **AC2** Alarm rings with sound and full-screen UI (as policy allows), with Snooze and Dismiss.
- **AC3** Alarms survive reboot and app kill; permission flow explains why exact alarms are needed and degrades to a high-priority notification if denied.
- **AC4** Optional: "wake" routine anchor can create a matching alarm (propose-and-confirm).
- **Depends** on: 12.2, GATE-4. Design pass required.

### Story 12.4 — Appointments (calendar write, confirmed)
- **AC1** Create an appointment (title, date/time, duration, location, notes, reminder offset).
- **AC2** User chooses where it goes: Otto only, device calendar (expo-calendar), or Google Calendar.
- **AC3** Writes are propose-and-confirm; nothing is written until the user taps Confirm.
- **AC4** Quick-add "dentist Tue 3pm" → `create_event` proposal; scheduling substrate suggests a free slot when no time is given.
- **AC5** Google write requires a scope upgrade to calendar.events, requested only when the user first saves to Google (incremental consent); read-only users keep working.
- **Depends** on: 3.4 (tokens) for Google path; new dependency expo-calendar (approval). Design pass required.

### Story 12.5 — Meetings with invites
- **AC1** Add attendees (email) to an appointment saved to Google Calendar; option to add a Google Meet link.
- **AC2** Invites are sent only after explicit confirm, showing exactly who will be emailed.
- **AC3** Edit/cancel a meeting Otto created (updates/cancellations sent to attendees after confirm).
- **Depends** on: 12.4, GATE-5. Design pass required.

---

## Sequencing & gates
1. **E1 → E2 → E3 → E4** = Phase 1 free organizer core (M3 / v0.5.0).
2. Clear **GATE-3** (DPA consent/encryption review) during E1.4 before storing real finance/health data.
3. Resolve **OD-2** before E5 enters ready-for-dev; **OD-3** before any FR-C5 SMS work (**GATE-1**).
4. Clear **GATE-2** before E8.1.
5. E5–E7 = Phase 2–3 (the paid brain). E8 = Phase 4. E10 = Phase 5. E9 spans.
6. **E11 is next** (2026-10-07): 11.1 → 11.2 → 11.3 → (11.4 ∥ 11.5). The Claude Design pass for 11.2–11.5 runs in parallel with 11.1. GATE-3 still applies (more finance data stored).
7. **After E11** (2026-10-08): 3.4 → E12 (12.1 first; 12.3 needs GATE-4, 12.5 needs GATE-5) → E9 billing (needs OD-5 + store accounts).
