// Routine state (story 2.1). Loads the user's routine + anchors, offers seeded
// defaults on first run, and add/edit/remove anchors. All writes validate via
// the routine repository (routineSchema / routineAnchorSchema).
import { useCallback, useEffect, useState } from "react";
import {
  routineAnchorSchema,
  type Routine,
  type RoutineAnchor,
  type RoutineAnchorKind,
} from "@otto/schemas";
import { routineRepository } from "../data";
import { LOCAL_USER_ID } from "../lib/constants";
import { newUuid } from "../lib/id";
import { nowIso } from "../lib/datetime";
import type { LoadState } from "../components/AsyncBoundary";
import { t } from "../i18n";

/** Seeded default anchors offered on first run (story 2.1 AC2). All editable. */
const SEED_DEFAULTS: ReadonlyArray<{ label: string; kind: RoutineAnchorKind; time: string }> = [
  { label: t("assistant.routine.seed.wake"), kind: "wake", time: "06:30" },
  { label: t("assistant.routine.seed.meds"), kind: "meds", time: "07:00" },
  { label: t("assistant.routine.seed.lunch"), kind: "meal", time: "12:30" },
  { label: t("assistant.routine.seed.windDown"), kind: "wind-down", time: "21:30" },
  { label: t("assistant.routine.seed.sleep"), kind: "sleep", time: "22:30" },
];

/** Local timezone name, e.g. "Asia/Manila". */
function localTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function buildAnchor(input: {
  label: string;
  kind: RoutineAnchorKind;
  time: string;
}): RoutineAnchor {
  const now = nowIso();
  return routineAnchorSchema.parse({
    id: newUuid(),
    label: input.label,
    kind: input.kind,
    time: input.time,
    recurrence: { freq: "daily" },
    createdAt: now,
    updatedAt: now,
  });
}

export type RoutineState = {
  state: LoadState;
  error?: string;
  routine?: Routine;
  anchors: RoutineAnchor[];
  /** No routine has been set up yet (first run). */
  needsSetup: boolean;
  /** Create the routine with the seeded defaults (explicit user accept). */
  seedDefaults: () => Promise<void>;
  addAnchor: (input: { label: string; kind: RoutineAnchorKind; time: string }) => Promise<void>;
  updateAnchor: (anchor: RoutineAnchor) => Promise<void>;
  removeAnchor: (anchorId: string) => Promise<void>;
  reload: () => Promise<void>;
};

export function useRoutine(): RoutineState {
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | undefined>();
  const [routine, setRoutine] = useState<Routine | undefined>();

  const reload = useCallback(async () => {
    setState("loading");
    try {
      const loaded = await routineRepository.getForUser(LOCAL_USER_ID);
      setRoutine(loaded);
      setState("ready");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("assistant.routine.loadError"));
      setState("error");
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const ensureRoutine = useCallback(async (): Promise<Routine> => {
    if (routine) return routine;
    const now = nowIso();
    const created = await routineRepository.create({
      id: newUuid(),
      userId: LOCAL_USER_ID,
      mode: "fixed",
      timezone: localTimezone(),
      anchors: [],
      createdAt: now,
      updatedAt: now,
    });
    setRoutine(created);
    return created;
  }, [routine]);

  const seedDefaults = useCallback(async () => {
    const now = nowIso();
    const created = await routineRepository.create({
      id: newUuid(),
      userId: LOCAL_USER_ID,
      mode: "fixed",
      timezone: localTimezone(),
      anchors: SEED_DEFAULTS.map(buildAnchor),
      createdAt: now,
      updatedAt: now,
    });
    setRoutine(created);
  }, []);

  const addAnchor = useCallback(
    async (input: { label: string; kind: RoutineAnchorKind; time: string }) => {
      const base = await ensureRoutine();
      await routineRepository.addAnchor(base.id, buildAnchor(input));
      await reload();
    },
    [ensureRoutine, reload],
  );

  const updateAnchor = useCallback(
    async (anchor: RoutineAnchor) => {
      if (!routine) return;
      const updated = routineAnchorSchema.parse({ ...anchor, updatedAt: nowIso() });
      await routineRepository.updateAnchor(routine.id, updated);
      await reload();
    },
    [routine, reload],
  );

  const removeAnchor = useCallback(
    async (anchorId: string) => {
      await routineRepository.deleteAnchor(anchorId);
      await reload();
    },
    [reload],
  );

  return {
    state,
    error,
    routine,
    anchors: routine?.anchors ?? [],
    needsSetup: state === "ready" && !routine,
    seedDefaults,
    addAnchor,
    updateAnchor,
    removeAnchor,
    reload,
  };
}
