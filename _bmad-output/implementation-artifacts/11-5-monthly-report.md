# Story 11.5: Monthly report

Status: review — logic + UI done; manual check (Task 4) pending

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

- [x] **Task 1 — Contract** (AC: 1, 2)
  - [x] 1.1 `packages/schemas/src/finance.ts`: `monthlyReportSchema` `{ month: "YYYY-MM", currency, incomeMinor, spendingMinor, netMinor, categories: [{ categoryId: id | null, name, spentMinor, previousMinor, changeMinor, changePct: number | null }], previous: { incomeMinor, spendingMinor } | null }`. Tests.
- [x] **Task 2 — Core** (AC: 1–3)
  - [x] 2.1 `packages/core/src/monthly-report.ts`: `computeMonthlyReport(categories, transactions, month)`. Reuse the month-matching rule from `budget.ts` (`isInMonth` — extract to a shared helper rather than copy).
  - [x] 2.2 `previousMonth("2026-01") === "2025-12"` helper with tests.
  - [x] 2.3 Tests: transfers ignored; income totals; uncategorized bucket; category present this month but not last (changePct null); deleted category ids fall into "Uncategorized"; first-ever month (`previous: null`); sort order stable on ties (by name).

**UI (after Claude Design approval of `docs/ux-spec.md` §7 screen 4)**

- [x] **Task 3 — Report screen** (AC: 1, 2, 4)
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

Claude Opus 5.5 (claude-opus-5-5)

### Debug Log References

### Completion Notes List

- UI built 2026-10-08 from the approved design (canvas "Otto — Budgeting+ & Daily Tasks screens"), on the user's currency/locale (story 13.1). Pure form validation in `apps/mobile/src/lib/forms.ts` (14 tests); screens are not unit-tested (project convention) — verified by typecheck, lint and a full Android Metro/Hermes bundle (`expo export`). **Manual on-device check still pending.**
- `MonthlyReportScreen` (month switcher capped at the current month, locale month names, category bars, change text).

- Story drafted 2026-10-08.
- Tasks 1–2 implemented 2026-10-08 (tests first, seen failing):
  - `monthlyReportSchema` + `categoryReportLineSchema` (+ types).
  - `packages/core/src/month.ts`: `isInMonth` extracted from `budget.ts` (budget now imports it — one rule for both) and `previousMonth`.
  - `packages/core/src/monthly-report.ts`: `computeMonthlyReport` — income / spending (expenses only) / net; categories incl. Uncategorized (deleted categories fold into it); categories that only had spending last month still listed; `changePct` one decimal, null when last month was 0; `previous: null` when last month had no activity; ties sorted by name.
  - A regex escaping slip in the schema (lost backslashes) was caught by the schema test and fixed.
  - Gates: typecheck ✅, tests ✅ 363 (schemas 32, core 113, mobile 169, web 49), lint ✅.

### File List

- packages/schemas/src/finance.ts, finance.test.ts; packages/types/src/index.ts
- packages/core/src/month.ts (new), monthly-report.ts (new), monthly-report.test.ts (new), budget.ts, index.ts
