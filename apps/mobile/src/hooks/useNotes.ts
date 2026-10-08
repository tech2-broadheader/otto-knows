// Notes state (story 12.1): list (pinned first, newest), search, save, pin,
// delete, and "make a reminder" from a note — the reminder is only created when
// the user confirms the proposal (CLAUDE.md §1.11).
import { useCallback, useEffect, useMemo, useState } from "react";
import { noteSchema, reminderSchema, type Note } from "@otto/schemas";
import { orderNotes, reminderDraftFromNote, searchNotes } from "@otto/core";
import { noteRepository, reminderRepository } from "../data";
import { LOCAL_USER_ID } from "../lib/constants";
import { newUuid } from "../lib/id";
import { nowIso } from "../lib/datetime";
import type { LoadState } from "../components/AsyncBoundary";
import { t } from "../i18n";

export type NoteInput = { title: string; body: string; pinned: boolean };

export type NotesState = {
  state: LoadState;
  error?: string;
  notes: Note[];
  query: string;
  setQuery: (q: string) => void;
  /** Ordered + filtered by the current query. */
  visible: Note[];
  get: (id: string) => Note | undefined;
  save: (input: NoteInput, id?: string) => Promise<Note>;
  remove: (id: string) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  /** Create a reminder from a note (after the user accepted the proposal). */
  makeReminder: (note: Note) => Promise<void>;
  reload: () => Promise<void>;
};

export function useNotes(): NotesState {
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | undefined>();
  const [notes, setNotes] = useState<Note[]>([]);
  const [query, setQuery] = useState("");

  const reload = useCallback(async () => {
    setState("loading");
    try {
      setNotes(await noteRepository.list(LOCAL_USER_ID));
      setState("ready");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("tasks.notes.loadError"));
      setState("error");
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const visible = useMemo(() => orderNotes(searchNotes(notes, query)), [notes, query]);
  const get = useCallback((id: string) => notes.find((n) => n.id === id), [notes]);

  const save = useCallback(
    async (input: NoteInput, id?: string) => {
      const now = nowIso();
      const existing = id ? notes.find((n) => n.id === id) : undefined;
      const title = input.title.trim();
      const note = noteSchema.parse({
        id: existing?.id ?? newUuid(),
        userId: LOCAL_USER_ID,
        title: title === "" ? undefined : title,
        body: input.body.trim(),
        pinned: input.pinned,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      });
      const saved = existing
        ? await noteRepository.update(note)
        : await noteRepository.create(note);
      await reload();
      return saved;
    },
    [notes, reload],
  );

  const remove = useCallback(
    async (id: string) => {
      await noteRepository.delete(LOCAL_USER_ID, id);
      await reload();
    },
    [reload],
  );

  const togglePin = useCallback(
    async (id: string) => {
      const note = notes.find((n) => n.id === id);
      if (!note) return;
      await noteRepository.update({ ...note, pinned: !note.pinned, updatedAt: nowIso() });
      await reload();
    },
    [notes, reload],
  );

  const makeReminder = useCallback(async (note: Note) => {
    const draft = reminderDraftFromNote(note);
    const now = nowIso();
    await reminderRepository.create(
      reminderSchema.parse({
        id: newUuid(),
        userId: LOCAL_USER_ID,
        title: draft.title,
        notes: draft.notes,
        status: "pending",
        createdAt: now,
        updatedAt: now,
      }),
    );
  }, []);

  return {
    state,
    error,
    notes,
    query,
    setQuery,
    visible,
    get,
    save,
    remove,
    togglePin,
    makeReminder,
    reload,
  };
}
