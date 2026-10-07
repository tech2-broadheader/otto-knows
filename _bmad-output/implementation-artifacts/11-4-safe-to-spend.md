# Story 11.4: Safe-to-spend until payday

Status: drafted — logic tasks ready after 11.3; UI tasks blocked on Claude Design approval

## Story

As someone living payday to payday,
I want Otto to tell me how much I can safely spend until my next salary,
so that I don't run short before bills are due.

## Acceptance Criteria

1. Core computes **safe-to-spend = money on hand − unpaid bills due on/before the next payday (including overdue) − credit-card amount owed**, plus a **per-day** figure = safe-to-spend ÷ max(days until payday, 1), rounded down to whole centavos.
2. The next payday is **derived** from each Income's cadence and automatically rolls forward once a stored `nextPayDate` has passed — no stale dates. The existing payday-vs-bill nudge uses the same function.
3. Shown as the hero number on Finance ("₱3,200 safe to spend until Oct 15 — about ₱400/day") and as one line in the Today briefing.
4. Gentle copy for edge cases: no income set up ("Add your payday to see what's safe to spend"); payday today; negative result ("Bills before payday are ₱X more than what's on hand" — never scolding); custom cadence that has passed ("Update your next payday").
5. All logic is pure in `/packages/core` with boundary tests: month ends, semi-monthly 15th/30th, February (28/29), payday = today, no bills, overdue bills, paid bills ignored, archived wallets ignored.
6. Free tier; computed on device; works offline.

## Tasks / Subtasks

**Design-independent**

- [ ] **Task 1 — Contract** (AC: 1)
  - [ ] 1.1 `packages/schemas/src/finance.ts`: `safeToSpendSchema` `{ status: "ok" | "no-income" | "needs-payday-update", asOf: dateSchema, nextPayday?: dateSchema, daysUntilPayday?: number, onHandMinor, billsBeforePaydayMinor, cardOwedMinor, safeMinor, perDayMinor?, currency }`. Tests.
- [ ] **Task 2 — Payday rollover** (AC: 2, 5)
  - [ ] 2.1 `packages/core/src/payday.ts`: `effectiveNextPayDate(income, asOfDate): string | null`. Rules: weekly +7 days; biweekly +14; monthly → same day next month, clamped to month end; **semi-monthly → the 15th and the 30th (last day of month when shorter)**, the PH standard; custom → never auto-advance (return null when passed → `needs-payday-update`). Returns the earliest date ≥ `asOfDate`. Pure, UTC-safe date math (follow `daysBetween` in `insights.ts`).
  - [ ] 2.2 `nextPayday(incomes, asOfDate)` = min over incomes.
  - [ ] 2.3 Switch `detectPaydayVsBillNudges` (`packages/core/src/insights.ts`) to use `nextPayday` instead of raw `nextPayDate`; keep its existing tests green and add one for a passed `nextPayDate`.
  - [ ] 2.4 Decision: rollover is **computed, not written back** to the DB (no silent write to the user's data — CLAUDE.md §1.11). The stored value only seeds the cadence.
- [ ] **Task 3 — Safe-to-spend** (AC: 1, 4, 5)
  - [ ] 3.1 `packages/core/src/safe-to-spend.ts`: `computeSafeToSpend({ accounts, transactions, bills, incomes, asOfDate })` → `SafeToSpend`, reusing `summarizeWallets` from 11.2/11.3.
  - [ ] 3.2 Bills counted: `!isPaid && dueDate <= nextPayday` (overdue included), using each bill's stored `dueDate`. (`packages/core/src/recurrence.ts` only has `occursOnDate`/`dayOfWeekFor` — rolling recurring bills forward after payment is **out of scope** here; flag it as a follow-up if found missing.)
  - [ ] 3.3 Boundary tests listed in AC5; negative results allowed (no clamping to zero — the UI decides the copy).
- [ ] **Task 4 — Today briefing line** (AC: 3)
  - [ ] 4.1 `apps/mobile/src/hooks/useToday.ts`: compute safe-to-spend and pass a single gentle line into the briefing (as a nudge or briefing field — follow how `detectPaydayVsBillNudges` output feeds `composeBriefing`). Template text only; no LLM.

**UI (after Claude Design approval of `docs/ux-spec.md` §7 screen 1)**

- [ ] **Task 5 — Finance hero** (AC: 3, 4)
  - [ ] 5.1 Safe-to-spend hero on Finance per approved design, with all four edge-case states and accessible label (screen reader reads the full sentence).
- [ ] **Task 6 — Gates** + manual check around a real payday date.

## Dev Notes

- **Depends on 11.2 (balances) and 11.3 (typed transactions).** Can run in parallel with 11.5.
- **Known bug fixed here:** `Income.nextPayDate` is only set at creation (`useFinance.addIncome`, `FinanceScreen` default `todayDate()`) and never advances, so payday logic goes stale after the first payday.
- Money is integer centavos everywhere (`moneySchema`); never use floats for totals; per-day uses integer division.
- Tone rules: heads-ups, never alarms or shame (spec §6.2, ux-spec §5).
- **Out of scope:** savings goals / set-asides (future), notifications for low safe-to-spend.

### References
- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#Story 11.4]
- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-10-07.md §1 evidence (stale nextPayDate), D1 Free]
- [Source: packages/core/src/insights.ts — detectPaydayVsBillNudges] · [Source: CLAUDE.md §1.11, §6]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

- Story drafted 2026-10-08.

### File List
