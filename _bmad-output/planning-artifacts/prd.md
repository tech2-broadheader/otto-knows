# PRD — Otto (Personal Daily Assistant)

| | |
|--|--|
| Author | BMAD PM (from Product Brief + spec) |
| Date | 2026-06-14 |
| Status | Draft v1 |
| Tier | 3 (regulated) |
| Sources | `product-brief.md`, `personal-daily-assistant-spec.md`, `docs/scope.md` |

## 1. Summary
Otto is a proactive, cross-domain personal daily assistant. v1 ships the **free organizer core** (Phase 1), then layers the **paid brain** (Phase 2), **optimizer + tips** (Phase 3), **health + caregiver** (Phase 4), and **continuity** (Phase 5). The product is judged on trust + daily habit, not feature count.

## 2. Goals
- **G1** Make the daily brief feel like one coherent voice, not a data dump.
- **G2** Fire reminders at the *right moment* in the user's real day (routine-anchored).
- **G3** Deliver cross-domain synthesis (e.g. payday-vs-bill) that feels alive.
- **G4** Keep every life-altering action human-confirmed (propose-and-confirm).
- **G5** Protect trust: no ads, granular consent, encryption, non-prescriptive tone.
- **G6** Keep free tier zero-marginal-cost (local) and Pro priced to cover LLM spend.

## 3. Non-goals (v1)
Silent write-back · personalized financial/medical advice · ad monetization · iOS-first · SMS auto-capture before Play-policy verification.

## 4. Personas
- **Daily Juggler** — wants to not drop a bill/med/appointment; opens the app each morning.
- **Subscription-hater** — will pay once (Lifetime) but not monthly.
- **Caregiver** — wants to receive a parent's med alerts and bill due dates.

## 5. Functional requirements

### 5.1 Routine layer (the lens)
- **FR-R1** User defines fixed routine anchors (wake, meds, work blocks, meals, wind-down, sleep). [Free]
- **FR-R2** New reminders/tasks slot into real free space relative to anchors ("after lunch, before your 2pm"). [Free]
- **FR-R3** Routine anchors time *when* the assistant speaks. [Free]
- **FR-R4** Adaptive routine learns when the user actually acts (light heuristics first). [Pro]
- **FR-R5** Deviation radar: gentle cross-domain observations ("weekend spend pattern early"). [Pro]

### 5.2 Connectors / context graph
- **FR-C1** Connect & read Google Calendar, reminders/tasks, events (with consent). [Free]
- **FR-C2** Manual finance entry: salary/income, recurring bills, spending; basic monthly budget. [Free]
- **FR-C3** Unify all sources into one context-graph model interpreted through the routine lens. [Free]
- **FR-C4** Write-back to calendar/reminders (create reminder, block time) — **confirmed**. [Free for reminders; LLM-driven write-back Pro]
- **FR-C5** (Conditional) SMS/notification finance parsing behind a feature flag, pending Play policy. [Pro]
- **FR-C6** Health Connect / HealthKit read (gated module, explicit consent). [Pro]

### 5.3 Briefing & nudges
- **FR-B1** Routine-anchored briefings: morning / midday / evening — one coherent voice. [Free basic; Pro proactive reasoning]
- **FR-B2** Routine-timed reminders for meds, bills, tasks. [Free]
- **FR-B3** Proactive cross-domain nudges (payday-vs-bill, med-refill). [Pro]
- **FR-B4** Local notifications at routine-anchored moments. [Free]

### 5.4 The brain (LLM)
- **FR-L1** Conversational natural-language quick-add (small daily quota free; unlimited Pro). [Free quota / Pro]
- **FR-L2** Cross-domain reasoning over the context graph through the routine lens. [Pro]
- **FR-L3** Tool-calling write-back — always emits a *proposal* the user confirms. [Pro]
- **FR-L4** Forecasts: overspend prediction, med-refill warnings, payday-vs-bill heads-ups. [Pro]

### 5.5 Optimizer & tips
- **FR-O1** Routine optimizer: inputs current anchors + fixed commitments + new routine constraints → proposes a reshaped day **with reasoning**; user confirms. Never auto-applies. [Pro]
- **FR-T1** Finance tips — general/informational, never personalized advice. [Pro]
- **FR-T2** Health tips — gentle, non-medical, no hard numeric targets, no streak-shaming. [Pro]

### 5.6 Caregiver / family mode
- **FR-G1** A caregiver receives a linked person's med alerts and bill due dates, with explicit, revocable consent from both sides. [Pro]

### 5.7 Monetization & entitlements
- **FR-M1** Free caps: ~5 bills, ~3 meds, a few budget categories, small daily NL quick-add quota.
- **FR-M2** Pro unlocks unlimited entities, conversational AI, adaptive routine, optimizer, insights, tips, backup/sync/export, caregiver, widgets, themes.
- **FR-M3** SKUs: Free, Pro monthly, Pro annual, one-time Lifetime. No ads. Receipts verified server-side.

### 5.8 Continuity
- **FR-K1** Cloud backup + cross-device sync. [Pro]
- **FR-K2** Export (PDF / CSV). [Pro]
- **FR-K3** Widgets, themes. [Pro]

## 6. Non-functional requirements
- **NFR-1 Privacy (DPA):** granular per-source consent before connecting; explicit disclosure; export & delete; no ad use of sensitive data.
- **NFR-2 Security:** encryption at rest for finance/health; server-side secrets; LLM keys never on device; rate-limited LLM routes; **audit logging on sensitive-data access (Tier 3)**.
- **NFR-3 Trust/safety:** all write-back is propose-and-confirm; tips non-prescriptive; tone never punitive.
- **NFR-4 Cost:** free tier runs locally (zero backend marginal cost); free NL quota enforced; Pro priced to cover LLM spend.
- **NFR-5 Offline/local-first:** organizer core works without network; sync reconciles when online.
- **NFR-6 Platform:** Android-first; iOS-ready via shared RN codebase.
- **NFR-7 Accessibility:** labels/roles, screen-reader support, adequate contrast.
- **NFR-8 Performance:** instant local reads; cached briefings; paginated history.

## 7. Compliance gates (must clear before the dependent build)
- **GATE-1** Verify current Google Play SMS policy before any SMS-parsing work (FR-C5).
- **GATE-2** Verify current Health Connect / HealthKit health-data policy before FR-C6 / FR-T2.
- **GATE-3** DPA consent + encryption design reviewed before finance/health data is stored.

## 8. Epics (see `epics-and-stories.md`)
- **E1** Foundation & data model (monorepo, shared Zod contracts, local store, consent).
- **E2** Routine layer (fixed anchors, scheduling substrate).
- **E3** Connectors & context graph (calendar/tasks read, manual finance, unification).
- **E4** Briefing & routine-timed reminders + notifications (free).
- **E5** The brain (LLM proxy, NL quick-add, proactive cross-domain reasoning) [Pro].
- **E6** Optimizer & tips [Pro].
- **E7** Adaptive routine & forecasts [Pro].
- **E8** Health + caregiver mode [Pro].
- **E9** Monetization & entitlements.
- **E10** Continuity: backup, sync, export, widgets, themes [Pro].

## 9. Release mapping
M3 (v0.5.0) targets E1–E4 (Phase 1 free organizer core). E5–E7 → Phase 2–3. E8 → Phase 4. E10 → Phase 5. E9 spans (gates Pro features). See `PROJECT_RECORD.md §2`.

## 10. Open decisions
OD-1…OD-5 per `docs/scope.md §13`. OD-2 (conversational depth) directly scopes E5; OD-3 (finance capture) gates FR-C5; resolve before those epics enter ready-for-dev.
