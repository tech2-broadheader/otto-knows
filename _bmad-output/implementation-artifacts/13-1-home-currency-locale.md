# Story 13.1: Home currency & locale foundation

Status: review — logic + storage done; screens adopt it as they are built

## Story

As someone outside the Philippines,
I want Otto to show and accept money, dates and times the way my country does,
so that amounts like $1,234.50, 1.234,50 € or ₫25.000 look right and the app feels local.

## Acceptance Criteria

1. `currencySchema` = supported ISO 4217 set (PHP, SGD, MYR, IDR, THB, VND, USD, CAD, GBP, EUR, CHF, SEK, NOK, DKK, PLN, CZK) with a minor-unit exponent per currency (VND 0, others 2). Existing data (PHP) stays valid; the schema default stays PHP so old rows parse unchanged.
2. `userSettingsSchema` { currency, locale (BCP 47), timezone (IANA) } stored on device (migration step 6). Existing installs that already hold money data get PHP / en-PH / Asia/Manila; fresh installs get defaults suggested from the device's locale and timezone.
3. One formatter API in `/packages/core`: `formatMoney(money, locale)`, `formatShortDate(date, locale)`; one parser in the mobile app: `parseMoneyInput(text, currency, locale)` honouring the locale's decimal/grouping separators and the currency's decimal places. Built on `Intl` — no new dependency.
4. Core copy that shows money or dates (payday-vs-bill and safe-to-spend nudges) formats with the user's locale; no `₱` or `en-PH` literal remains in shared code.
5. Tests: PHP/en-PH, USD/en-US, EUR/de-DE (comma decimals), GBP/en-GB, VND/vi-VN (0 decimals), IDR/id-ID; parsing rejects too many decimals and junk.

## Tasks / Subtasks

- [x] Task 1 — Contract: supported currencies + minor units; `userSettingsSchema`; tests.
- [x] Task 2 — Core: `formatMoney`, locale-aware `formatShortDate`, `suggestSettings(locale, timeZone)`; nudges take a locale; tests.
- [x] Task 3 — Mobile: `parseMoneyInput`; `formatPeso` callers keep working via the new formatter; tests.
- [x] Task 4 — Storage: migration step 6 `user_settings`; repository + `ensureSettings` (device defaults); `useSettings` hook; hooks pass the locale into core.
- [x] Task 5 — Gates.

## Dev Notes

- ADR-007. Money remains integer minor units of the user's home currency; no conversion anywhere.
- Hermes (React Native) supports `Intl.NumberFormat` currency style and `Intl.DateTimeFormat` on Android via the platform ICU; device defaults read `Intl.DateTimeFormat().resolvedOptions()` (locale, timeZone) — no `expo-localization` dependency.

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (claude-opus-5-5)

### Completion Notes List

- Implemented 2026-10-08, tests first for every task (schema, formatter, parser, migration and device-locale suites each seen failing).
- `SUPPORTED_CURRENCIES` (16, with minor units; VND 0), `currencyMinorUnits`, `DEFAULT_CURRENCY` (the pre-multi-currency PHP default, named instead of scattered literals); `userSettingsSchema` (BCP 47 locale, IANA timezone). SafeToSpend / MonthlyReport / budget / wallet summaries now carry a typed `CurrencyCode`.
- Core `formatMoney(money, locale)`, locale-aware `formatShortDate(date, locale)` (UTC-anchored so the device timezone can't shift the day), `suggestSettings(locale, tz)` (region → currency, euro area → EUR, unsupported → USD). The old `formatPeso` in core is gone; both nudges now take the user's locale — new test proves US copy ("$120.50 … Jun 18").
- Mobile `parseMoneyInput(text, currency, locale)`: locale separators from `Intl.formatToParts`, strips the currency's symbol/code and spaces, rejects junk, negatives and extra decimals.
- Migration step 6 `user_settings`; installs with money data keep PHP / en-PH / Asia/Manila; fresh installs get the device suggestion on first boot (`settingsRepository.ensure`). `SettingsProvider` / `useSettings()`; the Today hook passes the locale into core.
- `readDeviceLocale()` uses `Intl.DateTimeFormat().resolvedOptions()` (no expo-localization dependency).
- Prettier also reformatted `App.tsx` as a whole (it was not formatted before); the commit says so.
- A literal non-breaking-space slip in a test regex (introduced by a shell edit) tripped `no-irregular-whitespace`; restored the \u escapes.
- Gates: typecheck ✅, tests ✅ 479 (schemas 49, core 134, mobile 185, web 111), lint ✅.
- The peso-only `formatPeso` / `parsePesoToCentavos` in the mobile app remain only until the screens are rebuilt on `useSettings` (next step), then they are removed.

### File List

- packages/schemas/src/common.ts, locale.ts (new), locale.test.ts (new), finance.ts, index.ts; packages/types/src/index.ts
- packages/core/src/format.ts, format.test.ts (new), insights.ts, safe-to-spend.ts (+ test), accounts.ts, budget.ts, monthly-report.ts, helpers.test.ts
- apps/mobile/src/lib/money.ts (+ test), device-locale.ts (+ test, new), settings-context.tsx (new)
- apps/mobile/src/db/migration-steps.ts, schema.ts, migrations.test.ts; src/data/repositories.ts
- apps/mobile/src/hooks/useToday.ts; apps/mobile/App.tsx
