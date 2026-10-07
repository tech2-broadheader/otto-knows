# Story 13.5: Semi-monthly pay days

Status: review — logic + storage done; the income form asks for the two days when the Money screens are built

## Story

As someone paid twice a month on my own schedule (1st & 15th in the US, 15th & 30th in PH),
I want to tell Otto my two pay days,
so that safe-to-spend and payday heads-ups use my real paydays, wherever I live.

## Acceptance Criteria

1. `incomeSchema.payDays?: [first, second]` (1–31, ascending, different; 31 = end of month), only for semi-monthly income.
2. Payday rollover uses the stored pair; older incomes without it keep the inferred pair (story 11.4 review fix).
3. Stored on device (migration step 7, `income.pay_days` JSON); round-trips through the mappers.
4. The add/edit income form asks "Which two days?" for semi-monthly pay (built with the Money screens).

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (claude-opus-5-5)

### Completion Notes List

- 2026-10-08, tests first (schema, payday, mapper and migration suites seen failing): schema refine (order, range, semi-monthly only); `effectiveNextPayDate` prefers `income.payDays` (US 1st/15th and a 31st clamped to Feb 28 / Apr 30 tested); migration step 7; mappers store JSON.
- Gates: typecheck ✅, tests ✅ 486 (schemas 52, core 136, mobile 187, web 111), lint ✅.
- AC4 lands with the income form on the rebuilt Money screen.

### File List

- packages/schemas/src/finance.ts (+ test); packages/core/src/payday.ts (+ test)
- apps/mobile/src/data/mappers.ts (+ test); apps/mobile/src/db/migration-steps.ts, schema.ts, migrations.test.ts
