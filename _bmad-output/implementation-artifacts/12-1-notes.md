# Story 12.1: Notes

Status: in-progress — Tasks 1–5 (logic + quick-add) done; Task 6 (Notes screen) blocked on Claude Design approval

## Story

As someone who jots things down all day,
I want quick notes inside Otto next to my reminders and budget,
so that I can capture a thought fast and turn it into a reminder when it needs action.

## Acceptance Criteria

1. Create, edit, delete, pin and search plain-text notes (title optional ≤ 120 chars, body 1–10,000 chars).
2. Notes are stored locally (migration step 4) and listed pinned first, then most recently updated first.
3. A note can be turned into a reminder: Otto proposes a reminder pre-filled from the note; nothing is created until the user confirms.
4. Quick-add understands notes ("note: buy gift for Ana") → an `add_note` proposal the user confirms.
5. Free tier; works offline.

## Tasks / Subtasks

**Design-independent**

- [x] **Task 1 — Contract** (AC: 1, 4): `noteSchema` (`packages/schemas/src/notes.ts`, exported); `noteDraftSchema` + `add_note` variant in `proposalActionSchema`; types re-exported. Tests.
- [x] **Task 2 — Migration step 4** (AC: 2): `notes` table (`id, user_id, title, body, pinned, created_at, updated_at`); Drizzle table; `ALL_TABLE_NAMES` (wipe coverage). Migration + parity tests.
- [x] **Task 3 — Repository** (AC: 1, 2): `noteRepository` (list/get/create/update/delete) following `reminderRepository` (non-sensitive, not encrypted — same tier as reminders); mappers + round-trip tests.
- [x] **Task 4 — Core helpers** (AC: 1–3): `packages/core/src/notes.ts` — `orderNotes` (pinned, then updatedAt desc), `searchNotes` (case-insensitive over title + body, trims query), `reminderDraftFromNote` (title = note title or first line, ≤ 140 chars; notes = body). Tests.
- [x] **Task 5 — Quick-add** (AC: 4): `noteFromDraft` mapper + `applyProposal` case; LLM tool `add_note` + prompt mention; label/icon entries for `add_note` in ProposalCard, QuickAddScreen and TodayScreen lookup tables (existing icon, no redesign).

**UI (after Claude Design approval — Notes screen)**

- [ ] **Task 6 — Notes screen**: list/search/pin, editor, "Make a reminder" (shows the reminder proposal card), navigation entry per approved design.
- [ ] **Task 7 — Gates** + manual check.

## Dev Notes

- Notes are not in `SENSITIVE_ENTITIES` (like reminders). If GATE-3 decides free-text notes need encryption at rest, switch the repository to the sealed pattern used by transactions — the mapper already isolates the body field.
- Migration step 4 depends on 11.1's migrator; never edit steps 1–3.
- The LLM only proposes `add_note`; the app writes only after Accept (CLAUDE.md §1.11).

### References
- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#Story 12.1] · [Source: sprint-change-proposal-2026-10-08.md]
- [Source: apps/mobile/src/data/repositories.ts — reminderRepository] · [Source: apps/web/src/server/llm/tools.ts]

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (claude-opus-5-5)

### Debug Log References

### Completion Notes List

- Implemented 2026-10-08, tests first for each task:
  - `noteSchema` (title ≤ 120 optional, body 1–10,000, pinned default false) in new `packages/schemas/src/notes.ts`; `noteDraftSchema` + `add_note` proposal variant.
  - Migration step 4 (`notes`), Drizzle table, wipe list; `noteToRow`/`noteFromRow`; `noteRepository` (user-scoped get/delete).
  - Core `orderNotes`, `searchNotes`, `reminderDraftFromNote` (title ≤ 140, notes ≤ 2,000 to fit reminderSchema).
  - Quick-add: `noteFromDraft` + `applyProposal` case; server LLM tool `add_note` + prompt guidance (notes = no time/deadline, else create_reminder).
  - Exhaustive action tables updated: mobile ProposalCard, QuickAddScreen, TodayScreen and the web playground. No note glyph exists yet, so `sparkle` is used — flagged for the design pass.
  - Gates: typecheck ✅, tests ✅ 397 (schemas 35, core 120, mobile 172, web 70), lint ✅, web build ✅.

### File List

- packages/schemas/src/notes.ts (new), notes.test.ts (new), proposals.ts, index.ts; packages/types/src/index.ts
- packages/core/src/notes.ts (new), notes.test.ts (new), index.ts
- apps/mobile/src/db/migration-steps.ts, schema.ts, migrations.test.ts
- apps/mobile/src/data/mappers.ts, mappers.test.ts, repositories.ts
- apps/mobile/src/lib/proposal-mappers.ts, proposal-mappers.test.ts, apply-proposal.ts
- apps/mobile/src/components/ProposalCard.tsx, screens/QuickAddScreen.tsx, screens/TodayScreen.tsx
- apps/web/src/server/llm/tools.ts, prompts.ts, llm.test.ts; apps/web/src/app/playground/page.tsx
