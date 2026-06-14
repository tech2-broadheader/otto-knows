// Local notification helper (story 4.1). Requests permission with a clear
// rationale and schedules a routine-timed local notification for a reminder.
// Degrades GRACEFULLY when permission is denied — callers get a typed result and
// never crash. This is the ONE module that touches expo-notifications.
import * as Notifications from "expo-notifications";
import type { Reminder } from "@otto/schemas";
import type { PlannedNotification } from "@otto/core";
import { diffSchedule, planKey } from "./schedule-diff";

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

/** Outcome of a day-notification sync — friendly for the caller to log/branch on. */
export type SyncResult =
  | { ok: true; scheduled: number; cancelled: number }
  | { ok: false; reason: "permission-denied" | "error" };

/** Marker on every Otto-scheduled day notification so we can recognise our own. */
const OTTO_PLAN_KIND = "otto-day-plan";

/**
 * (Re)schedule the day's routine-timed notifications (Story 4.1).
 *
 * Given the fire-times computed by `planDayNotifications` (passed in — this module
 * stays free of @otto/core data wiring), diff them against what Otto has already
 * scheduled and apply only the delta: schedule new fire-times, cancel stale ones.
 * Identity is the plan key (sourceKind:sourceId:fireAt) stored in each
 * notification's `data`, so calling this repeatedly never double-fires the same
 * dose/reminder. Past fire-times are skipped.
 *
 * Degrades gracefully: if notification permission is denied we cancel any stale
 * Otto notifications we can and return a typed failure instead of throwing.
 */
export async function syncDayNotifications(
  planned: readonly PlannedNotification[],
): Promise<SyncResult> {
  try {
    // Only future fire-times are schedulable.
    const now = Date.now();
    const future = planned.filter((p) => {
      const t = new Date(p.fireAt).getTime();
      return !Number.isNaN(t) && t > now;
    });

    const scheduledNow = await Notifications.getAllScheduledNotificationsAsync();
    // Consider only notifications Otto's day-planner created (by our marker).
    const ourExisting = scheduledNow.filter(
      (n) => (n.content.data as { ottoPlan?: string } | undefined)?.ottoPlan === OTTO_PLAN_KIND,
    );

    const { toSchedule, toCancel } = diffSchedule(future, ourExisting, (n) => {
      const key = (n.content.data as { planKey?: string } | undefined)?.planKey;
      return typeof key === "string" ? key : undefined;
    });

    // Cancel stale first (safe even without notification permission).
    for (const stale of toCancel) {
      await Notifications.cancelScheduledNotificationAsync(stale.identifier);
    }

    if (toSchedule.length === 0) {
      return { ok: true, scheduled: 0, cancelled: toCancel.length };
    }

    const permission = await requestNotificationPermission();
    if (permission !== "granted") {
      return { ok: false, reason: "permission-denied" };
    }

    let scheduled = 0;
    for (const plan of toSchedule) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: plan.title,
          body:
            plan.sourceKind === "medication" ? "Time for your medication" : "Reminder from Otto",
          data: { ottoPlan: OTTO_PLAN_KIND, planKey: planKey(plan), sourceId: plan.sourceId },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(plan.fireAt),
        },
      });
      scheduled += 1;
    }

    return { ok: true, scheduled, cancelled: toCancel.length };
  } catch {
    return { ok: false, reason: "error" };
  }
}
