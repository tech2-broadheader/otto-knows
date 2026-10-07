// Appointments state (story 12.4): upcoming list, create (with an optional
// heads-up reminder before it), delete. Saved to Otto on this phone; device /
// Google calendar destinations arrive with their approvals.
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Appointment, EventDraft } from "@otto/schemas";
import { appointmentRepository, reminderRepository, type RepositoryDeps } from "../data";
import { appointmentFromDraft, reminderBeforeAppointment } from "../lib/proposal-mappers";
import { rescheduleDay } from "../lib/reschedule";
import { LOCAL_USER_ID } from "../lib/constants";
import { newUuid } from "../lib/id";
import { nowIso } from "../lib/datetime";
import type { LoadState } from "../components/AsyncBoundary";

export type AppointmentsState = {
  state: LoadState;
  error?: string;
  /** From now on, soonest first. */
  upcoming: Appointment[];
  create: (draft: EventDraft) => Promise<Appointment>;
  remove: (id: string) => Promise<void>;
  reload: () => Promise<void>;
};

export function useAppointments(deps: RepositoryDeps): AppointmentsState {
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | undefined>();
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const reload = useCallback(async () => {
    setState("loading");
    try {
      setAppointments(await appointmentRepository.list(LOCAL_USER_ID));
      setState("ready");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load your appointments.");
      setState("error");
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const upcoming = useMemo(() => {
    const now = Date.now();
    return appointments
      .filter((a) => Date.parse(a.endAt) >= now)
      .sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));
  }, [appointments]);

  const create = useCallback(
    async (draft: EventDraft) => {
      const ctx = { newId: newUuid, now: nowIso() };
      const appointment = await appointmentRepository.create(appointmentFromDraft(draft, ctx));
      const headsUp = reminderBeforeAppointment(appointment, ctx);
      if (headsUp) {
        await reminderRepository.create(headsUp);
        // Plan today's notifications again so the heads-up fires (diffed, no doubles).
        void rescheduleDay(deps);
      }
      await reload();
      return appointment;
    },
    [deps, reload],
  );

  const remove = useCallback(
    async (id: string) => {
      await appointmentRepository.delete(LOCAL_USER_ID, id);
      await reload();
    },
    [reload],
  );

  return { state, error, upcoming, create, remove, reload };
}
