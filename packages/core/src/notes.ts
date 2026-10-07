// Notes helpers (story 12.1). Pure.
import type { Note } from "@otto/schemas";

/** Reminder field limits (reminderSchema) that a converted note must respect. */
const REMINDER_TITLE_MAX = 140;
const REMINDER_NOTES_MAX = 2000;

/** Pinned notes first, then most recently updated. Returns a new array. */
export function orderNotes(notes: readonly Note[]): Note[] {
  return [...notes].sort(
    (a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt),
  );
}

/** Case-insensitive match on title or body; a blank query matches everything. */
export function searchNotes(notes: readonly Note[], query: string): Note[] {
  const q = query.trim().toLowerCase();
  if (q === "") return [...notes];
  return notes.filter(
    (n) => n.body.toLowerCase().includes(q) || (n.title?.toLowerCase().includes(q) ?? false),
  );
}

/**
 * Pre-fill a reminder proposal from a note ("Make a reminder"). The user still
 * confirms it — nothing is created here (CLAUDE.md §1.11).
 */
export function reminderDraftFromNote(note: Note): { title: string; notes: string } {
  const firstLine = note.body.split("\n")[0]?.trim() || note.body.trim();
  return {
    title: (note.title ?? firstLine).slice(0, REMINDER_TITLE_MAX),
    notes: note.body.slice(0, REMINDER_NOTES_MAX),
  };
}
