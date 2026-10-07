---
baseline_commit: f9d62bd5a252945b7f9fbd87d8954c5168b65d4a
---

# Story 11.1: Versioned local DB migrations

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an Otto user who already has data on my phone,
I want app updates to upgrade my on-device database safely,
so that new budgeting features (wallets, income/transfers) arrive without losing or corrupting my existing finance, reminder and routine data.

## Acceptance Criteria

1. **Versioned, ordered migrations.** The mobile store tracks its schema version in SQLite `PRAGMA user_version` and, at boot, applies every migration step whose version is greater than the current one, in ascending order. Fresh installs and upgraded installs end at the same latest version and the same schema.
2. **Baseline step preserves today's installs.** Migration step `1` is the current schema (the existing `CREATE TABLE IF NOT EXISTS` statements, unchanged). An existing install (tables present, `user_version = 0`) runs step 1 as a no-op on data and ends at `user_version = 1` with every row intact.
3. **Atomic per step.** Each step runs inside a transaction together with its `PRAGMA user_version = N` write. If a step throws, that step is rolled back, `user_version` stays at the last successful version, and no later step runs.
4. **Typed failure, visible to the user.** A migration failure surfaces as a typed `MigrationError` (`kind: "step-failed" | "newer-than-app"`, `fromVersion`, `failedVersion?`) — never an unhandled exception or a silent fall-through to onboarding. App boot shows an error screen (existing `ErrorState` component) with a "Try again" action that re-runs migrations. Error text contains no SQL, stack trace, or user data.
5. **Downgrade guard.** If `user_version` is higher than the latest version this app build knows, the app does not touch the database and reports `newer-than-app` ("Please update Otto to the latest version").
6. **Tests (real SQL, Node).** Unit tests run the migrator against a real in-memory SQLite (`node:sqlite`) through a small executor adapter and cover: (a) fresh DB → latest; (b) v0 DB with existing rows in `transactions`, `bills`, `income`, `reminders` → latest, rows preserved byte-for-byte; (c) a failing step rolls back and leaves `user_version` at the prior value; (d) re-running at latest is a no-op; (e) newer-than-app guard; (f) the migrated schema's columns match the Drizzle table definitions in `src/db/schema.ts` for every table.
7. **No regressions.** `wipeAllData()` still deletes all rows and does **not** reset `user_version`. All existing tests, type-check and lint stay green.

## Tasks / Subtasks

- [x] **Task 1 — Pure migrator core** (AC: 1, 3, 5)
  - [x] 1.1 Create `apps/mobile/src/db/migrations.ts` (PURE — must not import `expo-sqlite`). Define:
        - `type MigrationExecutor = { exec(sql: string): void; getUserVersion(): number; transaction(fn: () => void): void }`
        - `type Migration = { version: number; name: string; statements: readonly string[] }`
        - `type MigrationError` (discriminated union per AC4) and `type MigrationResult = { ok: true; fromVersion: number; toVersion: number } | { ok: false; error: MigrationError }`
        - `runMigrations(executor, migrations): MigrationResult` — validates versions are contiguous from 1 and strictly ascending (programming error → throw at module load/test, not at runtime for users), applies pending steps each in `executor.transaction(...)`, setting `PRAGMA user_version = N` as the last statement inside that transaction.
        - Export `LATEST_SCHEMA_VERSION` derived from the migration list (never hand-maintained).
  - [x] 1.2 Return a typed result rather than throwing for runtime failures (CLAUDE.md §6 "explicit error handling, typed error"). Do not swallow the cause silently — keep it on the error object for dev logging (but never render it).
- [x] **Task 2 — Migration list with baseline step** (AC: 2)
  - [x] 2.1 Create `apps/mobile/src/db/migration-steps.ts` exporting `MIGRATIONS: readonly Migration[]` with step `{ version: 1, name: "baseline", statements: <the 12 existing CREATE TABLE IF NOT EXISTS statements moved verbatim from client.ts> }`.
  - [x] 2.2 Add a header comment: shipped steps are immutable; every schema change is a new step (ARCHITECTURE §6, ADR-004). Note SQLite `ALTER TABLE ADD COLUMN` limits for future steps (a `NOT NULL` column needs a `DEFAULT`; no `DROP`/type change without table rebuild).
- [x] **Task 3 — Wire into the native client** (AC: 1, 3, 7)
  - [x] 3.1 In `apps/mobile/src/db/client.ts`: remove `CREATE_TABLE_STATEMENTS` and `ensureSchema()`; add `migrateDatabase(): MigrationResult` that builds an executor over the expo-sqlite handle — `exec` → `handle.execSync`, `getUserVersion` → `handle.getFirstSync<{ user_version: number }>("PRAGMA user_version")?.user_version ?? 0`, `transaction` → `handle.withTransactionSync`.
  - [x] 3.2 Update the file's header comment (it currently says "switch to drizzle-kit migrations … when the schema needs to evolve") to describe the chosen approach and point to ADR-004.
  - [x] 3.3 Keep `wipeAllData()` behaviour; leave `ALL_TABLES` as the explicit list, and add a comment that new tables added by future steps must be appended there.
- [x] **Task 4 — Boot handling + error screen** (AC: 4, 5)
  - [x] 4.1 `apps/mobile/src/data/index.ts`: `initDataLayer()` returns the `MigrationResult` (rename usage, keep the export name).
  - [x] 4.2 `apps/mobile/App.tsx`: add a `"db-error"` phase. In `boot()`, if the result is not ok, set the phase and stop (do not configure notifications, read the routine, or call `rescheduleDay`). Render `<ErrorState message={…} onRetry={…} />` from `src/components/AsyncBoundary.tsx`; retry re-runs `boot()`.
  - [x] 4.3 User-facing copy (gentle, no jargon): `step-failed` → "Otto couldn't finish updating your data. Your information is safe — please try again."; `newer-than-app` → "Your data was saved by a newer version of Otto. Please update the app to continue." No retry button for `newer-than-app`.
- [x] **Task 5 — Tests** (AC: 6, 7)
  - [x] 5.1 `apps/mobile/src/db/migrations.test.ts` with a test helper `createNodeSqliteExecutor(db: DatabaseSync)` (from `node:sqlite`) implementing `MigrationExecutor` (`transaction` = `BEGIN` / `COMMIT`, `ROLLBACK` on throw, rethrow).
  - [x] 5.2 Cover AC6 (a)–(e) with the real `MIGRATIONS` plus synthetic step lists for the failure/order cases.
  - [x] 5.3 AC6 (f): for each table in `tables` from `src/db/schema.ts`, compare `getTableConfig(table).columns` names (from `drizzle-orm/sqlite-core`) to `PRAGMA table_info(<name>)` after migrating. **Verify `schema.ts` is Node-importable first** (it only imports `drizzle-orm/sqlite-core`; it must not pull in `expo-sqlite`).
  - [x] 5.4 Assert `ALL_TABLES`-equivalent coverage: every table created by migrations appears in the wipe list (export the list from a pure module if needed so it is testable without native imports).
- [ ] **Task 6 — Tooling & docs**
  - [x] 6.1 `node:sqlite` needs Node ≥ 22.5 (verified working under Vitest on Node 24.14 in this repo). Bump root `package.json` `engines.node` from `>=20` to `>=22.13` (test-only requirement; app runtime is unaffected).
  - [ ] 6.2 Run quality gates: `pnpm typecheck`, `pnpm test`, `pnpm lint`. Then a manual Android check: install the **previous** build with some data → install this build → data still there, app boots normally.
  - [ ] 6.3 Update sprint status for `11-1-versioned-local-migrations` per the BMAD flow.

## Dev Notes

### Why this story exists
E11 (Budgeting+) must add an `accounts` table and new columns on `transactions` (type, account, transfer target). Today the store is built with `CREATE TABLE IF NOT EXISTS` at boot and has **no migration mechanism**, so installed apps would never get the new columns. This story is pure infrastructure — **no UI design pass needed** (it only reuses the existing, already-designed `ErrorState`). [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-10-07.md §1, §4.1]

### Current state of the files being modified
- **`apps/mobile/src/db/client.ts`** — the ONLY module that imports native `expo-sqlite` (keep it that way). Holds `CREATE_TABLE_STATEMENTS` (12 tables: routine, routine_anchors, reminders, medications, bills, income, transactions, budget_categories, calendar_events, context_items, consents, audit_entries), `getDatabase()` (Drizzle wrapper, lazily opens `otto.db`), `ensureSchema()` (runs every CREATE statement), `ALL_TABLES`, and `wipeAllData()` (DELETE from every table — used for DPA erasure / app reset). No FKs enforced.
  - **Preserve:** `DATABASE_NAME`, `getDatabase()`, `OttoDatabase` type, `wipeAllData()` semantics, the single shared `rawDb` handle.
- **`apps/mobile/src/data/index.ts`** — `initDataLayer()` just calls `ensureSchema()`; `createRepositoryDeps()` unchanged.
- **`apps/mobile/App.tsx`** — `boot()` calls `initDataLayer()` synchronously with **no error handling**; a throw there currently becomes an unhandled promise rejection and the app sits on "Starting Otto". Phases: `booting | onboarding | auth | main`. Routine-load failure is deliberately treated as first-run — **do not** extend that pattern to migration failures (that would send a user with data into onboarding).
- **`apps/mobile/src/db/schema.ts`** — Drizzle table definitions that must match the SQL. Sensitive columns (e.g. `transactions.amount_minor`, `description`) hold ciphertext as TEXT; migrations must never transform their contents.

### Architecture compliance
- ADR-004 (accepted 2026-10-07): versioned migrations via `PRAGMA user_version`, ordered steps, each in a transaction; never edit a shipped step. [Source: docs/ARCHITECTURE.md §6, §12 ADR-004]
- Local-first (ADR-002): migrations run on device, offline, no network. [Source: docs/ARCHITECTURE.md ADR-002]
- Keep native imports out of pure modules so Vitest (Node) can test the logic — existing project convention stated at the top of `client.ts` and `data/index.ts`.
- Typed results/errors, no silent catch, no `console.log` in commits, comments explain *why*. [Source: CLAUDE.md §1, §6]

### Library / API facts (verified in this repo, 2026-10-07)
- `expo-sqlite` **16.0.10** (`node_modules/expo-sqlite/build/SQLiteDatabase.d.ts`): `execSync(source)`, `withTransactionSync(task)`, `getFirstSync<T>(source, ...params)`. `PRAGMA user_version` is stored in the DB header and participates in the transaction, so writing it inside `withTransactionSync` is atomic with the step.
- **Do NOT** adopt `drizzle-orm/expo-sqlite/migrator` + `drizzle-kit` generated SQL for this story: it tracks state in its own `__drizzle_migrations` table (not `user_version`), and needs Metro/Babel changes to bundle `.sql` files. ADR-004 chose the hand-rolled `user_version` approach. (`drizzle-kit` is present in devDependencies but unused on mobile.)
- `node:sqlite` `DatabaseSync` works in Vitest on Node 24.14 here (prints an `ExperimentalWarning` — harmless; do not suppress globally). Use `db.exec(sql)` and `db.prepare("PRAGMA user_version").get()` → `{ user_version: number }`.
- `getTableConfig` is exported by `drizzle-orm/sqlite-core` (verified) — use it for the schema-parity test.

### Testing standards
- Vitest, colocated `*.test.ts` (see `src/security/*.test.ts`, `src/notifications/schedule-diff.test.ts` for style). TDD per AC: RED → GREEN → REFACTOR. Happy path + at least one error path required. [Source: CLAUDE.md §4, §9]
- Mobile tests run with `pnpm --filter @otto/mobile test` (`vitest run`, default config, no setup file).

### Project Structure Notes
- New files: `apps/mobile/src/db/migrations.ts`, `apps/mobile/src/db/migration-steps.ts`, `apps/mobile/src/db/migrations.test.ts`.
- Modified: `apps/mobile/src/db/client.ts`, `apps/mobile/src/data/index.ts`, `apps/mobile/App.tsx`, root `package.json` (engines).
- No change to `/packages/schemas` (no data contract changes in this story) and no web/Supabase change.

### What comes next (for context, do not build here)
- 11.2 adds step `2`: `CREATE TABLE accounts …`, then inserts a default "Cash" account and assigns existing transactions to it — that step depends on this migrator's transaction guarantee. 11.3 adds `type` / `account_id` / `to_account_id` columns to `transactions` via `ALTER TABLE … ADD COLUMN` with defaults.

### References
- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#E11 — Story 11.1]
- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-10-07.md]
- [Source: docs/ARCHITECTURE.md §6 Data model, §12 ADR-004]
- [Source: _bmad-output/planning-artifacts/prd.md §5.9, NFR-5 offline/local-first]
- [Source: CLAUDE.md §1, §4, §6, §9]

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (claude-opus-5-5)

### Debug Log References

- RED: `migrations.test.ts` failed on missing `./migrations` module, then on missing `describeMigrationError`, before each implementation.
- First generation of `migration-steps.ts` grabbed the `[` of the `readonly string[]` type annotation instead of the array literal; regenerated from the `= [` literal and verified 12 `CREATE TABLE` statements.
- `App.tsx` was already not Prettier-formatted at baseline (NavigationContainer children indentation); left untouched to avoid unrelated churn. New files are Prettier-clean.

### Completion Notes List

- Implemented pure migrator `runMigrations` (versions must be contiguous from 1; each step + its `PRAGMA user_version` bump in one transaction; typed result, never throws for runtime failures).
- **Deviation (additive):** `MigrationError` has a third kind, `open-failed`, for a DB that cannot be opened / have its version read — needed so AC4 ("never an unhandled exception") also holds for open errors. Shown to users with the same retryable copy as `step-failed`.
- `LATEST_SCHEMA_VERSION` and the wipe list (`ALL_TABLE_NAMES`) live in pure `migration-steps.ts` (derived / testable), rather than in `migrations.ts`; `client.ts` imports both.
- User-facing copy lives in pure `describeMigrationError()` (tested: no SQL/table/column names leak; no retry for `newer-than-app`).
- `App.tsx`: new `db-error` phase; on failure boot stops before notifications/routine read/reschedule; "Try again" bumps a `bootAttempt` counter that re-runs the boot effect.
- Tests: 16 new (12 migrator/steps incl. real-SQL fresh, v0-with-data upgrade preserving rows, rollback, no-op, newer-than-app, open-failed, contiguity, Drizzle column parity, wipe-list coverage; 4 copy). Gates: typecheck ✅ (5 packages), tests ✅ 288 (mobile 158), lint ✅.
- **Pending (Task 6.2):** manual Android upgrade check (previous build with data → this build) — needs a device/emulator; not performed by the agent. Story stays `in-progress` until done.
- Story context created 2026-10-07 — ultimate context engine analysis completed, comprehensive developer guide created.

### File List

- apps/mobile/src/db/migrations.ts (new)
- apps/mobile/src/db/migration-steps.ts (new)
- apps/mobile/src/db/migrations.test.ts (new)
- apps/mobile/src/db/client.ts (modified)
- apps/mobile/src/data/index.ts (modified)
- apps/mobile/App.tsx (modified)
- package.json (modified — engines.node >=22.13)

## Change Log

- 2026-10-07 — Implemented versioned on-device migrations (ADR-004): pure migrator + baseline step, expo-sqlite adapter, boot error screen with retry, 16 tests. Awaiting manual Android upgrade check.
