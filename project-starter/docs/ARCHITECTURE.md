# ARCHITECTURE.md — {{Project Name}}
> **Per-project document.** Maintained by the BMAD **Architect agent** during the Solutioning phase, then kept updated as a living document. It's seeded with our default patterns below — the Architect adapts them to this project and records the decisions as ADRs (§12). Lives in `/docs`.

| | |
|--|--|
| Project | {{name}} |
| Tier | {{1 / 2 / 3}} |
| Status | {{Drafting / Approved / Living}} |
| Maintained by | Architect agent (reviewed by us) |
| Last updated | {{date / version}} |

---

## 1. Overview
What this system does, in 2–3 sentences, and the primary user goal. Reference: PRD (`/docs/prd.md`).

## 2. Architecture style
Default: a **Next.js full-stack application** (frontend + backend in one codebase) backed by a managed Postgres (Supabase). Single deployable unit; split into services only if a clear need is documented in an ADR.
- {{State the chosen style and one-line rationale.}}

## 3. Tech stack
Authoritative source: `CLAUDE.md §2`. This project uses:
- Framework: {{Next.js App Router}}
- DB: {{Supabase Postgres}}
- Validation: Zod (shared contracts in `/lib/schemas`)
- Auth: {{Supabase Auth}}
- Hosting: {{Vercel + Supabase}}
- {{deviations from the default + the ADR that justifies them}}

## 4. High-level data flow
Describe the path of a request end to end. Default:
`Client (Server/Client Components) → Next.js Route Handler / Server Action → validation (Zod) → /server data access → Postgres`, response returned in the `{ data } | { error }` envelope.
- {{Add a simple diagram or bullet flow specific to this project.}}

## 5. Modules / domains
List the feature domains and what each owns.
| Domain | Responsibility | Key entities |
|--------|----------------|--------------|
| {{auth}} | {{login, sessions}} | {{User, Session}} |
| {{...}} | | |

## 6. Data model
Entities, relationships, and where the schemas live (`/lib/schemas`). Note ownership and key constraints.
- {{Entity → fields → relationships. Migrations live in the DB/migrations folder.}}

## 7. API surface
Overview of endpoints / server actions (not full docs — the contract is the Zod schema).
| Route / Action | Method | Purpose | Auth |
|----------------|--------|---------|------|
| {{/api/orders}} | {{POST}} | {{create order}} | {{required}} |

## 8. Auth & authorization
- Authentication: {{provider, session model}}.
- Authorization: {{roles/permissions, where checks happen}}. Every protected route/action checks server-side.

## 9. External integrations
| Integration | Purpose | Notes / secrets location |
|-------------|---------|--------------------------|
| {{payments}} | {{checkout}} | {{keys in .env, verify webhook signatures}} |

## 10. Environments & deployment
- Local → Staging → Production. Hosting: {{...}}.
- Env vars documented in `.env.example`, read through one typed config module.
- Release process: see `CLAUDE.md §7` + `PROJECT_RECORD.md` version log.

## 11. Cross-cutting concerns
- **Validation:** Zod at every boundary.
- **Error handling:** typed errors, consistent envelope, no leaks.
- **Logging/observability:** {{what + where}}.
- **Security:** {{auth, input validation, secrets, rate limiting}}. Tier 3 adds audit logging.
- **Performance:** {{caching, pagination, image strategy}}.

## 12. Architecture Decision Records (ADRs)
One row per significant decision; expand each below using the template.

| # | Decision | Status | Date |
|---|----------|--------|------|
| ADR-001 | {{e.g. Use Supabase over self-hosted Postgres}} | Accepted | {{date}} |

### ADR-{{NNN}} — {{title}}
- **Context:** {{the problem / forces at play}}
- **Decision:** {{what we chose}}
- **Status:** {{Proposed / Accepted / Superseded by ADR-XXX}}
- **Consequences:** {{trade-offs, what this makes easy/hard}}

## 13. Constraints, risks & open questions
- {{Known constraints (budget, deadline, compliance).}}
- {{Risks + mitigations.}}
- {{Open questions for the PM/client.}}
