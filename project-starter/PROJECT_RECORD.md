# PROJECT RECORD — {{Website / Project Name}}
> Lives in the **root of the website repo** (and can be rendered on an internal `/about-this-build` page). It records how this site started, how it progressed, when it launched, and what version it is at any time. Update it at every milestone and every release.

---

## 1. Overview
| Field | Value |
|-------|-------|
| Project name | {{name}} |
| Client / Owner | {{client}} |
| Built by | Broadheader {{+ partner if any}} |
| Tier | {{1 marketing / 2 standard app / 3 complex}} |
| BMAD path | {{Greenfield / Brownfield}} · {{Full Method / Quick Flow}} |
| Goal (one line) | {{business outcome}} |
| Repository | {{git url}} |
| Staging URL | {{url}} |
| Production URL | {{url}} |
| Tech stack | {{e.g. Next.js + TS + Tailwind + Supabase}} |
| **Current version** | **{{0.1.0}}** |
| Status | {{In development / Live / Maintenance}} |
| Start date | {{YYYY-MM-DD}} |
| Launch date | {{YYYY-MM-DD or —}} |

---

## 2. Lifecycle Log (started → ended)
Record the start/finish of each phase and milestone.

| Phase / Milestone | Started | Completed | Version | Notes |
|-------------------|---------|-----------|---------|-------|
| Setup (M0) | {{date}} | {{date}} | 0.1.0 | Repo, staging, board live |
| Structure & design (M1) | | | 0.2.0 | Incl. Claude Design pass |
| Data & backend (M2) | | | 0.3.0 | |
| Core build (M3) | | | 0.5.0 | |
| Content & polish (M4) | | | 0.9.0 | |
| Launch & handover (M5) | | | 1.0.0 | Live on production |

---

## 3. Version Log (changelog)
> **vs BMAD Sprint Status:** BMAD tracks *stories* (backlog → ready-for-dev → in-progress → review → done) in its own sprint-status file. This log tracks *releases*. When an epic/sprint of stories reaches `done` and deploys to production, record it here as a release.

Newest at the top. One row per production release. Every release also gets a matching git tag (e.g. `v1.2.0`).

| Version | Date | Type | Summary of changes |
|---------|------|------|--------------------|
| {{1.0.0}} | {{date}} | major | Initial public launch |
| 0.9.0 | {{date}} | minor | Content loaded, responsive polish |
| 0.1.0 | {{date}} | minor | Project initialized |

---

## 4. Versioning Rules (how this site is versioned)
We use **Semantic Versioning: `MAJOR.MINOR.PATCH`** (e.g. `2.4.1`).

- **Pre-launch (`0.x.y`)** — the site is still in development and not yet stable/public. Bump the middle number as milestones complete (0.1.0 → 0.2.0 …).
- **Launch (`1.0.0`)** — the first production release. The site is live and considered stable.
- **PATCH (`1.0.x`)** — bug fixes, copy/content tweaks, small style fixes. No new features, nothing breaking.
- **MINOR (`1.x.0`)** — a new page, section, or feature added in a backward-compatible way.
- **MAJOR (`x.0.0`)** — a redesign, restructure, or breaking change (changed URLs, data shape, major overhaul).
- **Pre-release suffixes** (optional) — `1.3.0-beta.1` for previews before a release is final.

**Release rules**
1. Every production deploy gets a version number.
2. Tag the release in git: `git tag v{{version}}` and push the tag.
3. Add a row to the **Version Log** above for every release — date, type, and a one-line summary.
4. The version in §1 (“Current version”) always matches the latest production tag.
5. Decide the bump by the *highest* type of change in the release (one breaking change makes the whole release MAJOR).

---

## 5. Handover Info
| Item | Owner / Location |
|------|------------------|
| Domain registrar | {{who owns it / where}} |
| Hosting | {{provider, account owner}} |
| Database | {{provider}} |
| Third-party accounts | {{email, payments, analytics}} |
| Admin / CMS access | {{how to log in}} |
| How to update content | {{short instructions or link}} |
| Warranty window | {{e.g. 14 days bug fixes; then maintenance plan}} |

---

## 6. Notes / Decisions Log (optional)
Record significant decisions and their date so future-you knows *why* something is the way it is.
- {{date}} — {{decision and reason}}
