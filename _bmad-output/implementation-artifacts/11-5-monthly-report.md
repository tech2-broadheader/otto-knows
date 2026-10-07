# Story 11.5: Monthly report

Status: drafted — logic tasks ready after 11.3; UI tasks blocked on Claude Design approval

## Story

As someone trying to understand my spending,
I want a monthly report of income, spending by category, and how it compares to last month,
so that I can see where my money went and whether I'm improving.

## Acceptance Criteria

1. For a selected month: total income, total spending, net (income − spending); spending by category including "Uncategorized", sorted by amount descending.
2. Comparison with the previous month, per category and in total: amount change and % change. When last month has no data for a category (or at all), show "new" / "no comparison yet" instead of a percentage (never divide by zero).
3. Transfers excluded; credit-card purchases count as spending in the month they are made; card payments (transfers) do not.
4. Month switcher (previous / next, no future months); computed on device; works offline.
5. Free tier.

## Tasks / Subtasks

**Design-independent**

- [ ] **Task 1 — Contract** (AC: 1, 2)
  - [ ] 1.1 `packages/schemas/src/finance.ts`: `monthlyReportSchema` `{ month: "YYYY-MM", currency, incomeMinor, spendingMinor, netMinor, categories: [{ categoryId: id | null, name, spentMinor, previousMinor, changeMinor, changePct: number | null }], previous: { incomeMinor, spendingMinor } | null }`. Tests.
- [ ] **Task 2 — Core** (AC: 1–3)
  - [ ] 2.1 `packages/core/src/monthly-report.ts`: `computeMonthlyReport(categories, transactions, month)`. Reuse the month-matching rule from `budget.ts` (`isInMonth` — extract to a shared helper rather than copy).
  - [ ] 2.2 `previousMonth("2026-01") === "2025-12"` helper with tests.
  - [ ] 2.3 Tests: transfers ignored; income totals; uncategorized bucket; category present this month but not last (changePct null); deleted category ids fall into "Uncategorized"; first-ever month (`previous: null`); sort order stable on ties (by name).

**UI (after Claude Design approval of `docs/ux-spec.md` §7 screen 4)**

- [ ] **Task 3 — Report screen** (AC: 1, 2, 4)
  - [ ] 3.1 New `MonthlyReportScreen` reachable from Finance per approved design: month switcher, summary (income / spending / net), category bars with change vs last month.
  - [ ] 3.2 Empty month state; loading/error states; accessible values (screen reader reads amounts and change in words).
  - [ ] 3.3 Register the route on the root stack in `apps/mobile/App.tsx` (like `Tips` / `Optimizer`).
- [ ] **Task 4 — Gates** + manual check: report totals reconcile with the transaction list for a month containing a transfer and a card payment.

## Dev Notes

- **Depends on 11.3** (typed transactions). Can run in parallel with 11.4.
- Integer centavos only; `changePct` rounded to one decimal for display, computed from integers.
- Decrypting a month of transactions happens in the existing repository `list` (audit-logged); filter in memory — volumes are small (ADR-004 consequence). If it becomes slow, paginate by month later; do not optimize prematurely.
- **Out of scope:** export to CSV/PDF (E10 10.2), charts beyond category bars, custom date ranges.

### References
- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#Story 11.5]
- [Source: packages/core/src/budget.ts — computeBudgetSummary / isInMonth] · [Source: docs/ux-spec.md §7] · [Source: CLAUDE.md §6]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

- Story drafted 2026-10-08.

### File List
