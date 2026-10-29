# Convex setup (ADR-008)

The Pro cloud lives in `packages/backend/convex/`: the schema, server functions and, later, HTTP actions. Free users never touch it (ADR-002).

## 1. Run it locally, no account needed

```bash
cd packages/backend
CONVEX_AGENT_MODE=anonymous npx convex dev
```

On Windows PowerShell, set the variable first: `$env:CONVEX_AGENT_MODE="anonymous"; npx convex dev`.

This starts a local Convex backend at `http://127.0.0.1:3210`, pushes the schema and functions, and keeps `convex/_generated/` up to date as you edit. It writes `CONVEX_DEPLOYMENT`, `CONVEX_URL` and `CONVEX_SITE_URL` to `packages/backend/.env.local`, which git ignores. Anonymous mode is in beta at Convex.

Use `npx convex dev --once` to push once and exit.

## 2. Tests

```bash
pnpm --filter @otto/backend test
```

`convex-test` runs the real functions in memory against the real schema. No backend has to be running.

## 3. Link a real Convex project (when the account exists)

1. Sign up at convex.dev with the Broadheader account.
2. From `packages/backend`, run `npx convex login`, then `npx convex dev --configure new`. Name the project `otto`.
3. Set server secrets in the deployment. They are never committed:
   ```bash
   npx convex env set LLM_PROVIDER groq
   npx convex env set GROQ_API_KEY <your key>   # type it yourself; never paste keys in chat
   ```
   The variables Convex reads are listed in `convex/lib/config.ts`.
4. Production gets its own deployment and its own secrets (`npx convex deploy`).

## What is here so far (story 14.1)

| Table | Holds |
|-------|-------|
| `profiles` | Entitlement per user (free / pro / lifetime) |
| `connectorTokens` | Google tokens, AES-256-GCM ciphertext only |
| `auditEvents` | Who accessed what kind of sensitive record. Never its contents. |
| `billingEvents` | RevenueCat events, idempotent by event id |
| `llmUsage` | Token counts per call. Never prompt text. |
| `quickAddQuota` | Free quick-adds used per day |
| `rateLimits` | LLM requests per minute window |

Every table is generated from its Zod contract in `packages/schemas/src/cloud.ts`. All functions are **internal** for now. Sign-in (story 14.2) adds the identity checks that public functions require.
