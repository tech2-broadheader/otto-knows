# Story 14.1: Convex project, schema and contracts

Status: review (built 2026-10-29). Runs on a local Convex with no account. Linking the real project waits for the Convex account.

## Acceptance Criteria

1. **AC1** `convex/` in the repo (workspace package), typed env config, and tables for users/entitlement, connector tokens, audit events, billing events and usage/quota, mirrored from the Zod schemas. **Done.**
   - Package `@otto/backend` in `packages/backend/convex/`, following Convex's monorepo layout.
   - Contracts are in `packages/schemas/src/cloud.ts`.
   - `convex/schema.ts` builds every table from those contracts with `zodToConvexFields`, so the two cannot drift.
   - Tables: `profiles`, `connectorTokens`, `auditEvents`, `billingEvents`, `llmUsage`, `quickAddQuota`, `rateLimits`.
   - Typed env: `convex/lib/config.ts`. Error messages name a bad variable but never print its value.
2. **AC2** Functions validate input with the shared Zod schemas, and an automated suite runs the Convex functions locally with convex-test. **Done.**
   - `zInternalQuery` / `zInternalMutation` (`convex-helpers/server/zod3`) take Zod `args`.
   - `convex/cloud.test.ts` has 13 tests: happy paths, contract rejections, idempotency, quota and window resets, and the audit trail.

## Spike findings (versions checked 2026-10-29)

- `convex` 1.48.0. `convex-helpers` 0.1.129, which needs zod ≥ 3.25; the repo has 3.25.76. `convex-test` 0.0.66 with `@edge-runtime/vm` 5.
- **`@convex-dev/better-auth` 0.12.6 requires `better-auth` >= 1.6.11 and < 1.7.0, but the latest better-auth is 1.7.14.** Story 14.2 must pin `better-auth` to the 1.6 line (1.6.33 is the newest).
- `CONVEX_AGENT_MODE=anonymous npx convex dev` runs a local backend with no account (beta). The schema deployed with all indexes.

## Decisions

- All functions are **internal**. No app can call them until 14.2 adds identity checks.
- Connector-token reads are mutations, because every read writes an audit event (Tier 3).
- `setEntitlement` writes its own audit event (`set:<tier>`), so a change can't skip the trail.
- User ids are Better Auth ids (`cloudUserIdSchema`), not UUIDs. Times are epoch ms, as Convex stores them.
- The web's `entitlementSchema` now comes from `@otto/schemas`, so there is one definition.

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (claude-opus-5-5)

### Completion Notes

- Gates: typecheck clean; lint 0; 591 tests (schemas 63, core 154, backend 13, mobile 230, web 131).
- New dependencies:
  - `convex`, `convex-helpers`, `convex-test`, `@edge-runtime/vm`: ADR-008 and the story's AC2.
  - `@types/node` (dev): for `process.env` types.
- `convex/_generated/` is committed (Convex's recommendation) and excluded from lint and format.
- Not wired into the web or mobile yet. The Supabase paths keep working until 14.6.

### File List

- `packages/schemas/src/cloud.ts`, `cloud.test.ts`, `index.ts`
- `packages/backend/package.json`, `vitest.config.ts`
- `packages/backend/convex/schema.ts`, `tsconfig.json`, `profiles.ts`, `connectorTokens.ts`, `billing.ts`, `usage.ts`, `test.setup.ts`, `cloud.test.ts`, `lib/config.ts`, `lib/functions.ts`, `lib/audit.ts`, `_generated/*`
- `apps/web/src/server/auth.ts`
- `docs/SETUP-convex.md`, `.env.example`, `eslint.config.*`, `.prettierignore`, `pnpm-lock.yaml`
