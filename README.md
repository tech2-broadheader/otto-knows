# Otto — Personal Daily Assistant

> A proactive, cross-domain personal **chief-of-staff**. It connects to your calendar, reminders, events, finances and wearable, reads them *through the lens of your daily routine*, and tells you what matters today — and reshapes your day when you want to add something new. **Otto knows.**

**Status:** Planning phase (M0 complete) · **Version:** 0.1.0 · see [`PROJECT_RECORD.md`](PROJECT_RECORD.md)
**Identity:** explicitly *not* Siri — proactive and cross-domain, not reactive. _"Heads up — you get paid Friday but the electric bill is due Saturday. Want a Thursday nudge?"_

## Core mental model
> **Free = it remembers and reminds. Paid = it thinks and adjusts.**

## Architecture (three layers)
1. **Context graph** — calendar + reminders + events + finance + health, unified.
2. **Routine layer** — the *lens*; the recurring rhythm of the user's day that times everything.
3. **LLM brain + write-back tools** — reasons over the graph through the routine lens, then *proposes* actions (always user-confirmed).

## Stack (ADR-001)
- **Mobile:** React Native + Expo (Android-first, iOS-ready) — the free-tier organizer core.
- **Backend / web:** Next.js (App Router) on Vercel — Pro sync/backup + LLM proxy + web companion.
- **Data:** SQLite on device (free) · Supabase Postgres (cloud/Pro).
- **Shared contracts:** Zod schemas in `/packages/schemas`, consumed by both.
- **LLM:** cloud Claude model behind a server-side, usage-metered proxy.

## Repo map
| Path | What |
|------|------|
| [`personal-daily-assistant-spec.md`](personal-daily-assistant-spec.md) | The locked product concept (spec of record) |
| [`CLAUDE.md`](CLAUDE.md) | Policy & guardrails every BMAD agent obeys |
| [`CODING_CONVENTIONS.md`](CODING_CONVENTIONS.md) | House style |
| [`PROJECT_RECORD.md`](PROJECT_RECORD.md) | Lifecycle + version log |
| [`docs/scope.md`](docs/scope.md) | Phase-2 scope (feeds Analyst/PM) |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Architecture + ADRs (Architect-maintained) |
| [`_bmad-output/planning-artifacts/`](_bmad-output/planning-artifacts/) | Product brief · PRD · epics & stories |
| `project-starter/` | The reusable Broadheader bootstrap template (kept for reference) |

## Build phases
1. **Organizer core (free).** Local data model, calendar/reminders/events read, manual finance, fixed routine, routine-timed notifications, basic briefing.
2. **The brain (paid).** LLM, conversational quick-add, proactive cross-domain briefing, adaptive routine.
3. **Optimizer + tips.** Routine optimizer (propose-and-confirm), finance tips, forecasts.
4. **Health + caregiver.** Health Connect / HealthKit, health tips, caregiver/family mode.
5. **Continuity & polish.** Cloud backup, sync, export, widgets, themes.

## Key constraints
Cross-domain finance + health data is DPA-regulated and platform-restricted. Granular consent, encryption at rest, no ad use. Verify current Google Play SMS policy and Health Connect / HealthKit policy before building those capture paths. The routine optimizer **never** rewrites the day silently — it proposes, you confirm.

## Working with this repo
This project runs **BMAD** (v6.8.0) inside Claude Code. Planning artifacts are in `_bmad-output/`. Next step out of planning is **M1 (UX + Claude Design pass)** then **M2/M3 (Phase 1 organizer core)**.
