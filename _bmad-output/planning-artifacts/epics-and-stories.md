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

## E10 — Continuity & polish [Pro]
- **10.1** Cloud backup + cross-device sync (local→cloud reconciliation on upgrade).
- **10.2** Export (PDF / CSV).
- **10.3** Widgets + themes.

---

## Sequencing & gates
1. **E1 → E2 → E3 → E4** = Phase 1 free organizer core (M3 / v0.5.0).
2. Clear **GATE-3** (DPA consent/encryption review) during E1.4 before storing real finance/health data.
3. Resolve **OD-2** before E5 enters ready-for-dev; **OD-3** before any FR-C5 SMS work (**GATE-1**).
4. Clear **GATE-2** before E8.1.
5. E5–E7 = Phase 2–3 (the paid brain). E8 = Phase 4. E10 = Phase 5. E9 spans.
