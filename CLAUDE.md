# CLAUDE.md — Project Standards & Guardrails (BMAD-aligned)
> Drop this in the **root of every project repo**. This repo runs **BMAD** inside Claude Code. BMAD provides the *workflow* (Analyst → PM → UX → Architect → SM → Dev → QA, with Full Method / Quick Flow). This file provides the *standards every BMAD agent must obey*. Agents: read this before planning, solutioning, or writing code. **Dev/QA also read `CODING_CONVENTIONS.md` (house style) and `/docs/ARCHITECTURE.md` (this project's architecture, maintained by the Architect).** Companion files: `BMAD_Alignment_Guide.md`, `Development_Rules_Handbook.md`, `PROJECT_RECORD.md`.

---

## 0. PROJECT CONTEXT
- **Project:** Otto (working name — see brand note below) · **Client:** Broadheader (internal product)
- **Tier:** 3 — complex / regulated (cross-domain finance + health data, PH Data Privacy Act applies)
- **BMAD path:** Greenfield · Full Method
- **Goal (one line):** A proactive, cross-domain personal daily assistant that reads calendar, reminders, events, finance and health *through the lens of the user's daily routine* and tells them what matters today.
- **Scope doc:** `docs/scope.md` → feeds the Analyst/PM
- **Spec of record:** `personal-daily-assistant-spec.md` (concept locked)
- **Staging URL:** TBD · **Prod URL:** TBD
- **Current version:** see `PROJECT_RECORD.md`

> **Brand note:** Working name is **Otto** ("Otto knows" — the chief-of-staff who knows your day; matches the repo/BMAD project id `otto-knows`). Spec candidates _Cadence / Daylo / Routine_ remain open until brand sign-off (Open Decision OD-4).

> **Stack note (reconciliation — ADR-001):** The spec (§13) recommends Flutter; this file's historical default below is a Next.js web stack. We reconciled to **React Native + Expo (mobile, Android-first) + Next.js (Pro backend / LLM proxy / web companion), unified by shared TypeScript + Zod contracts.** Where §2 below says "Next.js (App Router)" for the *frontend*, read it as "Next.js for backend/web, React Native + Expo for the mobile app." All other rules (TS strict, Zod-first contract, shared schema, no secrets, etc.) apply unchanged across both. See `docs/ARCHITECTURE.md` ADR-001.

---

## 1. GOLDEN RULES (every agent, never break)
1. **Specs before code.** No implementation without a story/spec from the BMAD planning+solutioning phases (or a Quick Spec for Quick Flow).
2. **Contract first.** Define the Zod schema for the data before backend or frontend. Both import the same schema so they can't drift.
3. **Small, verifiable steps.** One story / one AC at a time; it must run after each step.
4. **Never invent** a library, API, env var, or file. If unsure, check or ask.
5. **Ask when ambiguous.** One clear question beats a wrong guess.
6. **No secrets in the repo, ever.** `.env.local` (gitignored) + `.env.example` placeholders.
7. **No destructive commands** (`rm -rf`, DB drop/reset, force-push) without explicit confirmation.
8. **Don't change scope** — flag it; scope changes go back through the PM, not silently into code.
9. **Leave it clean** — no dead code, commented blocks, or `console.log` in commits.
10. **Stay on the chosen stack** (§2).
11. **Proposes, you confirm.** Anything that writes back to the user's life (create reminder, log expense, block calendar time, reshape the day) is suggest-and-accept — never silent. This is a product safety rule, not just UX (spec §6.1).
12. **Sensitive-data discipline.** Finance and health data are DPA-regulated and platform-restricted. Granular consent, encryption at rest, no ad use, full disclosure. Verify current Google Play SMS policy and Health Connect / HealthKit policy before building those capture paths (spec §5.2, §5.3, §12).

---

## 2. TECH STACK (Architect & Dev must use this)
TypeScript everywhere, `strict: true`, no `any` without a comment.

| Layer | Default (per ADR-001) |
|-------|-------|
| Mobile app | **React Native + Expo** (Android-first, iOS-ready) |
| Web / backend | **Next.js (App Router)** — Pro sync/backup + LLM proxy + web companion |
| Styling (web) | Tailwind CSS |
| Styling (mobile) | NativeWind (Tailwind for RN) |
| UI components (web) | shadcn/ui |
| Backend | Next.js Route Handlers / Server Actions |
| Database (cloud/Pro) | Postgres via Supabase |
| Local store (mobile, free tier) | SQLite via Drizzle (`expo-sqlite`) |
| Validation | **Zod** (the shared contract) |
| Auth | Supabase Auth (never hand-rolled) |
| Forms | React Hook Form + Zod resolver |
| LLM | Cloud model via API behind a server-side proxy (keys server-side, usage metered) — default to the latest Claude model |
| Connectors | Google Calendar API, Google Tasks, Health Connect (Android) / HealthKit (iOS), EventKit/CalDAV |
| Package manager | pnpm |
| Lint/format | ESLint + Prettier |
| Tests | Vitest (unit) + Playwright (web e2e) + Maestro/Detox (mobile e2e, when introduced) |
| Hosting | Vercel + Supabase |

**Tier 3 (this project):** stricter validation, audit logging on sensitive-data access, never trust the client, more tests, explicit consent flows. To swap a tool, change it here first (Architect records an ADR), then build to it.

---

## 3. REPO STRUCTURE
This is a monorepo. App code is introduced in Phase 1 (not yet present — planning phase only).
```
/apps
  /mobile           # React Native + Expo app (free tier organizer core lives here)
  /web              # Next.js app: Pro backend, LLM proxy, web companion
/packages
  /schemas          # ZOD SCHEMAS — the shared contracts (imported by mobile + web)
  /types            # types derived via z.infer
  /core             # shared domain logic (routine engine, context graph helpers)
/docs               # scope.md, ARCHITECTURE.md (Architect-maintained), product brief, PRD, UX specs
/_bmad-output       # BMAD planning + implementation artifacts (PRD, epics, stories, sprint status)
/.env.example       # documented env vars, no values
/CLAUDE.md          # this file (policy)
/CODING_CONVENTIONS.md  # house style (detailed)
/PROJECT_RECORD.md  # lifecycle + version log
```
Server-only code never imported into client/mobile components. Every shared data shape lives in `/packages/schemas`. BMAD's living artifacts live in `/docs` + `/_bmad-output` and stay updated.

---

## 4. HOW THE DEV AGENT IMPLEMENTS A STORY (inside BMAD's implementation loop)
BMAD's loop is: SM creates story → Architect confirms Definition of Ready → Dev implements (TDD) → QA reviews → quality gates → commit & sync. Within the Dev step, follow this order:
1. **Schema/contract** — Zod schema in `/packages/schemas`; derive types.
2. **Data layer** — local SQLite (Drizzle) table/migration for mobile, or Postgres migration for cloud, matching the schema (never edit a shipped migration).
3. **Backend** — handler/action; validate input with the schema; typed result + typed error.
4. **Frontend** — import the *same* schema; consume the typed API (see §5).
5. **Wire & verify** — connect UI ↔ data/backend; confirm happy path AND one error path.
6. **Commit** — small commit, conventional message.

TDD per acceptance criterion: RED → GREEN → REFACTOR. Front and back share the schema, so they can't be built against different assumptions.

---

## 5. UI / DESIGN WORKFLOW (Claude Design = the UX Designer's visual execution)
Visual decisions are locked **before** frontend code:
1. **UX spec (BMAD UX Designer)** — components, interaction patterns, structure (the "raw UI/UX").
2. **Claude Design (us)** — polish the design on the canvas (layout, spacing, type, color, branding); iterate via chat until approved (Milestone 1).
3. **Architect** references the approved design when creating stories.
4. **Dev** implements the approved design faithfully (Tailwind + shadcn on web, NativeWind on mobile). **Do not redesign during implementation.**

Rule: UX spec → Claude Design → stories → code. Don't skip the Claude Design pass for any client-facing UI.

---

## 6. STANDARDS
**General:** validate all external input (forms, bodies, params, webhooks, connector payloads) with Zod at the boundary; explicit error handling (no silent catch); named constants; small functions; accessible (semantic markup, labels, alt, keyboard/screen-reader); mobile-first responsive; comments explain *why*.

**Backend:** validate → work → typed result/error · DB access only in `/server` or dedicated data modules · parameterized/ORM queries (never string-built SQL) · auth check on every protected route · never leak secrets or stack traces · verify webhook signatures and never trust client amounts · keep LLM provider keys server-side behind the proxy and meter usage.

**Frontend:** Server Components for data by default (web), Client Components only for interactivity · forms = React Hook Form + shared Zod schema · no hardcoded URLs/keys · loading + error states for every async UI · mobile screens handle offline/local-first state explicitly.

**Wiring:** the Zod schema is the one contract (backend + frontend validate with it; types via `z.infer`) · consistent response envelope (`{ data }` / `{ error }`) · all env vars in `.env.example`, read through one typed config module.

**Sensitive data (Tier 3):** explicit granular consent before connecting finance/health sources · encrypt sensitive data at rest · audit-log access to finance/health records · never use sensitive data for ads · health/finance tips stay non-prescriptive and supportive (spec §6.2).

---

## 7. VERSIONING & RELEASES (sits above BMAD Sprint Status)
BMAD's Sprint Status tracks **stories** (backlog → ready-for-dev → in-progress → review → done). Our versioning tracks **releases**. They don't conflict.

Semantic Versioning **`MAJOR.MINOR.PATCH`**: pre-launch `0.x.y`; first launch `1.0.0`; PATCH = bug/content/style fix; MINOR = new feature (backward compatible); MAJOR = redesign/restructure/breaking change.

**Bridge rule — when an epic/sprint of stories reaches `done` and deploys to production:**
1. Pick the bump by the highest type of change in the release.
2. Update `PROJECT_RECORD.md` — current version + a new Version Log row.
3. `git tag v{{version}}` and push the tag.
4. Deploy. Tag and record's "current version" must match.

Never ship a release without bumping the version and updating `PROJECT_RECORD.md`.

---

## 8. GIT & COMMITS
Branches: `main` (prod), `dev` (integration), `feature/{{story-id}}` (use the BMAD story id, e.g. `feature/1-2-routine-anchors`). Conventional commits (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `test:`, `style:`). One logical change per commit; commit often. Never force-push shared branches. Never commit `.env`, `node_modules`, build output, or secrets.

---

## 9. DEFINITION OF READY / DONE (aligns with BMAD gates)
**Definition of Ready (Architect checks before Dev starts):** story has clear ACs, the Zod contract is identified, dependencies known, design approved (for UI stories).
**Definition of Done (QA + gates):** runs with no console errors + passes lint · TDD tests pass (happy + one error path) · **quality gates pass: tests + build + type-check** · works on target platform, responsive · no secrets/dead code/logs · conventional commit · Sprint Status set to `done`. Don't mark a story `done` until all are true.

---

## 10. WHEN STUCK
Uncertain about a library/API → check docs or ask. Ambiguous → ask one question, then proceed. Out of scope → flag to the PM as a change request. Destructive/many-file change → explain the plan first. If a story's Definition of Ready isn't met → send it back to the SM, don't improvise.

---

## 11. NEVER DO
❌ Implement without a story/spec · ❌ commit secrets · ❌ hallucinate libraries/functions/paths · ❌ destructive commands without confirmation · ❌ skip validation / trust client data · ❌ build front & back against different shapes · ❌ skip the Claude Design pass for client-facing UI · ❌ add a new framework the stack already covers · ❌ leave dead code/logs · ❌ expand scope alone · ❌ roll your own auth/crypto · ❌ silently write back to the user's calendar/finance/routine without confirmation · ❌ use finance/health data for ads or ship a sensitive-data path without verifying current platform policy · ❌ mark a story `done` when it doesn't run / fails gates · ❌ ship a release without bumping the version and updating `PROJECT_RECORD.md`.
