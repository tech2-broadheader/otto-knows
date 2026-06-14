// Routine-timed auto-scheduling orchestration (Story 4.1). Gathers the day's
// scheduling inputs (routine anchors + pending reminders + medications), computes
// fire-times with planDayNotifications, and hands them to syncDayNotifications,
// which diffs against what's already scheduled so nothing double-fires.
//
// Medications are CONSENT-GATED (health): they only feed the plan when health
// consent is granted, matching how Today reads them.
//
// Called on app boot and after the user adds/edits a reminder or medication.
// Degrades gracefully: a denied permission or load failure returns a typed
// result and never throws into the UI.
import { planDayNotifications } from "@otto/core";
import type { Consent } from "@otto/schemas";
import {
  consentRepository,
  makeMedicationRepository,
  reminderRepository,
  routineRepository,
  type RepositoryDeps,
} from "../data";
import { isConsentGranted } from "../security/consent";
import { syncDayNotifications, type SyncResult } from "../notifications";
import { LOCAL_USER_ID } from "./constants";
import { localUtcOffset, todayDate } from "./datetime";

/**
 * Recompute and (re)schedule today's routine-timed notifications for the local
 * user. Safe to call repeatedly — syncDayNotifications only applies the delta.
 */
export async function rescheduleDay(deps: RepositoryDeps): Promise<SyncResult> {
  try {
    const consents: Consent[] = await consentRepository.list(LOCAL_USER_ID);
    const canHealth = isConsentGranted(consents, "health");

    const routine = await routineRepository.getForUser(LOCAL_USER_ID);
    const reminders = await reminderRepository.list(LOCAL_USER_ID);
    const medications = canHealth ? await makeMedicationRepository(deps).list(LOCAL_USER_ID) : [];

    const planned = planDayNotifications({
      date: todayDate(),
      utcOffset: localUtcOffset(),
      anchors: routine?.anchors ?? [],
      reminders: reminders.filter((r) => r.status === "pending"),
      medications,
    });

    return await syncDayNotifications(planned);
  } catch {
    return { ok: false, reason: "error" };
  }
}
