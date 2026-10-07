# Story 11.3: Income & transfer transactions

Status: in-progress — Tasks 1–5 (logic) done; Tasks 6–7 (UI, manual check) blocked on Claude Design approval

## Story

As someone whose money comes in (salary, side income) and moves around (bank → GCash, paying my credit card),
I want to record income and transfers, not just expenses, and fix mistakes,
so that my wallet balances match reality and transfers are never counted as spending.

## Acceptance Criteria

1. A transaction has `type: expense | income | transfer`. Expense and income require `accountId`; transfer requires `accountId` (from) and `toAccountId` (to), which must differ. Category applies to expenses only.
2. The add-transaction form has a type picker (Expense / Income / Transfer); transfer shows From and To wallets. **Paying a credit card = transfer from a wallet to the card** (reduces owed).
3. Transactions can be edited and deleted; balances update accordingly.
4. Transfers are excluded from spending totals, budgets (`computeBudgetSummary`), the overspend forecast (`detectOverspendNudges`) and anything sent to finance tips. Income is excluded from spending too.
5. Quick-add `log_expense` proposals resolve to a wallet (last-used wallet, else Cash) and the proposal card lets the user change it before confirming — propose-and-confirm preserved.
6. Existing rows load as `type = expense` (migration default); invalid shapes are rejected at the schema boundary.

## Tasks / Subtasks

**Design-independent**

- [x] **Task 1 — Contract** (AC: 1, 6)
  - [x] 1.1 `packages/schemas/src/finance.ts`: `transactionTypeSchema = z.enum(["expense","income","transfer"])`; `transactionSchema` gains `type` (required), `accountId` (now **required**), `toAccountId?`. Add `.superRefine`: transfer ⇒ `toAccountId` present and ≠ `accountId`; non-transfer ⇒ no `toAccountId`; `categoryId` only on expense. Amount is always positive (`amountMinor > 0`); direction comes from `type`.
  - [x] 1.2 `packages/schemas/src/proposals.ts`: `expenseDraftSchema.accountId?: idSchema` (LLM may omit it).
  - [x] 1.3 Schema tests for every refinement branch.
- [x] **Task 2 — Migration step 3** (AC: 6)
  - [x] 2.1 Append `{ version: 3, name: "transaction-types" }`: `ALTER TABLE transactions ADD COLUMN type TEXT NOT NULL DEFAULT 'expense'`; `ALTER TABLE transactions ADD COLUMN to_account_id TEXT`. Update Drizzle `schema.ts`.
  - [x] 2.2 Migration test: v2 → v3 keeps rows, all existing rows read back as `expense`.
- [x] **Task 3 — Data layer** (AC: 3)
  - [x] 3.1 Mappers carry `type` / `toAccountId`; repository `update` and `delete` already exist — verify they are wired and audit-logged.
  - [x] 3.2 Remove the interim `DEFAULT_CASH_ACCOUNT_ID` fallback in `useFinance.addTransaction` (11.2 Task 3.4) — callers now pass the chosen wallet.
- [x] **Task 4 — Core math** (AC: 4)
  - [x] 4.1 `packages/core/src/accounts.ts`: balances handle income (+ to account), expense (− from account), transfer (− from, + to). Credit card: an expense on the card makes its signed balance more negative (more owed); a transfer into the card reduces owed.
  - [x] 4.2 `packages/core/src/budget.ts` `computeBudgetSummary` and `forecasts.ts` `detectOverspendNudges`: consider **expenses only**. Add regression tests proving transfers/income don't count.
  - [x] 4.3 Tests: transfer between two wallets keeps total on-hand unchanged; card payment reduces owed and on-hand equally; edit/delete recomputes.
- [x] **Task 5 — Quick-add** (AC: 5)
  - [x] 5.1 `apps/mobile/src/lib/proposal-mappers.ts` `transactionFromExpenseDraft`: set `type: "expense"`, `accountId: draft.accountId ?? ctx.defaultAccountId` where `defaultAccountId` = last-used wallet else Cash (add to `ApplyContext`).
  - [x] 5.2 Tests in `proposal-mappers.test.ts` for both branches. Server tool schema (`apps/web/src/server/llm/tools.ts` `log_expense`) unchanged unless a wallet-name hint is trivially supported — do **not** let the LLM invent wallet ids.

**UI (after Claude Design approval of `docs/ux-spec.md` §7 screen 2)**

- [ ] **Task 6 — Screens** (AC: 2, 3, 5)
  - [ ] 6.1 Add/edit transaction screen per approved design: type segmented control, wallet picker(s), amount, category (expense only), note, date.
  - [ ] 6.2 Transaction list: tap to edit, delete with confirm; income/transfer visually distinct per design.
  - [ ] 6.3 `ProposalCard` for `log_expense`: show the wallet and allow changing it before Accept.
- [ ] **Task 7 — Gates** + manual check: card payment and bank→GCash transfer produce correct balances; budget ring unaffected by transfers.

## Dev Notes

- **Depends on 11.2.** Step numbering continues (step 3); never edit steps 1–2.
- SQLite `ADD COLUMN ... NOT NULL` requires a `DEFAULT` — hence `DEFAULT 'expense'`.
- Sign convention: stored `amountMinor` is always positive; `type` decides direction. Keeps encrypted values simple and the budget math unambiguous.
- Consumers that must ignore non-expenses: `computeBudgetSummary` (useFinance, forecasts), `detectOverspendNudges`, anything building finance context for the LLM (`packages/core/src/llm-context.ts` currently sends income + bills only — keep transfers out if transactions are ever added).
- **Out of scope:** recurring income auto-logging, splitting a transaction across categories.

### References
- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#Story 11.3]
- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-10-07.md — D3 cards as debt]
- [Source: docs/ARCHITECTURE.md ADR-004] · [Source: CLAUDE.md §1.11 propose-and-confirm, §6]

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (claude-opus-5-5)

### Debug Log References

### Completion Notes List

- Story drafted 2026-10-08.
- Tasks 1–5 implemented 2026-10-08:
  - `transactionTypeSchema`; `transactionSchema` now requires `type` + `accountId`, optional `toAccountId`; superRefine enforces transfer rules and expense-only categories; amount must be > 0. `expenseDraftSchema.accountId` optional.
  - Migration step 3 (`type NOT NULL DEFAULT 'expense'`, `to_account_id`); Drizzle schema updated (parity test green).
  - Mappers carry `type`/`toAccountId`; a stored row with NULL `account_id` throws a clear error instead of inventing a wallet.
  - `summarizeWallets` handles income/transfer (transfers to unknown wallets reported as orphans, never half-applied); `computeBudgetSummary` counts expenses only (so overspend forecast does too).
  - `pickDefaultAccountId` (last-used active wallet → Cash → first active). Quick-add: `applyProposal` keeps the LLM's wallet only if it is one of the user's active wallets, else uses the default — the LLM can never inject an arbitrary wallet id.
  - `useFinance`: exposes `accounts` + `wallets` summary; `addTransaction` takes optional type/wallet(s) (defaults keep the current screen working); new `updateTransaction` / `deleteTransaction`.
  - Existing core test fixtures updated with `type`/`accountId` (stricter contract).
  - TDD note: the mapper transfer/no-wallet tests were written in the same step as the mapper change rather than run red first.
  - Gates: typecheck ✅, tests ✅ 333 (schemas 29, core 86, mobile 169, web 49), lint ✅.

### File List

- packages/schemas/src/finance.ts, finance.test.ts, proposals.ts; packages/types/src/index.ts
- packages/core/src/accounts.ts, accounts.test.ts, budget.ts, expense-only.test.ts (new), helpers.test.ts, phase2.test.ts
- apps/mobile/src/db/migration-steps.ts, schema.ts, migrations.test.ts
- apps/mobile/src/data/mappers.ts, mappers.test.ts
- apps/mobile/src/lib/proposal-mappers.ts, proposal-mappers.test.ts, apply-proposal.ts
- apps/mobile/src/hooks/useFinance.ts
