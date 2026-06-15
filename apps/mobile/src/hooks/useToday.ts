// Today state (story 4.2): compose the daily briefing and the unified day list.
// Uses @otto/core: whatsOnToday (context-graph unification), composeBriefing
// (template briefing) and detectPaydayVsBillNudges (gentle finance heads-up).
//
// CONSENT GATING (CLAUDE.md §1.11 / story 1.4): a source is only read when its
// consent is granted. Finance (bills/income), health (meds) and calendar each
// require their own granted consent before they feed the day.
import { useCallback, useEffect, useState } from "react";
import {
  composeBriefing,
  detectPaydayVsBillNudges,
  whatsOnToday,
  type DaySources,
} from "@otto/core";
import { briefingSchema } from "@otto/schemas";
import type { Briefing, Consent, ContextItem, Nudge, Proposal } from "@otto/schemas";
import { isConsentGranted as consentGranted } from "../security/consent";
import { fetchBrief, getApiBaseUrl } from "../lib/api-client";
import { useAuth } from "../auth/AuthProvider";
import {
  consentRepository,
  makeBillRepository,
  makeCalendarEventRepository,
  makeIncomeRepository,
  makeMedicationRepository,
  reminderRepository,
  routineRepository,
  type RepositoryDeps,
} from "../data";
import { LOCAL_USER_ID } from "../lib/constants";
import { newUuid } from "../lib/id";
import { briefingSlotForHour, localUtcOffset, nowIso, todayDate } from "../lib/datetime";
import type { LoadState } from "../components/AsyncBoundary";

export type TodayState = {
  state: LoadState;
  error?: string;
  briefing?: Briefing;
  items: ContextItem[];
  nudges: Nudge[];
  /** Proposals from the Pro LLM briefing (empty on free tier / fallback). */
  proposals: Proposal[];
  /** True when the shown briefing came from the LLM (vs the local template). */
  briefingFromLlm: boolean;
  reload: () => Promise<void>;
};

export function useToday(deps: RepositoryDeps): TodayState {
  const { isPro } = useAuth();
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | undefined>();
  const [briefing, setBriefing] = useState<Briefing | undefined>();
  const [items, setItems] = useState<ContextItem[]>([]);
  const [nudges, setNudges] = useState<Nudge[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [briefingFromLlm, setBriefingFromLlm] = useState(false);

  const reload = useCallback(async () => {
    setState("loading");
    try {
      const consents: Consent[] = await consentRepository.list(LOCAL_USER_ID);
      const canFinance = consentGranted(consents, "finance");
      const canHealth = consentGranted(consents, "health");
      const canCalendar = consentGranted(consents, "calendar");

      const date = todayDate();
      const offset = localUtcOffset();

      // Always-available local sources: routine anchors + reminders.
      const routine = await routineRepository.getForUser(LOCAL_USER_ID);
      const reminders = await reminderRepository.list(LOCAL_USER_ID);

      // Consent-gated sources.
      const bills = canFinance ? await makeBillRepository(deps).list(LOCAL_USER_ID) : [];
      const income = canFinance ? await makeIncomeRepository(deps).list(LOCAL_USER_ID) : [];
      const medications = canHealth ? await makeMedicationRepository(deps).list(LOCAL_USER_ID) : [];
      const events = canCalendar ? await makeCalendarEventRepository(deps).list(LOCAL_USER_ID) : [];

      const sources: DaySources = {
        anchors: routine?.anchors ?? [],
        reminders: reminders.filter((r) => r.status === "pending"),
        bills: bills.filter((b) => !b.isPaid),
        medications,
        events,
      };

      // Unique context-item ids (multi-dose meds collide on the default mapper).
      const dayItems = whatsOnToday(
        sources,
        { userId: LOCAL_USER_ID, date, utcOffset: offset },
        () => newUuid(),
      );

      const dayNudges = detectPaydayVsBillNudges(income, bills, date, () => newUuid());

      const slot = briefingSlotForHour(new Date().getHours());
      const composed = composeBriefing({
        id: newUuid(),
        userId: LOCAL_USER_ID,
        slot,
        date,
        items: dayItems,
        nudges: dayNudges,
        generatedAt: nowIso(),
      });

      setItems(dayItems);
      setNudges(dayNudges);

      // Pro proactive briefing (FR-B1/FR-L2): when entitled AND the backend is
      // configured, ask the LLM proxy for a reasoned brief + proposals. Any
      // failure (network, 401/403/429, malformed) falls back to the template
      // briefing — we NEVER drop the local path or block the day on the network.
      let usedLlm = false;
      let llmProposals: Proposal[] = [];
      let shownBriefing: Briefing = composed;
      if (isPro && getApiBaseUrl() !== null) {
        const result = await fetchBrief({
          slot,
          contextItems: dayItems,
          routine,
          incomes: income.length > 0 ? income : undefined,
        });
        if (result.ok) {
          const parsedBrief = briefingSchema.safeParse(result.data.briefing);
          if (parsedBrief.success) {
            shownBriefing = parsedBrief.data;
            llmProposals = result.data.proposals;
            usedLlm = true;
          }
        }
      }

      setBriefing(shownBriefing);
      setProposals(llmProposals);
      setBriefingFromLlm(usedLlm);
      setState("ready");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not build your day.");
      setState("error");
    }
  }, [deps, isPro]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { state, error, briefing, items, nudges, proposals, briefingFromLlm, reload };
}
