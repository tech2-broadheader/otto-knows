# CLAUDE.md — Project Standards & Guardrails (BMAD-aligned)
> Drop this in the **root of every project repo**. This repo runs **BMAD** inside Claude Code. BMAD provides the *workflow* (Analyst → PM → UX → Architect → SM → Dev → QA, with Full Method / Quick Flow). This file provides the *standards every BMAD agent must obey*. Agents: read this before planning, solutioning, or writing code. **Dev/QA also read `CODING_CONVENTIONS.md` (house style) and `/docs/ARCHITECTURE.md` (this project's architecture, maintained by the Architect).** Companion files: `BMAD_Alignment_Guide.md`, `Development_Rules_Handbook.md`, `PROJECT_RECORD.md`.

---

## 0. PROJECT CONTEXT (fill per project)
- **Project:** {{name}} · **Client:** {{client}}
- **Tier:** {{1 marketing / 2 standard app / 3 complex-regulated}}
- **BMAD path:** {{Greenfield / Brownfield}} · {{Full Method / Quick Flow}}
- **Goal (one line):** {{outcome}}
- **Scope doc:** {{link}} → feeds the Analyst/PM
- **Staging URL:** {{url}} · **Prod URL:** {{url}}
- **Current version:** see `PROJECT_RECORD.md`

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

---

## 2. TECH STACK (Architect & Dev must use this)
TypeScript everywhere, `strict: true`, no `any` without a comment.

| Layer | Default |
|-------|---------|
| Framework | Next.js (App Router) |
| Styling | Tailwind CSS |
| UI components | shadcn/ui |
| Backend | Next.js Route Handlers / Server Actions |
| Database | Postgres via Supabase (or Prisma/Drizzle self-hosted) |
| Validation | **Zod** (the shared contract) |
| Auth | Supabase Auth / Auth.js (never hand-rolled) |
| Forms | React Hook Form + Zod resolver |
| Package manager | pnpm |
| Lint/format | ESLint + Prettier |
| Tests | Vitest (unit) + Playwright (critical e2e) |
| Hosting | Vercel + Supabase |

**Tier 1:** drop DB/auth/backend; static is fine. **Tier 3:** stricter validation, audit logging, never trust the client, more tests. To swap a tool, change it here first (Architect records an ADR), then build to it.

---

## 3. REPO STRUCTURE
```
/app                # routes (pages + route handlers)
/components         # ui/ = shadcn, shared/ = custom
/lib                # helpers, clients
/lib/schemas        # ZOD SCHEMAS — the shared contracts
/lib/types          # types derived via z.infer
/server             # server-only logic / data access
/hooks              # client hooks
/public             # static assets
/docs               # BMAD artifacts: product brief, PRD, UX specs, stories + ARCHITECTURE.md (Architect-maintained)
/.env.example       # documented env vars, no values
/CLAUDE.md          # this file (policy)
/CODING_CONVENTIONS.md  # house style (detailed)
/PROJECT_RECORD.md  # lifecycle + version log
```
Server-only code never imported into client components. Every shared data shape lives in `/lib/schemas`. BMAD's living artifacts live in `/docs` and stay updated.

---

## 4. HOW THE DEV AGENT IMPLEMENTS A STORY (inside BMAD's implementation loop)
BMAD's loop is: SM creates story → Architect confirms Definition of Ready → Dev implements (TDD) → QA reviews → quality gates → commit & sync. Within the Dev step, follow this order:
1. **Schema/contract** — Zod schema in `/lib/schemas`; derive types.
2. **Database** — table + migration matching the schema (never edit a shipped migration).
3. **Backend** — handler/action; validate input with the schema; typed result + typed error.
4. **Frontend** — import the *same* schema; consume the typed API (see §5).
5. **Wire & verify** — connect UI ↔ backend; confirm happy path AND one error path on staging.
6. **Commit** — small commit, conventional message.

TDD per acceptance criterion: RED → GREEN → REFACTOR. Front and back share the schema, so they can't be built against different assumptions.

---

## 5. UI / DESIGN WORKFLOW (Claude Design = the UX Designer's visual execution)
Visual decisions are locked **before** frontend code:
1. **UX spec (BMAD UX Designer)** — components, interaction patterns, structure (the "raw UI/UX").
2. **Claude Design (us)** — polish the design on the canvas (layout, spacing, type, color, branding); iterate via chat until approved (Milestone 1).
3. **Architect** references the approved design when creating stories.
4. **Dev** implements the approved design faithfully with Tailwind + shadcn. **Do not redesign during implementation.**

Rule: UX spec → Claude Design → stories → code. Don't skip the Claude Design pass for any client-facing UI.

---

## 6. STANDARDS
**General:** validate all external input (forms, bodies, params, webhooks) with Zod at the boundary; explicit error handling (no silent catch); named constants; small functions; accessible (semantic HTML, labels, alt, keyboard); mobile-first responsive; comments explain *why*.

**Backend:** validate → work → typed result/error · DB access only in `/server` or `/lib` · parameterized/ORM queries (never string-built SQL) · auth check on every protected route · never leak secrets or stack traces · verify webhook signatures and never trust client amounts (payments).

**Frontend:** Server Components for data by default, Client Components only for interactivity · forms = React Hook Form + shared Zod schema · no hardcoded URLs/keys · loading + error states for every async UI.

**Wiring:** the Zod schema is the one contract (backend + frontend validate with it; types via `z.infer`) · consistent response envelope (`{ data }` / `{ error }`) · all env vars in `.env.example`, read through one typed config module.

---

## 7. VERSIONING & RELEASES (sits above BMAD Sprint Status)
BMAD's Sprint Status tracks **stories** (backlog → ready-for-dev → in-progress → review → done). Our versioning tracks **releases**. They don't conflict.

Semantic Versioning **`MAJOR.MINOR.PATCH`**: pre-launch `0.x.y`; first launch `1.0.0`; PATCH = bug/content/style fix; MINOR = new feature/page (backward compatible); MAJOR = redesign/restructure/breaking change.

**Bridge rule — when an epic/sprint of stories reaches `done` and deploys to production:**
1. Pick the bump by the highest type of change in the release.
2. Update `PROJECT_RECORD.md` — current version + a new Version Log row.
3. `git tag v{{version}}` and push the tag.
4. Deploy. Tag and record's "current version" must match.

Never ship a release without bumping the version and updating `PROJECT_RECORD.md`.

---

## 8. GIT & COMMITS
Branches: `main` (prod), `dev` (integration), `feature/{{story-id}}` (use the BMAD story id, e.g. `feature/1-2-user-login`). Conventional commits (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `test:`, `style:`). One logical change per commit; commit often. Never force-push shared branches. Never commit `.env`, `node_modules`, build output, or secrets.

---

## 9. DEFINITION OF READY / DONE (aligns with BMAD gates)
**Definition of Ready (Architect checks before Dev starts):** story has clear ACs, the Zod contract is identified, dependencies known, design approved (for UI stories).
**Definition of Done (QA + gates):** runs with no console errors + passes lint · TDD tests pass (happy + one error path) · **quality gates pass: tests + build + type-check** · works on staging, responsive · no secrets/dead code/logs · conventional commit · Sprint Status set to `done`. Don't mark a story `done` until all are true.

---

## 10. WHEN STUCK
Uncertain about a library/API → check docs or ask. Ambiguous → ask one question, then proceed. Out of scope → flag to the PM as a change request. Destructive/many-file change → explain the plan first. If a story's Definition of Ready isn't met → send it back to the SM, don't improvise.

---

## 11. NEVER DO
❌ Implement without a story/spec · ❌ commit secrets · ❌ hallucinate libraries/functions/paths · ❌ destructive commands without confirmation · ❌ skip validation / trust client data · ❌ build front & back against different shapes · ❌ skip the Claude Design pass for client-facing UI · ❌ add a new framework the stack already covers · ❌ leave dead code/logs · ❌ expand scope alone · ❌ roll your own auth/crypto · ❌ mark a story `done` when it doesn't run / fails gates / isn't on staging · ❌ ship a release without bumping the version and updating `PROJECT_RECORD.md`.
