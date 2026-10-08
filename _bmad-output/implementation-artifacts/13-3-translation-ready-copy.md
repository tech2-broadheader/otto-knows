# Story 13.3: Translation-ready copy

Status: review — built 2026-10-08; English unchanged on screen (except the fixes noted); needs an on-device look

## Acceptance Criteria

1. **AC1** All user-facing strings live in a typed string catalog (en) with interpolation; screens use t(key). — **Done.** `apps/mobile/src/i18n` (`t`, `tSlot`), catalog in `i18n/en/*` by area (common, onboarding, money, tasks, account, assistant, core). Sentences from `@otto/core` (template briefing, money nudges, alarm labels) take a `copy` argument; the app passes `CORE_COPY` built from the catalog.
2. **AC2** Adding a language = adding a catalog file; missing keys fall back to English; a test fails on keys present in a translation but not in English. — **Done.** `i18n/translations.ts` registry (picked by device language), `createTranslator` English fallback, `catalog.test.ts` runs `extraKeys` per translation.
3. **AC3** No new dependency. — **Done.** In-repo helper; plurals use `Intl.PluralRules` with an English fallback when the engine lacks it.

## How it is enforced

- `i18n/no-hardcoded-text.test.ts` parses screens, components, design, hooks, lib, auth and connectors with the TypeScript compiler and fails on JSX text, text props, default text props, message-like object keys and sentence-like strings outside the catalog.
- `i18n/core-copy.test.ts` keeps the app's English for core sentences identical to `@otto/core`'s built-in English (used by the server).

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (claude-opus-5-5); screen migration split across five parallel sub-agents by area (disjoint files, one catalog file each), then reviewed and integrated.

### Completion Notes

- ~730 messages. Verification: typecheck clean; lint 0; 555 tests (schemas 58, core 148, mobile 230, web 119); Android JS bundle exports (5.86 MB).
- Copy changes (deliberate): "for the next 1 days" → "1 day"; routine-anchor kinds show names ("Wind down") instead of raw values; app name is `common.appName` (brand open, OD-4).
- Bold text mid-sentence uses `tSlot()` (control-character mark), replacing three ad-hoc splits the sub-agents wrote.
- Known gaps: error messages that arrive from Supabase / the server are shown as received (not translated); text saved into the database at creation (default routine anchor names, consent purpose) is stored in the language active at that moment; the server's own fallback briefing stays English.
- Process notes: translate.ts and its tests were written in one step (not strictly red first); a formatter run that rewrote all of design/kit.tsx was reverted before pushing so the commit only carries the string changes.

### Change Log

- 2026-10-08: Story implemented (status → review).
