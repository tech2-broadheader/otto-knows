// Local notification helper (story 4.1). Requests permission with a clear
// rationale and schedules a routine-timed local notification for a reminder.
// Degrades GRACEFULLY when permission is denied — callers get a typed result and
// never crash. This is the ONE module that touches expo-notifications.
import * as Notifications from "expo-notifications";
import type { Reminder } from "@otto/schemas";

/** Outcome of a permission request. */
export type PermissionResult = "granted" | "denied" | "undetermined";

/** Outcome of a schedule attempt — friendly for the UI to branch on. */
export type ScheduleResult =
  | { ok: true; notificationId: string }
  | { ok: false; reason: "permission-denied" | "no-due-time" | "in-past" | "error" };

/**
 * Configure how notifications present while the app is foregrounded. Safe to
 * call once at app boot.
 */
export function configureNotifications(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/** Ask for notification permission, returning a normalized status. */
export async function requestNotificationPermission(): Promise<PermissionResult> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return "granted";
  if (!existing.canAskAgain && existing.status === "denied") return "denied";
  const requested = await Notifications.requestPermissionsAsync();
  if (requested.granted) return "granted";
  return requested.status === "undetermined" ? "undetermined" : "denied";
}

/**
 * Schedule a one-shot local notification for a reminder at its due time.
 *
 * `fireAtIso` is the resolved ISO moment (the caller resolves anchor-relative
 * reminders to a concrete time via the scheduling/context-graph helpers). Returns
 * a typed ScheduleResult so the UI can show a graceful message instead of
 * throwing if permission is missing or the time is invalid.
 */
export async function scheduleReminderNotification(
  reminder: Reminder,
  fireAtIso: string | undefined,
): Promise<ScheduleResult> {
  if (!fireAtIso) return { ok: false, reason: "no-due-time" };

  const fireAt = new Date(fireAtIso);
  if (Number.isNaN(fireAt.getTime())) return { ok: false, reason: "error" };
  if (fireAt.getTime() <= Date.now()) return { ok: false, reason: "in-past" };

  const permission = await requestNotificationPermission();
  if (permission !== "granted") return { ok: false, reason: "permission-denied" };

  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: reminder.title,
        body: reminder.notes ?? "Reminder from Otto",
        // refId lets the tap handler open the right item (story 4.1 AC2).
        data: { reminderId: reminder.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireAt,
      },
    });
    return { ok: true, notificationId };
  } catch {
    // No silent swallow of the contract — surface a typed failure to the UI.
    return { ok: false, reason: "error" };
  }
}

/** Cancel a previously scheduled reminder notification (best-effort). */
export async function cancelReminderNotification(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}
