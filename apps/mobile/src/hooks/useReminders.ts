// Reminders state (epic 4): list, add, mark done. "Remind me" wires the local
// notification helper (story 4.1) and degrades gracefully if permission denied.
import { useCallback, useEffect, useState } from "react";
import { reminderSchema, type Reminder } from "@otto/schemas";
import { reminderRepository } from "../data";
import { scheduleReminderNotification, type ScheduleResult } from "../notifications";
import { LOCAL_USER_ID } from "../lib/constants";
import { newUuid } from "../lib/id";
import { nowIso } from "../lib/datetime";
import type { LoadState } from "../components/AsyncBoundary";

export type NewReminderInput = {
  title: string;
  notes?: string;
  /** ISO-8601 with offset, when the reminder is due (optional). */
  dueAt?: string;
};

export type RemindersState = {
  state: LoadState;
  error?: string;
  reminders: Reminder[];
  addReminder: (input: NewReminderInput) => Promise<Reminder>;
  markDone: (reminder: Reminder) => Promise<void>;
  remindMe: (reminder: Reminder) => Promise<ScheduleResult>;
  reload: () => Promise<void>;
};

export function useReminders(): RemindersState {
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | undefined>();
  const [reminders, setReminders] = useState<Reminder[]>([]);

  const reload = useCallback(async () => {
    setState("loading");
    try {
      const rows = await reminderRepository.list(LOCAL_USER_ID);
      setReminders(rows);
      setState("ready");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load your reminders.");
      setState("error");
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const addReminder = useCallback(
    async (input: NewReminderInput) => {
      const now = nowIso();
      const reminder = reminderSchema.parse({
        id: newUuid(),
        userId: LOCAL_USER_ID,
        title: input.title,
        notes: input.notes && input.notes.length > 0 ? input.notes : undefined,
        dueAt: input.dueAt,
        status: "pending",
        createdAt: now,
        updatedAt: now,
      });
      const created = await reminderRepository.create(reminder);
      await reload();
      return created;
    },
    [reload],
  );

  const markDone = useCallback(
    async (reminder: Reminder) => {
      const updated = reminderSchema.parse({ ...reminder, status: "done", updatedAt: nowIso() });
      await reminderRepository.update(updated);
      await reload();
    },
    [reload],
  );

  const remindMe = useCallback(
    (reminder: Reminder) => scheduleReminderNotification(reminder, reminder.dueAt),
    [],
  );

  return { state, error, reminders, addReminder, markDone, remindMe, reload };
}
