# ARCHITECTURE.md — Otto (Personal Daily Assistant)
> **Per-project document.** Maintained by the BMAD **Architect agent** during the Solutioning phase, then kept updated as a living document. Lives in `/docs`.

| | |
|--|--|
| Project | Otto (Personal Daily Assistant) |
| Tier | 3 — complex / regulated |
| Status | Drafting (seeded from locked spec; refined as planning proceeds) |
| Maintained by | Architect agent (reviewed by Broadheader) |
| Last updated | 2026-06-14 / 0.1.0 |

---

## 1. Overview
Otto is a proactive, cross-domain personal daily assistant. It unifies calendar, reminders, events, finance and health into a single **context graph**, interprets that graph through the **routine layer** (a model of the user's daily rhythm), and uses an **LLM brain** to produce daily briefings, well-timed nudges, and *proposed* write-back actions (always user-confirmed). Primary user goal: open the app and immediately know what matters today. Reference: PRD (`/_bmad-output/planning-artifacts/prd.md`).

## 2. Architecture style
**Local-first mobile app + thin cloud backend**, in a TypeScript monorepo.
- The mobile app (React Native + Expo) owns the free-tier experience and works against an on-device SQLite store — the "smart organizer" runs without a backend.
- A Next.js backend provides Pro-tier services only: the **LLM proxy** (keeps provider keys server-side, meters usage), cloud **sync/backup**, and a small **web companion**.
- Split into more services only if a clear need is documented in an ADR. Rationale: the spec's economics (high local margin, real per-user LLM cost) map directly onto "free runs locally, paid hits the metered backend."

## 3. Tech stack
Authoritative source: `CLAUDE.md §2`. This project uses:
- Mobile: React Native + Expo (Android-first, iOS-ready); NativeWind for styling.
- Web / backend: Next.js App Router on Vercel.
- DB: Supabase Postgres (cloud / Pro); SQLite via Drizzle (`expo-sqlite`) on device (free).
- Validation: Zod (shared contracts in `/packages/schemas`).
- Auth: Supabase Auth.
- LLM: cloud Claude model behind a server-side proxy with usage metering.
- Hosting: Vercel + Supabase.
- Deviation from the historical Next.js-only default is justified by **ADR-001**.

## 4. High-level data flow
**Free / local:**
`Mobile UI → local domain logic (routine engine + context graph) → Zod validation → SQLite (Drizzle) → notifications` — no network required.

**Paid / cloud:**
`Mobile UI → Zod validation → Next.js Route Handler (auth + entitlement check) → LLM proxy (context graph + routine lens as input, tool-calling for write-back) → proposed actions → user confirm → write-back to local store + connectors`, all in the `{ data } | { error }` envelope.

```
Sources (Calendar · Reminders · Events · Finance · Health)
        → Context Graph  → Routine Layer (the lens)
        → LLM Brain (cross-domain reasoning)
        → Write-back Tools (create reminder · log expense · block time)  --confirm-->  User
        → Proactive Briefings & Nudges                                                  User
User --natural language--> LLM Brain
```

## 5. Modules / domains
| Domain | Responsibility | Key entities |
|--------|----------------|--------------|
| context-graph | Unified model across all sources | ContextItem, Source |
| routine | The lens: anchors, scheduling substrate, deviation radar | Routine, RoutineAnchor |
| calendar | Read calendar/events; write blocks (confirmed) | CalendarEvent |
| reminders | Routine-timed reminders, meds, bills | Reminder, Medication, Bill |
| finance | Manual entry, wallets, budget, safe-to-spend, monthly report | Account, Transaction (expense / income / transfer), BudgetCategory, Income |
| health | Wearable data (gated module) | HealthMetric |
| briefing | Compose routine-anchored daily briefs + nudges | Briefing, Nudge |
| brain | LLM reasoning + tool-calling (proposes actions) | Proposal, ToolCall |
| optimizer | Analyze day → reshape → insert new routine (propose-and-confirm) | OptimizationProposal |
| caregiver | Family mode: relay parent's med/bill alerts | CaregiverLink |
| billing | Entitlements: free vs Pro vs Lifetime | Subscription, Entitlement |
| consent | Granular per-source consent + audit log | Consent, AuditEntry |

## 6. Data model
Entities and relationships live as Zod schemas in `/packages/schemas`; types via `z.infer`. Local migrations (Drizzle/SQLite) live in the mobile app; cloud migrations (Supabase) live in the web app. Never edit a shipped migration. Sensitive entities (finance, health) are encrypted at rest and access is audit-logged (Tier 3).

The on-device SQLite schema evolves via versioned migrations (`PRAGMA user_version`, ordered steps, each in a transaction) — see ADR-004. Never edit a shipped step; every schema change is a new step.

## 7. API surface
Overview (the contract is the Zod schema, not this table):
| Route / Action | Method | Purpose | Auth |
|----------------|--------|---------|------|
| /api/llm/brief | POST | Generate proactive daily briefing from context graph | required (Pro) |
| /api/llm/quick-add | POST | Parse a natural-language quick-add into structured items | required (quota) |
| /api/llm/optimize | POST | Propose a reshaped day for a new routine (propose-and-confirm) | required (Pro) |
| /api/sync | POST/GET | Cloud backup & cross-device sync | required (Pro) |
| /api/connectors/google | * | Google Calendar/Tasks OAuth + read/write | required |

## 8. Auth & authorization
- Authentication: Supabase Auth (email/OAuth); free tier can run fully local/anonymous, cloud features require an account.
- Authorization: entitlement checks (free / Pro / Lifetime) on every Pro route; caregiver links are explicit, consented, revocable. Every protected route/action checks server-side. Free-tier quotas (NL quick-adds, bill/med caps) enforced server-side for cloud calls and client-side for local.

## 9. External integrations
| Integration | Purpose | Notes / secrets location |
|-------------|---------|--------------------------|
| LLM provider | The brain | Key server-side only (`.env`), behind the proxy; meter usage |
| Google Calendar / Tasks | Read for briefing, write for optimizer | OAuth; tokens encrypted; never trust client scopes |
| Health Connect / HealthKit | Wearable data (gated) | Device permission; explicit consent; never used for ads |
| Payments / store billing | Subscriptions + Lifetime SKU | Verify receipts server-side; never trust client amounts |
| (Conditional) SMS parsing | Finance auto-capture | **Hard gate** — verify current Google Play policy first |

## 10. Environments & deployment
- Local → Staging → Production. Hosting: Vercel (web/backend) + Supabase (DB); Expo EAS for mobile builds.
- Env vars documented in `.env.example`, read through one typed config module.
- Release process: see `CLAUDE.md §7` + `PROJECT_RECORD.md` version log.

## 11. Cross-cutting concerns
- **Validation:** Zod at every boundary (forms, connector payloads, LLM tool args).
- **Error handling:** typed errors, consistent envelope, no leaks.
- **Logging/observability:** structured server logs for LLM proxy + sync; never log sensitive finance/health payloads.
- **Security:** Supabase Auth, input validation, server-side secrets, rate limiting on LLM routes, encryption at rest for sensitive data, **audit logging on finance/health access (Tier 3)**.
- **Privacy (DPA):** granular consent per source, explicit disclosure, no ad use of sensitive data, export & delete.
- **Performance:** local-first reads; cache briefings; paginate history; batch LLM calls; quota free tier.
- **Trust / safety:** write-back is always propose-and-confirm; tips stay non-prescriptive and supportive.

## 12. Architecture Decision Records (ADRs)
| # | Decision | Status | Date |
|---|----------|--------|------|
| ADR-001 | React Native + Expo (mobile) + Next.js (backend/web), shared TS + Zod — instead of Flutter (spec) or Next-only (starter default) | Accepted | 2026-06-14 |
| ADR-002 | Local-first SQLite for free tier; cloud Supabase only for Pro sync/LLM | Accepted | 2026-06-14 |
| ADR-003 | Manual finance entry is the launch baseline; SMS parsing gated on Play policy | Accepted | 2026-06-14 |
| ADR-004 | Derived wallet balances + versioned on-device migrations | Accepted | 2026-10-07 |

### ADR-001 — React Native + Expo + Next.js, unified by TypeScript + Zod
- **Context:** The spec (§13) suggests Flutter (Android-first mobile). The project-starter's `CLAUDE.md` defaults to a Next.js-only web stack. The owner asked to standardize on React / React Native to keep web and mobile "inline" (one ecosystem), and delegated the final call.
- **Decision:** Build the mobile app in React Native + Expo and the Pro backend / LLM proxy / web companion in Next.js, sharing one set of TypeScript + Zod contracts in `/packages/schemas`.
- **Status:** Accepted.
- **Consequences:** One language and one contract across web + mobile; reuses the starter's TS/Zod/React conventions. Satisfies native-mobile needs Flutter would (Health Connect, SMS paths) without leaving the TS ecosystem, and unlike Next-only it can actually ship a native Android app. Trade-off: RN's native modules for Health Connect / SMS need care; some shadcn web components have no 1:1 mobile equivalent (NativeWind + RN primitives instead).

### ADR-002 — Local-first free tier, cloud only for Pro
- **Context:** Spec economics: local storage = high margin; online + LLM = real per-user cost. Free must not incur backend cost.
- **Decision:** Free tier runs entirely on-device (SQLite). Cloud (Supabase + LLM proxy) is reached only by Pro features.
- **Status:** Accepted.
- **Consequences:** Free tier is cheap and works offline; Pro carries the metered cost it should. Adds sync-reconciliation complexity when a user upgrades (local → cloud migration).

### ADR-003 — Manual finance entry baseline; SMS parsing gated
- **Context:** No clean PH open-banking API; Google Play restricts SMS permissions; DPA applies to financial data (spec §5.2, §12).
- **Decision:** Ship manual salary + recurring entry as the baseline. Pursue SMS/notification parsing only after verifying current Play policy; keep it behind a feature flag.
- **Status:** Accepted.
- **Consequences:** De-risks launch and store review; finance still works day one. SMS auto-capture becomes an additive enhancement, not a launch dependency.

### ADR-004 — Derived wallet balances + versioned on-device migrations
- **Context:** E11 Budgeting+ adds wallets with balances and extends `transactions` (type, account, transfer target). The mobile store was created with `CREATE TABLE IF NOT EXISTS` at boot, which cannot evolve tables on installed devices. A stored running balance would drift whenever a transaction is edited or deleted.
- **Decision:** (1) Wallet balances are computed (opening balance + typed transactions) in `/packages/core`, never stored as a mutable total. (2) The mobile SQLite schema moves to versioned migrations tracked by `PRAGMA user_version`; each step runs in a transaction, and shipped steps are never edited.
- **Status:** Accepted.
- **Consequences:** No balance drift or double-counting on edit/delete. Small compute cost (decrypt + sum on device), acceptable at personal-finance volumes; revisit with cached monthly snapshots if needed. Every future local schema change ships as a new migration step with an upgrade-path test.

## 13. Constraints, risks & open questions
- **Constraints:** PH DPA across finance/health/routine; Google Play SMS policy; platform health-data rules; LLM cost per paid user.
- **Risks & mitigations:** SMS gate → manual-entry fallback (ADR-003); health-data rules → gated module + explicit consent; optimizer overreach → propose-and-confirm only; tone drift → non-prescriptive tip guardrails; LLM cost → free-tier quotas + Pro pricing.
- **Open questions:** OD-1 platform confirm · OD-2 conversational depth of v1 · OD-3 finance capture method · OD-4 product name/brand · OD-5 pricing validation (see `docs/scope.md §13`).
