// Routine-timed notification planning (Story 4.1). Pure: given a day, the user's
// routine anchors, reminders and medications, produce the concrete fire-times for
// local notifications. The app layer hands these to expo-notifications.
import type { Medication, Reminder, RoutineAnchor } from "@otto/schemas";
import { occursOnDate } from "./recurrence";

export type PlannedNotification = {
  sourceKind: "reminder" | "medication";
  sourceId: string;
  title: string;
  /** ISO-8601 with offset, e.g. 2026-06-14T08:00:00+08:00 */
  fireAt: string;
};

export type PlanDayNotificationsInput = {
  /** YYYY-MM-DD */
  date: string;
  /** Offset for HH:mm anchors/med times; defaults to PH (+08:00). */
  utcOffset?: string;
  anchors?: readonly RoutineAnchor[];
  reminders?: readonly Reminder[];
  medications?: readonly Medication[];
};

const DEFAULT_OFFSET = "+08:00";

function instantFromTime(date: string, time: string, offset: string): string {
  return `${date}T${time}:00${offset}`;
}

/**
 * Plan the local notifications for a single day, sorted by fire time.
 *
 * - Reminders fire at their absolute `dueAt` (when it falls on `date`), else at
 *   their routine anchor's time (when the reminder's recurrence lands on `date`).
 *   Done/dismissed reminders and ones with no resolvable time are skipped.
 * - Medications fire at each of their `times` on days their recurrence lands.
 */
export function planDayNotifications(input: PlanDayNotificationsInput): PlannedNotification[] {
  const offset = input.utcOffset ?? DEFAULT_OFFSET;
  const anchorsById = new Map((input.anchors ?? []).map((a) => [a.id, a]));
  const planned: PlannedNotification[] = [];

  for (const reminder of input.reminders ?? []) {
    if (reminder.status === "done" || reminder.status === "dismissed") continue;

    if (reminder.dueAt) {
      if (reminder.dueAt.startsWith(input.date)) {
        planned.push({
          sourceKind: "reminder",
          sourceId: reminder.id,
          title: reminder.title,
          fireAt: reminder.dueAt,
        });
      }
      continue;
    }

    if (reminder.anchorId) {
      const anchor = anchorsById.get(reminder.anchorId);
      if (!anchor) continue;
      // A reminder may carry its own recurrence; otherwise inherit the anchor's.
      const recurrence = reminder.recurrence ?? anchor.recurrence;
      if (!occursOnDate(recurrence, input.date)) continue;
      planned.push({
        sourceKind: "reminder",
        sourceId: reminder.id,
        title: reminder.title,
        fireAt: instantFromTime(input.date, anchor.time, offset),
      });
    }
  }

  for (const med of input.medications ?? []) {
    if (!occursOnDate(med.recurrence, input.date)) continue;
    for (const time of med.times) {
      planned.push({
        sourceKind: "medication",
        sourceId: med.id,
        title: `Take ${med.name}`,
        fireAt: instantFromTime(input.date, time, offset),
      });
    }
  }

  return planned.sort((a, b) => a.fireAt.localeCompare(b.fireAt));
}
