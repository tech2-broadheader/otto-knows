# Scope — Otto (Personal Daily Assistant)
> Filled in during Phase 2 (Scope & Requirements). This is what the BMAD Analyst/PM read to produce the Product Brief and PRD. A feature exists only if it's written here. Source of record: `personal-daily-assistant-spec.md`.

| | |
|--|--|
| Client | Broadheader — internal product (owner: otto / tech@broadheader.com) |
| Date | 2026-06-14 |
| Version | v1 |

## 1. Objective
Build a proactive, cross-domain personal daily assistant for the Philippine market that wins on **trust + habit**, not feature count. It unifies calendar, reminders, events, finance and health into one context graph, interprets them through the lens of the user's daily routine, and delivers a coherent daily brief plus well-timed nudges. Free tier is a smart organizer; paid tier is the actual assistant (LLM reasoning + adaptive routine + optimizer). Monetized by freemium subscription + a one-time Lifetime SKU; **no ads** to protect the trust that justifies paying.

## 2. Project tier
- [ ] Tier 1 — Marketing/landing site (static, no login, no DB)
- [ ] Tier 2 — Standard web app (DB, forms, auth, light backend)
- [x] Tier 3 — Complex/regulated (sensitive finance + health data, integrations, PH Data Privacy Act)

## 3. Pages / screens (initial — refined by UX in M1)
- Onboarding + consent (granular per data source)
- Routine setup (define anchor times — wake, meds, work blocks, meals, wind-down, sleep)
- Daily briefing (morning / midday / evening, routine-anchored)
- Today view (unified context graph for the day)
- Reminders / bills / meds management
- Manual finance entry + basic budget
- Conversational quick-add / chat (paid)
- Routine optimizer flow — propose & confirm (paid)
- Tips surface — finance & health (paid)
- Caregiver / family mode (paid)
- Settings (connections, consent, subscription, export)

## 4. Features (in scope, by build phase)
**Phase 1 — Organizer core (free):** local data model · calendar/reminders/events read · manual finance entry + basic monthly budget · fixed (seeded) daily routine · routine-timed reminders · basic "today" briefing · local notifications · small daily quota of natural-language quick-adds. Free caps: ~5 bills · ~3 meds · a few budget categories.

**Phase 2 — The brain (paid):** unlimited bills/meds/accounts/categories · conversational AI (unlimited NL + proactive cross-domain reasoning) · adaptive routine (learns real rhythm).

**Phase 3 — Optimizer + tips (paid):** routine optimizer (analyze → reshape → insert new habit, propose-and-confirm) · cross-domain insights & forecasts (overspend prediction, med-refill warnings, payday-vs-bill heads-ups) · finance tips (general/informational) · health tips (gentle, non-medical).

**Phase 4 — Health + caregiver (paid):** Health Connect (Android) / HealthKit (iOS) integration · health tips via wearable · caregiver / family mode (the headline differentiator).

**Phase 5 — Continuity & polish (paid):** cloud backup · cross-device sync · export (PDF/CSV) · widgets · themes.

## 5. Explicitly OUT of scope
- Auto-rewriting the user's day without confirmation (propose-and-confirm only — product safety rule).
- Personalized financial/medical *advice* — tips stay general, informational, non-prescriptive.
- Using finance/health data for advertising (no ads at all).
- SMS transaction auto-capture **unless** current Google Play policy is verified to allow it (manual entry is the launch baseline; see Assumptions).
- iOS-first launch (Android-first; iOS follows via the shared RN codebase).

## 6. Integrations
- Google Calendar API, Google Tasks (read drives briefing; write powers optimizer/reminders).
- Apple Calendar (EventKit / CalDAV) — later, via shared codebase.
- Health Connect (Android) / HealthKit (iOS) — gated module, explicit consent.
- LLM provider (cloud Claude model) behind a server-side, usage-metered proxy.
- Payments / subscription billing + Lifetime SKU (store IAP, e.g. RevenueCat) — Pro tier.
- (Conditional) Transaction SMS/notification parsing — pending Play policy verification.

## 7. Content & assets
- Provided by client/owner: brand direction + final product name (pending — OD-4), copy tone guidance, mascot (`mascot.png` present).
- Provided by us: UX spec, design system, app copy drafts.

## 8. Tech stack
Deviation from `CLAUDE.md §2` historical default is recorded as **ADR-001**: React Native + Expo (mobile, Android-first) + Next.js (backend / LLM proxy / web companion), unified by shared TypeScript + Zod contracts; SQLite on device, Supabase Postgres in the cloud. See `docs/ARCHITECTURE.md`.

## 9. Hosting / domain
- Owned by: Broadheader. Hosting: Vercel (web/backend) + Supabase (DB). Domain: TBD.

## 10. Timeline (high level)
M0 Setup (done) → M1 Structure & design (UX + Claude Design) → M2 Data & backend → M3 Core build (Phase 1 organizer) → M4 Content & polish → M5 Launch & handover. See `PROJECT_RECORD.md §2`.

## 11. Assumptions & dependencies
- **Android-first** (PH market is Android-heavy). Confirm before locking deeper native work (OD-1).
- **Manual finance entry is the launch baseline.** SMS parsing only if current Google Play policy permits (hard gate — verify before architecting; spec §5.2, §12).
- **Health data** is the most restricted category (platform + DPA): explicit granular consent, no ad use, full disclosure — verify current Health Connect / HealthKit policy before build (spec §5.3).
- **DPA (PH)** applies across finance, health, routine: consent + encryption baked in from day one.
- **LLM cost per active paid user is real** — free tier is quota-capped; Pro priced to cover it.

## 12. Change policy
Anything not listed above is a change request, quoted separately and routed through the PM.

## 13. Open decisions (from spec §14)
- **OD-1** Confirm platform (Android-first assumed).
- **OD-2** ✅ RESOLVED (2026-06-14): v1 conversational depth = **quick-add + proactive briefing** (natural-language → confirmable proposals), not open-ended chat. Full chat deferred. Implemented via `/api/llm/quick-add` + `/api/llm/brief`.
- **OD-3** Finance capture — manual only at launch, or pursue SMS parsing (pending Play policy check).
- **OD-4** Product name + brand direction (working name: Otto).
- **OD-5** Pricing validation vs current PH comparables (anchors: Free / ₱99 mo / ₱599 yr / ₱1,299 lifetime).
