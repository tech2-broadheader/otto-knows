# Story 11.2: Wallets / accounts

Status: drafted — logic tasks ready; UI tasks blocked on Claude Design approval

<!-- Definition of Ready (CLAUDE.md §9): design approval required for UI stories. Tasks 1–4 are design-independent and may start once 11.1 is done; Task 5 waits for the approved design. -->

## Story

As someone who keeps money in cash, GCash, Maya, a bank and a credit card,
I want Otto to track each of those wallets and its balance,
so that I always know how much money I actually have and how much I owe on my card.

## Acceptance Criteria

1. User can add, rename and archive wallets of type `cash | ewallet | bank | credit_card`, with an optional provider label (e.g. "GCash", "Maya", "BDO") and an opening balance. For credit cards the opening value is entered as **amount owed**.
2. Balances are **derived** (opening balance + transactions), never stored as a running total (ADR-004). Credit cards display "owed" (a positive number) and spending on the card increases it.
3. A database migration (step 2) creates the `accounts` table, adds `transactions.account_id`, creates a default **"Cash"** wallet with a fixed id, and assigns every existing transaction to it. Every transaction has a wallet from then on.
4. Finance screen shows each active wallet with its balance and a **"Money on hand"** total (cash + e-wallet + bank). Credit-card debt is shown separately as "Owed on cards".
5. Free cap: **3 active wallets** (default Cash counts). The 4th shows the standard upgrade prompt; Pro is unlimited.
6. A wallet can be archived only when its balance is zero; archived wallets disappear from pickers and totals but their history stays. A wallet with transactions cannot be deleted (archive instead).
7. Wallet data is SENSITIVE: opening balance encrypted at rest, every read/write audit-logged.
8. After a data wipe (`wipeAllData`) or on a fresh install, a default Cash wallet exists before the user can add a transaction.

## Tasks / Subtasks

**Design-independent (start after 11.1 is done)**

- [ ] **Task 1 — Contract** (AC: 1, 2, 7)
  - [ ] 1.1 `packages/schemas/src/finance.ts`: add `accountTypeSchema = z.enum(["cash","ewallet","bank","credit_card"])` and `accountSchema` `{ id, userId, name (1–80), type, provider? (max 40), openingBalance: moneySchema, archivedAt?: isoDateTimeSchema, ...timestampFields }`. Opening balance is signed: assets positive; for `credit_card` the UI stores owed as a **negative** amount.
  - [ ] 1.2 Add `transactionSchema.accountId: idSchema` as **optional in this story** (11.3 makes it required alongside `type`). Export types via `z.infer`; re-export from `packages/types`.
  - [ ] 1.3 `packages/schemas/src/consent.ts`: add `"account"` to `SENSITIVE_ENTITIES`.
  - [ ] 1.4 Schema tests: valid/invalid for each type, name bounds, provider bounds.
- [ ] **Task 2 — Migration step 2** (AC: 3, 8)
  - [ ] 2.1 `apps/mobile/src/db/migration-steps.ts`: append step `{ version: 2, name: "accounts" }`:
        `CREATE TABLE accounts (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, name TEXT NOT NULL, type TEXT NOT NULL, provider TEXT, opening_balance_minor TEXT, opening_balance_currency TEXT NOT NULL DEFAULT 'PHP', archived_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`;
        `ALTER TABLE transactions ADD COLUMN account_id TEXT`;
        `INSERT INTO accounts (...) VALUES ('<DEFAULT_CASH_ACCOUNT_ID>', '<LOCAL_USER_ID>', 'Cash', 'cash', NULL, NULL, 'PHP', NULL, <now>, <now>)` — `opening_balance_minor` NULL means 0 (SQL cannot encrypt);
        `UPDATE transactions SET account_id = '<DEFAULT_CASH_ACCOUNT_ID>' WHERE account_id IS NULL`.
        Use `strftime('%Y-%m-%dT%H:%M:%S+00:00','now')` for timestamps (must satisfy `isoDateTimeSchema` with offset).
  - [ ] 2.2 Add `DEFAULT_CASH_ACCOUNT_ID = "00000000-0000-4000-8000-0000000000ca"` to `apps/mobile/src/lib/constants.ts` (valid v4 UUID, same pattern as `LOCAL_USER_ID`). Inline its literal value into the SQL — a shipped step must not change if the constant ever does.
  - [ ] 2.3 Add `"accounts"` to `ALL_TABLE_NAMES`; add `accounts` table + `accountId` column to `apps/mobile/src/db/schema.ts` (Drizzle parity test from 11.1 will enforce the match).
  - [ ] 2.4 Migration tests (extend `migrations.test.ts`): v1 DB with transactions → v2: Cash exists, every transaction has `account_id = DEFAULT_CASH_ACCOUNT_ID`, other columns byte-identical; fresh install → v2 with exactly one Cash.
- [ ] **Task 3 — Repository + default wallet** (AC: 6, 7, 8)
  - [ ] 3.1 `apps/mobile/src/data/mappers.ts`: `accountToRow` / `accountFromRow` (NULL opening balance → `{ amountMinor: 0, currency: "PHP" }`), with tests in `mappers.test.ts`.
  - [ ] 3.2 `apps/mobile/src/data/repositories.ts`: `makeAccountRepository(deps)` following the exact pattern of `makeTransactionRepository` (encrypt `opening_balance_minor`, `audit(..., "read" | "write" | "delete")`, Zod-validate at the boundary). `delete` refuses when any transaction references the account (typed error, not a throw-and-forget).
  - [ ] 3.3 `ensureDefaultAccount(deps)`: idempotent; if the local user has no account, insert Cash with `DEFAULT_CASH_ACCOUNT_ID`. Call it in `App.tsx` boot right after a successful migration (covers wipe + fresh install).
  - [ ] 3.4 `transactionToRow`/`transactionFromRow` carry `accountId`; existing callers (`useFinance.addTransaction`, `transactionFromExpenseDraft`) pass `DEFAULT_CASH_ACCOUNT_ID` until 11.3 adds the picker.
- [ ] **Task 4 — Balances (pure core)** (AC: 2, 4)
  - [ ] 4.1 `packages/core/src/accounts.ts`: `computeAccountBalances(accounts, transactions)` → per account `{ accountId, balanceMinor }` (signed) and `summarizeWallets(...)` → `{ onHandMinor, cardOwedMinor, perAccount[] }`. Until 11.3, every transaction is an expense: `balance = opening − Σ expenses`. Write it so 11.3 only adds the income/transfer branches.
  - [ ] 4.2 Exclude archived accounts from totals; transactions pointing at an unknown account are reported (not silently dropped) via an `orphanTransactionIds` field.
  - [ ] 4.3 Tests: cash/ewallet/bank math, card owed sign, archived exclusion, empty lists, large values (no float — integers only).
  - [ ] 4.4 `apps/mobile/src/lib/caps.ts`: add `wallets: 3` to `FREE_CAPS` + label; tests in `caps.test.ts`.

**UI (after Claude Design approval of `docs/ux-spec.md` §7 screens 1 & 3)**

- [ ] **Task 5 — Screens** (AC: 1, 4, 5, 6)
  - [ ] 5.1 `useAccounts` hook (load/add/rename/archive, cap check), modeled on `useFinance`.
  - [ ] 5.2 Finance home: wallets strip + "Money on hand" + "Owed on cards", per the approved design.
  - [ ] 5.3 Wallets screen (list/add/edit/archive) per the approved design; credit card form label reads "Amount owed".
  - [ ] 5.4 Loading / error / empty / at-cap states; accessibility labels on every control.
- [ ] **Task 6 — Gates**: `pnpm typecheck && pnpm test && pnpm lint`; manual Android check that an upgraded install shows old expenses under Cash with a correct balance.

## Dev Notes

- **Depends on 11.1** (migration framework). Never edit step 1; this story adds step 2.
- **Naming:** code says `account` (matches ARCHITECTURE §5 entity `Account`); UI copy says "wallet".
- **Why derived balances:** editing/deleting a transaction would otherwise need compensating writes; recompute is cheap at personal-finance volumes (ADR-004).
- **Sensitive pattern to copy:** `makeTransactionRepository` in `apps/mobile/src/data/repositories.ts` (encrypt amount via `deps.encryption.encrypt(String(amountMinor))`, decrypt on read, audit every access). Do not invent a new crypto path.
- **Default Cash id is fixed** so the SQL migration and the TS `ensureDefaultAccount` agree without generating UUIDs in SQL.
- **Files:** schemas `finance.ts`, `consent.ts`; mobile `db/migration-steps.ts`, `db/schema.ts`, `data/mappers.ts`, `data/repositories.ts`, `lib/constants.ts`, `lib/caps.ts`, `App.tsx`, new `hooks/useAccounts.ts`, `screens/FinanceScreen.tsx` (+ new wallets screen); core new `accounts.ts` (export from `index.ts`).
- **Out of scope:** income/transfer types and the wallet picker on transactions (11.3), safe-to-spend (11.4).

### References
- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#Story 11.2]
- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-10-07.md — decisions D2 (Cash default), D3 (cards as debt)]
- [Source: docs/ARCHITECTURE.md §5, §6, ADR-004] · [Source: docs/ux-spec.md §7] · [Source: CLAUDE.md §4, §6, §9]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

- Story drafted 2026-10-08 with design-independent / UI task split.

### File List
