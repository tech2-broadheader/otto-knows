# Project Starter — Broadheader

Copy this folder into every new web project. It contains only the files that belong **in the repo**. Your methodology reference docs (Project Phases Handbook, Development Rules Handbook, BMAD Alignment Guide) stay in your library (Notion) — they don't go in client repos.

## What's in here
```
CLAUDE.md              # Policy/guardrails every BMAD agent obeys. Fill in §0.
CODING_CONVENTIONS.md  # House style (detailed). Reusable, rarely changes.
PROJECT_RECORD.md      # Lifecycle + SemVer version log for this site. Fill in §1.
.env.example           # Env var keys (no values). Copy to .env.local.
.gitignore             # Sensible Node/Next.js defaults.
docs/
  scope.md             # Phase 2 scope. Feeds the BMAD Analyst/PM. Fill it in.
  ARCHITECTURE.md      # Per-project architecture — the BMAD Architect fills this.
```

## Getting started (per new project)
1. Copy this folder's contents into your new repo.
2. Fill in `CLAUDE.md §0` (project, client, tier, BMAD path) and `PROJECT_RECORD.md §1` (start version `0.1.0`).
3. Fill in `docs/scope.md` from the signed scope.
4. `cp .env.example .env.local` and add real values (never commit `.env.local`).
5. Install BMAD: `npx bmad-method install`, then open the repo in Claude Code.
6. Choose the path: Greenfield vs Brownfield, Full Method vs Quick Flow (see the BMAD Alignment Guide).
7. Point the Analyst (greenfield) at `docs/scope.md`; let the Architect produce `docs/ARCHITECTURE.md`.

## Who reads what
- **BMAD agents read:** `CLAUDE.md`, `CODING_CONVENTIONS.md`, `docs/ARCHITECTURE.md`.
- **Humans read:** everything, plus the library handbooks for the reasoning.

## Versioning
SemVer `MAJOR.MINOR.PATCH`. `0.x.y` during build, `1.0.0` at launch. On every production release: bump the version, add a row to `PROJECT_RECORD.md`, and `git tag v{{version}}`. See `CLAUDE.md §7`.
