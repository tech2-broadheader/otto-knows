// Medications state (closes the meds gap). List / add / edit / delete medications
// via the SENSITIVE medication repository (encrypt + audit). RepositoryDeps come
// from createRepositoryDeps() the same way Finance does. Free cap enforced
// client-side with an upgrade prompt at the cap (FREE_CAPS.medications).
//
// Meds feed Today via the context graph (useToday reads makeMedicationRepository),
// so adding/editing/deleting here changes the day after a Today reload.
import { useCallback, useEffect, useMemo, useState } from "react";
import { medicationSchema, type Medication, type Recurrence } from "@otto/schemas";
import { makeMedicationRepository, type RepositoryDeps } from "../data";
import { FREE_CAPS, isAtCap } from "../lib/caps";
import { rescheduleDay } from "../lib/reschedule";
import { LOCAL_USER_ID } from "../lib/constants";
import { newUuid } from "../lib/id";
import { nowIso } from "../lib/datetime";
import type { LoadState } from "../components/AsyncBoundary";

/** Input for creating/editing a medication (UI-friendly; validated via schema). */
export type MedicationInput = {
  name: string;
  dosage?: string;
  /** One or more HH:mm dose times. */
  times: string[];
  recurrence: Recurrence;
};

export type MedicationsState = {
  state: LoadState;
  error?: string;
  medications: Medication[];
  /** True when the user has reached the free cap for medications. */
  medicationsAtCap: boolean;
  addMedication: (input: MedicationInput) => Promise<Medication | "at-cap">;
  editMedication: (id: string, input: MedicationInput) => Promise<Medication | undefined>;
  deleteMedication: (id: string) => Promise<void>;
  reload: () => Promise<void>;
};

export function useMedications(deps: RepositoryDeps): MedicationsState {
  const medRepo = useMemo(() => makeMedicationRepository(deps), [deps]);

  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | undefined>();
  const [medications, setMedications] = useState<Medication[]>([]);

  const reload = useCallback(async () => {
    setState("loading");
    try {
      const rows = await medRepo.list(LOCAL_USER_ID);
      setMedications(rows);
      setState("ready");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load your medications.");
      setState("error");
    }
  }, [medRepo]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const addMedication = useCallback(
    async (input: MedicationInput) => {
      if (isAtCap("medications", medications.length)) return "at-cap" as const;
      const now = nowIso();
      const medication = medicationSchema.parse({
        id: newUuid(),
        userId: LOCAL_USER_ID,
        name: input.name,
        dosage: input.dosage && input.dosage.length > 0 ? input.dosage : undefined,
        times: input.times,
        recurrence: input.recurrence,
        createdAt: now,
        updatedAt: now,
      });
      const created = await medRepo.create(medication);
      await reload();
      // Schedule the new dose times for today (best-effort; degrades gracefully).
      await rescheduleDay(deps);
      return created;
    },
    [deps, medRepo, medications.length, reload],
  );

  const editMedication = useCallback(
    async (id: string, input: MedicationInput) => {
      const existing = medications.find((m) => m.id === id);
      if (!existing) return undefined;
      const updated = medicationSchema.parse({
        ...existing,
        name: input.name,
        dosage: input.dosage && input.dosage.length > 0 ? input.dosage : undefined,
        times: input.times,
        recurrence: input.recurrence,
        updatedAt: nowIso(),
      });
      const saved = await medRepo.update(updated);
      await reload();
      // Dose times may have changed — re-plan today's notifications.
      await rescheduleDay(deps);
      return saved;
    },
    [deps, medRepo, medications, reload],
  );

  const deleteMedication = useCallback(
    async (id: string) => {
      await medRepo.delete(LOCAL_USER_ID, id);
      await reload();
      // Cancel the deleted med's now-stale scheduled doses.
      await rescheduleDay(deps);
    },
    [deps, medRepo, reload],
  );

  return {
    state,
    error,
    medications,
    medicationsAtCap: medications.length >= FREE_CAPS.medications,
    addMedication,
    editMedication,
    deleteMedication,
    reload,
  };
}
