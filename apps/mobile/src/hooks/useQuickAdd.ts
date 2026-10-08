// useQuickAdd (story 5.x — conversational quick-add).
//
// Natural-language text → the LLM proxy → confirmable Proposals. Accept applies
// the proposal locally via apply-proposal and removes it from the list; Dismiss
// just removes it. Nothing writes back until the user accepts (CLAUDE.md §1.11).
//
// State machine: idle → submitting → (proposals | error). Free-tier quota /
// rate-limit (403/429) and not-configured / sign-in (NOT_CONFIGURED/401) map to
// friendly messages so the UI never crashes.
import { useCallback, useState } from "react";
import type { Proposal } from "@otto/schemas";
import { quickAdd as quickAddRequest, type ApiErrorCode } from "../lib/api-client";
import { applyProposal, type ApplyContext } from "../lib/apply-proposal";
import { newUuid } from "../lib/id";
import { nowIso } from "../lib/datetime";
import { useAiUserContext, useSettings } from "../lib/settings-context";
import type { RepositoryDeps } from "../data";
import { t } from "../i18n";

export type QuickAddStatus = "idle" | "submitting" | "ready" | "error";

export type QuickAddState = {
  status: QuickAddStatus;
  /** Proposals awaiting the user's confirm/dismiss. */
  proposals: Proposal[];
  /** Friendly, user-facing error message (when status === "error"). */
  error?: string;
  /** Machine code behind the error, so the UI can show upgrade vs retry. */
  errorCode?: ApiErrorCode;
  /** The proposal id currently being applied (disables its buttons). */
  applyingId?: string;
  submit: (text: string) => Promise<void>;
  accept: (proposal: Proposal) => Promise<void>;
  dismiss: (proposal: Proposal) => void;
  reset: () => void;
};

export function useQuickAdd(deps: RepositoryDeps): QuickAddState {
  const { currency } = useSettings();
  const user = useAiUserContext();
  const [status, setStatus] = useState<QuickAddStatus>("idle");
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [error, setError] = useState<string | undefined>();
  const [errorCode, setErrorCode] = useState<ApiErrorCode | undefined>();
  const [applyingId, setApplyingId] = useState<string | undefined>();

  const submit = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (trimmed === "") return;
      setStatus("submitting");
      setError(undefined);
      setErrorCode(undefined);
      setProposals([]);
      const result = await quickAddRequest(trimmed, user);
      if (result.ok) {
        setProposals(result.data);
        setStatus("ready");
        return;
      }
      setError(result.message);
      setErrorCode(result.code);
      setStatus("error");
    },
    [user],
  );

  const accept = useCallback(
    async (proposal: Proposal) => {
      setApplyingId(proposal.id);
      try {
        const ctx: ApplyContext = { newId: newUuid, now: nowIso(), currency };
        await applyProposal(proposal.action, deps, ctx);
        setProposals((current) => current.filter((p) => p.id !== proposal.id));
      } catch (caught) {
        setError(
          caught instanceof Error ? caught.message : t("assistant.quickAdd.errors.applyFailed"),
        );
        setErrorCode("INTERNAL");
        setStatus("error");
      } finally {
        setApplyingId(undefined);
      }
    },
    [deps, currency],
  );

  const dismiss = useCallback((proposal: Proposal) => {
    setProposals((current) => current.filter((p) => p.id !== proposal.id));
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setProposals([]);
    setError(undefined);
    setErrorCode(undefined);
  }, []);

  return { status, proposals, error, errorCode, applyingId, submit, accept, dismiss, reset };
}
