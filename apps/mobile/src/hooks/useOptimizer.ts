// useOptimizer (story 6.x — routine optimizer, FR-O1).
//
// Describe a new routine → the LLM proxy → a confirmable OptimizationProposal.
// "Apply this plan" persists the changes via apply-optimization; "Not now"
// discards. Nothing writes back until the user applies (CLAUDE.md §1.11).
//
// State machine: idle → proposing → (proposal | error); then applying → applied.
// The user's current routine is loaded on demand and sent as context. Pro / not-
// configured / 401 / 403 / 429 all map to friendly codes the screen can render.
import { useCallback, useState } from "react";
import type { NewRoutineRequest, OptimizationProposal, Routine } from "@otto/schemas";
import { optimize, type ApiErrorCode } from "../lib/api-client";
import { applyOptimization } from "../lib/apply-optimization";
import { routineRepository } from "../data";
import { LOCAL_USER_ID } from "../lib/constants";
import { newUuid } from "../lib/id";
import { nowIso } from "../lib/datetime";

export type OptimizerStatus = "idle" | "proposing" | "proposed" | "error" | "applying" | "applied";

export type OptimizerState = {
  status: OptimizerStatus;
  /** The plan awaiting the user's confirm/discard (when status === "proposed"). */
  proposal?: OptimizationProposal;
  /** Friendly, user-facing error message (when status === "error"). */
  error?: string;
  /** Machine code behind the error, so the UI can show upgrade vs retry. */
  errorCode?: ApiErrorCode;
  /** Ask Otto to propose a plan for `newRoutine`. */
  propose: (newRoutine: NewRoutineRequest) => Promise<void>;
  /** Persist the current proposal (explicit user "Apply this plan"). */
  apply: () => Promise<void>;
  /** Discard the proposal and return to the form ("Not now"). */
  discard: () => void;
};

export function useOptimizer(): OptimizerState {
  const [status, setStatus] = useState<OptimizerStatus>("idle");
  const [proposal, setProposal] = useState<OptimizationProposal | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [errorCode, setErrorCode] = useState<ApiErrorCode | undefined>();
  // The routine + new-routine context captured at propose time, so Apply maps
  // changes against the exact day the proposal was built from.
  const [routine, setRoutine] = useState<Routine | undefined>();
  const [recurrence, setRecurrence] = useState<NewRoutineRequest["recurrence"] | undefined>();

  const fail = useCallback((code: ApiErrorCode, message: string) => {
    setError(message);
    setErrorCode(code);
    setStatus("error");
  }, []);

  const propose = useCallback(
    async (newRoutine: NewRoutineRequest) => {
      setStatus("proposing");
      setError(undefined);
      setErrorCode(undefined);
      setProposal(undefined);

      let current: Routine | undefined;
      try {
        current = await routineRepository.getForUser(LOCAL_USER_ID);
      } catch (caught) {
        fail("INTERNAL", caught instanceof Error ? caught.message : "Could not load your routine.");
        return;
      }
      if (!current) {
        fail("VALIDATION", "Set up your routine first so Otto has a day to reshape.");
        return;
      }

      const result = await optimize({ routine: current, newRoutine });
      if (!result.ok) {
        fail(result.code, result.message);
        return;
      }
      setRoutine(current);
      setRecurrence(newRoutine.recurrence);
      setProposal(result.data);
      setStatus("proposed");
    },
    [fail],
  );

  const apply = useCallback(async () => {
    if (!proposal || !routine || !recurrence) return;
    setStatus("applying");
    try {
      await applyOptimization(proposal, routine, recurrence, { newId: newUuid, now: nowIso() });
      setStatus("applied");
    } catch (caught) {
      fail("INTERNAL", caught instanceof Error ? caught.message : "Couldn't apply that plan.");
    }
  }, [proposal, routine, recurrence, fail]);

  const discard = useCallback(() => {
    setProposal(undefined);
    setRoutine(undefined);
    setRecurrence(undefined);
    setError(undefined);
    setErrorCode(undefined);
    setStatus("idle");
  }, []);

  return { status, proposal, error, errorCode, propose, apply, discard };
}
