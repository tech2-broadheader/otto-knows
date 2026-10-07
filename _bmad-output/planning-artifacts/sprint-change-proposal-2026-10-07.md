# Sprint Change Proposal — Budgeting+ (Epic 11)

| | |
|--|--|
| Date | 2026-10-07 |
| Trigger | Product-owner direction: focus the product on budgeting |
| Change type | New requirement from stakeholder (additive) |
| Scope classification | **Moderate** — new epic + backlog reorganization; no rollback, no MVP reduction |
| Review mode | Batch |
| Status | **Approved** by product owner 2026-10-07 — edits applied to PRD, epics, ARCHITECTURE (ADR-004), UX spec, sprint-status |

---

## 1. Issue summary

The product owner has set budgeting as the product's primary focus (alongside small daily tasks, handled separately). Today's finance features (FR-C2, Story 3.2) record **spending only**: there is no notion of *where* money sits (wallets/accounts), no record of money coming in or moving between wallets, no "how much can I spend" answer, and no month-over-month view. Users therefore can log expenses but cannot see their actual money position.

**Evidence from the codebase (2026-10-07 review):**
- `transactionSchema` (`packages/schemas/src/finance.ts`) has no type and no account — every entry is implicitly an expense.
- No account/wallet entity exists anywhere in schemas, SQLite, or UI.
- `Income.nextPayDate` is never advanced after payday (only set on create) — any payday-based logic (existing payday-vs-bill nudge, proposed safe-to-spend) goes stale after the first payday.
- The mobile SQLite store uses `CREATE TABLE IF NOT EXISTS` at boot with **no migration mechanism** (`apps/mobile/src/db/client.ts`), so existing tables cannot gain columns safely on installed devices.

Decisions taken with the product owner (2026-10-07):
- D1 Safe-to-spend and monthly report are **Free** (pure on-device math, no LLM cost; safe-to-spend is the daily-habit hook).
- D2 Existing transactions are migrated into an **auto-created "Cash" wallet**; every transaction has a wallet from then on.
- D3 Credit cards are tracked as **debt** (amount owed); paying a card from another wallet is a transfer.
- Medications / health / optimizer / caregiver are **kept as-is** (not dropped, not reprioritized here).

## 2. Impact analysis

### Epic impact
| Epic | Impact |
|------|--------|
| E1 Foundation | Indirect — new local-DB migration mechanism (enabler story 11.1). Consent/audit/encryption patterns reused unchanged. |
| E3 Connectors & context graph | Story 3.2 (done) is **extended, not reopened**: its entities gain fields via E11. |
| E5 The brain | `log_expense` proposal must resolve to a wallet (defaults to Cash/last-used). Small follow-on change inside 11.3. |
| E6 Tips / E7 Forecasts | Overspend forecast and finance tips should ignore transfers. Covered in 11.3 AC. Payday-vs-bill nudge benefits from payday rollover (11.4). |
| E9 Monetization | New free cap for wallets (proposed: 3 free, unlimited Pro). Needs OD-5 confirmation but not blocking. |
| E10 Continuity | Export (10.2) later includes wallets + typed transactions. No change now. |
| **E11 Budgeting+** | **New epic** (below). |

Priority: E11 becomes the **next epic to build**, ahead of remaining E5/E6 work. Remaining E1.4 (GATE-3) still applies — E11 stores more finance data.

### Artifact conflicts
- **PRD** — FR-C2 extend; add FR-F1…FR-F4; FR-M1 add wallet cap; §8 add E11. No goal conflicts (strengthens G3, G6).
- **Architecture** — §5 finance domain gains `Account`; §6 add migration note; new **ADR-004** (derived balances + versioned local migrations).
- **UX spec** — Finance screen restructure (wallets strip, safe-to-spend hero, transaction type picker, report view). Requires a **Claude Design pass** before UI stories go ready-for-dev (CLAUDE.md §5).
- **Sprint status** — add epic-11 + stories.
- Other (CI, deploy, infra) — none.

### Technical impact
- Schema: new `accountSchema`; `transactionSchema` gains `type`, `accountId`, `toAccountId`.
- Mobile DB: new `accounts` table; `transactions` table gains columns → needs migration infra first.
- Core: new pure functions `computeAccountBalances`, `computeSafeToSpend`, `advancePayDate`, `computeMonthlyReport` (all unit-tested).
- Web/LLM: `expenseDraftSchema` gains optional `accountId`; proxy tools unchanged otherwise. Server sync currently does not carry transactions — no server migration needed now.
- Security: `Account` is SENSITIVE (balances encrypted at rest, access audit-logged), same pattern as existing finance repos.

## 3. Recommended approach

**Option 1 — Direct adjustment (selected).** Add a new epic E11 with 5 stories; extend existing contracts backward-compatibly. Effort: **Medium**. Risk: **Low–Medium** (main risk is the on-device data migration — mitigated by story 11.1 shipping first with tests on a pre-change database).

- Option 2 (rollback) — not viable/needed; nothing built conflicts.
- Option 3 (MVP reduction) — not needed; this is additive. Other phases are paused by priority, not cut.

**Sequencing:** 11.1 → 11.2 → 11.3 → (11.4 ∥ 11.5). UX/Claude Design pass for 11.2–11.5 screens runs in parallel with 11.1 (no UI in 11.1).

## 4. Detailed change proposals

### 4.1 Epics & stories — ADD Epic 11

```
## E11 — Budgeting+ (Free core)
Goal: know where your money is, what came in, and how much you can safely spend until payday.

### Story 11.1 — Versioned local DB migrations (enabler)
- AC1 The mobile store tracks a schema version (SQLite `PRAGMA user_version`) and applies
      ordered, idempotent migration steps at boot; fresh installs and upgraded installs end
      at the same schema.
- AC2 A failed migration is rolled back in a transaction and surfaced as a typed error
      screen — never a half-migrated database or silent data loss.
- AC3 Tests: fresh install → latest; v0 (current shipped schema with data) → latest with
      data preserved; failure path rolls back.
- Contract: none (infrastructure). Never edit a shipped migration step.

### Story 11.2 — Wallets / accounts
- AC1 User can add, rename, archive wallets of type cash | ewallet | bank | credit_card,
      with an optional provider label (e.g. GCash, Maya, BDO) and an opening balance.
- AC2 Balances are DERIVED (opening balance + transactions), never stored as a mutable
      total. Credit cards show "amount owed" (spending increases it, payments reduce it).
- AC3 Migration creates a default "Cash" wallet and assigns all existing transactions to it.
- AC4 Finance screen shows each wallet's balance and a total "money on hand"
      (cash + ewallet + bank; credit card owed shown separately).
- AC5 Free cap: 3 wallets (Pro unlimited) with the standard upgrade prompt.
- AC6 Wallet data is SENSITIVE: amounts encrypted at rest, access audit-logged.
- Contract: accountSchema (new). Depends on 11.1. Design: Claude Design pass required.

### Story 11.3 — Income & transfer transactions
- AC1 A transaction has type expense | income | transfer. Expense/income require accountId;
      transfer requires accountId (from) and toAccountId (to), which must differ.
- AC2 Add-transaction form has a type picker; transfer shows from/to wallets. Paying a
      credit card = transfer from a wallet to the card.
- AC3 Edit and delete transactions; balances update accordingly.
- AC4 Transfers are excluded from spending totals, budgets, overspend forecasts and tips.
- AC5 Quick-add `log_expense` proposals resolve to a wallet (last-used, else Cash) and the
      user can change it before confirming (propose-and-confirm preserved).
- AC6 Existing data loads as type=expense (backward compatible); invalid shapes rejected
      at the schema boundary.
- Contract: transactionSchema (extended), expenseDraftSchema (optional accountId).
- Depends on 11.2.

### Story 11.4 — Safe-to-spend until payday
- AC1 Core computes: money on hand − unpaid bills due on/before next payday − credit card
      amount owed = safe-to-spend; plus a per-day figure (÷ days until payday, min 1).
- AC2 Next payday is derived from each Income's cadence and advances automatically once
      passed (fixes stale nextPayDate; payday-vs-bill nudge uses the same function).
- AC3 Shown as the hero number on Finance and as a line in the Today briefing
      ("₱3,200 safe to spend until the 15th — about ₱400/day").
- AC4 Edge cases handled with gentle copy: no income set up, payday today, negative result
      ("Bills before payday exceed what's on hand by ₱X" — never scolding).
- AC5 Pure functions in /packages/core with boundary tests (month ends, semi-monthly 15/30,
      Feb, payday = today, no bills, overdue bills).
- Contract: SafeToSpend result schema (new, in schemas). Free tier. Depends on 11.2, 11.3.

### Story 11.5 — Monthly report
- AC1 For a selected month: total income, total spending, net; spending by category
      (incl. uncategorized), sorted by amount.
- AC2 Comparison to previous month per category and in total (amount + % change),
      with "no data" handling for the first month.
- AC3 Transfers excluded; credit-card purchases count as spending when made.
- AC4 Month switcher (previous/next); works offline; computed on device.
- Contract: MonthlyReport result schema (new). Free tier. Depends on 11.3.
```

### 4.2 PRD (`prd.md`)

**§5.2 FR-C2** — OLD:
> Manual finance entry: salary/income, recurring bills, spending; basic monthly budget. [Free]

NEW:
> Manual finance entry: salary/income schedule, recurring bills, transactions (expense / income / transfer) across wallets; basic monthly budget. [Free]

**ADD §5.9 Budgeting+**
> - **FR-F1** Wallets/accounts (cash, e-wallet, bank, credit card) with derived balances; credit cards tracked as amount owed. [Free, capped]
> - **FR-F2** Income and transfer transactions; transfers never count as spending. [Free]
> - **FR-F3** Safe-to-spend until next payday, after upcoming bills and card debt, with a per-day figure. [Free]
> - **FR-F4** Monthly report: income vs spending, by category, vs previous month. [Free]

**§5.7 FR-M1** — append "~3 wallets" to free caps.

**§8** — add: *E11 Budgeting+ (wallets, typed transactions, safe-to-spend, monthly report) — current priority.*

**§9** — add: *E11 is prioritized next (product-owner direction 2026-10-07) ahead of remaining E5/E6 work.*

### 4.3 Architecture (`docs/ARCHITECTURE.md`)

- **§5** finance row → key entities: `Account, Transaction (expense|income|transfer), BudgetCategory, Income`.
- **§6** append: *Local schema evolves via versioned migrations (`PRAGMA user_version`, ordered steps, transactional). Never edit a shipped step.*
- **§12** add **ADR-004 — Derived balances + versioned local migrations** (Accepted, 2026-10-07):
  - Context: wallets need balances; on-device schema must evolve on installed apps.
  - Decision: balances are computed from opening balance + transactions (no stored running total); mobile SQLite moves from create-if-not-exists to versioned migrations.
  - Consequences: no balance drift or double-counting on edit/delete; small compute cost (decrypt + sum on device, fine at personal-finance volumes); every future schema change ships as a new migration step.

### 4.4 UX spec (`docs/ux-spec.md`)

- **§3 Finance** row → purpose: *Wallets, safe-to-spend, transactions (expense/income/transfer), bills, budget, monthly report.* States add: *no wallets (first run → Cash created), negative safe-to-spend, no income set up.*
- **ADD §7 Budgeting+ screens (for Claude Design pass)**:
  1. Finance home: safe-to-spend hero (+ per-day), wallets strip with balances, budget ring, recent transactions.
  2. Add transaction: type segmented control (Expense / Income / Transfer), wallet picker(s), amount, category (expense only), note, date.
  3. Wallets: list, add/edit (type, provider, opening balance), archive; credit card shows "owed".
  4. Monthly report: month switcher, income/spend/net summary, category bars with vs-last-month change.
  - Design gate: approved Claude Design output required before 11.2–11.5 UI implementation.

### 4.5 Sprint status (`sprint-status.yaml`)

```yaml
  # --- Budgeting+ (product-owner priority 2026-10-07) ---
  epic-11: backlog
  11-1-versioned-local-migrations: backlog
  11-2-wallets-accounts: backlog          # needs Claude Design pass
  11-3-income-transfer-transactions: backlog  # needs Claude Design pass
  11-4-safe-to-spend: backlog             # needs Claude Design pass
  11-5-monthly-report: backlog            # needs Claude Design pass
  epic-11-retrospective: optional
```

## 5. Implementation handoff

| Role | Responsibility |
|------|----------------|
| PM | Apply PRD edits (4.2). Confirm wallet free cap under OD-5. |
| Architect | Apply ARCHITECTURE edits + ADR-004 (4.3); confirm Definition of Ready per story. |
| UX Designer + Claude Design | Apply UX spec addendum (4.4); run the design pass for the 4 new/changed screens. **Note:** the `claude-design` MCP connection is currently failing (auth 403) — run `/design-login` before the pass. |
| SM | Add E11 to `epics-and-stories.md` (4.1) and `sprint-status.yaml` (4.5); create story files starting with 11.1. |
| Dev | Implement 11.1 first (no UI, can start once story file exists), then 11.2–11.5 after design approval. TDD per AC; quality gates (tests + build + type-check). |

**Success criteria**
- An upgraded install keeps all existing transactions, now in a Cash wallet, with correct balances.
- User can see money on hand per wallet, record income/transfers, and get a correct safe-to-spend that stays correct across paydays.
- Monthly report totals reconcile with the transaction list (transfers excluded).
- All quality gates green; finance data stays encrypted at rest and audit-logged.
