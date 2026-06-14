# PROJECT RECORD — Otto (Personal Daily Assistant)
> Lives in the **root of the project repo** (and can be rendered on an internal `/about-this-build` page). It records how this project started, how it progressed, when it launched, and what version it is at any time. Update it at every milestone and every release.

---

## 1. Overview
| Field | Value |
|-------|-------|
| Project name | Otto (working name — see `CLAUDE.md §0` brand note) |
| Client / Owner | Broadheader (internal product) |
| Built by | Broadheader |
| Tier | 3 — complex / regulated (cross-domain finance + health, PH Data Privacy Act) |
| BMAD path | Greenfield · Full Method |
| Goal (one line) | A proactive, cross-domain personal daily assistant that reads calendar, finance, health and events through the lens of the user's daily routine. |
| Repository | local (`otto-knows`) — remote TBD |
| Staging URL | TBD |
| Production URL | TBD |
| Tech stack | React Native + Expo (mobile) · Next.js + Supabase (backend/web) · TypeScript + Zod (shared contracts) · cloud LLM via server-side proxy |
| **Current version** | **0.1.0** |
| Status | In development (planning phase) |
| Start date | 2026-06-14 |
| Launch date | — |

---

## 2. Lifecycle Log (started → ended)
Record the start/finish of each phase and milestone.

| Phase / Milestone | Started | Completed | Version | Notes |
|-------------------|---------|-----------|---------|-------|
| Setup (M0) | 2026-06-14 | 2026-06-14 | 0.1.0 | Repo bootstrapped from project-starter; governance files filled; BMAD planning artifacts authored |
| Structure & design (M1) | | | 0.2.0 | Incl. Claude Design pass |
| Data & backend (M2) | | | 0.3.0 | |
| Core build (M3) | | | 0.5.0 | Phase 1 organizer core (free tier) |
| Content & polish (M4) | | | 0.9.0 | |
| Launch & handover (M5) | | | 1.0.0 | Live on production |

---

## 3. Version Log (changelog)
> **vs BMAD Sprint Status:** BMAD tracks *stories* (backlog → ready-for-dev → in-progress → review → done) in its own sprint-status file. This log tracks *releases*. When an epic/sprint of stories reaches `done` and deploys to production, record it here as a release.

Newest at the top. One row per production release. Every release also gets a matching git tag (e.g. `v1.2.0`).

| Version | Date | Type | Summary of changes |
|---------|------|------|--------------------|
| 0.1.0 | 2026-06-14 | minor | Project initialized — repo bootstrapped, standards set, BMAD planning artifacts (brief, PRD, architecture, epics & stories) authored from the locked spec |

---

## 4. Versioning Rules (how this project is versioned)
We use **Semantic Versioning: `MAJOR.MINOR.PATCH`** (e.g. `2.4.1`).

- **Pre-launch (`0.x.y`)** — still in development and not yet stable/public. Bump the middle number as milestones complete (0.1.0 → 0.2.0 …).
- **Launch (`1.0.0`)** — the first production release. Live and considered stable.
- **PATCH (`1.0.x`)** — bug fixes, copy/content tweaks, small style fixes. No new features, nothing breaking.
- **MINOR (`1.x.0`)** — a new feature/screen added in a backward-compatible way.
- **MAJOR (`x.0.0`)** — a redesign, restructure, or breaking change (changed data shape, major overhaul).
- **Pre-release suffixes** (optional) — `1.3.0-beta.1` for previews before a release is final.

**Release rules**
1. Every production deploy gets a version number.
2. Tag the release in git: `git tag v{{version}}` and push the tag.
3. Add a row to the **Version Log** above for every release — date, type, and a one-line summary.
4. The version in §1 ("Current version") always matches the latest production tag.
5. Decide the bump by the *highest* type of change in the release (one breaking change makes the whole release MAJOR).

---

## 5. Handover Info
| Item | Owner / Location |
|------|------------------|
| Domain registrar | TBD |
| Hosting | Vercel (web/backend) + Supabase (DB) — accounts TBD |
| Database | Supabase Postgres (cloud/Pro); local SQLite on device (free tier) |
| Third-party accounts | LLM provider, Google (Calendar/Tasks), payments processor — TBD |
| Admin / CMS access | TBD |
| How to update content | TBD |
| Warranty window | TBD |

---

## 6. Notes / Decisions Log (optional)
Record significant decisions and their date so future-you knows *why* something is the way it is.
- 2026-06-14 — Bootstrapped the repo from `project-starter/` and authored BMAD planning artifacts from `personal-daily-assistant-spec.md`.
- 2026-06-14 — **ADR-001:** Stack reconciled to React Native + Expo (mobile) + Next.js (backend/web) with shared TypeScript + Zod contracts, instead of the spec's Flutter suggestion or the starter's pure-Next.js web default. Rationale: keeps web + mobile in one TS/React ecosystem ("inline") while satisfying native-mobile needs (Health Connect, SMS paths). See `docs/ARCHITECTURE.md`.
- 2026-06-14 — Working product name set to **Otto** ("Otto knows"); spec candidates Cadence / Daylo / Routine remain open pending brand sign-off (OD-4).
- 2026-06-14 — Story 1.1 (monorepo & tooling scaffold) done: pnpm workspace with `apps/{mobile,web}` + `packages/{schemas,types,core}`, TS strict, ESLint flat config + Prettier, Vitest. Verified — typecheck/tests/lint green, `next build` succeeds, Expo Metro bundle (Android) succeeds. React pinned to 19.0.0 workspace-wide (Expo SDK 53 constraint) via pnpm overrides; `node-linker=hoisted` for RN compatibility.
