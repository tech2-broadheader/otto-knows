// useTips (story 6.x — finance/health tips, FR-T1/FR-T2).
//
// Fetch general, non-prescriptive tips for a domain from the LLM proxy. Read-only
// — tips never write back. Pro / not-configured / 401 / 403 / 429 map to friendly
// codes the screen can render as a calm upgrade / sign-in / try-later message.
import { useCallback, useState } from "react";
import type { TipDomain } from "@otto/schemas";
import { fetchTips, type ApiErrorCode } from "../lib/api-client";

export type TipsStatus = "idle" | "loading" | "ready" | "error";

export type TipsState = {
  status: TipsStatus;
  /** The domain the current tips/error belong to. */
  domain: TipDomain;
  tips: string[];
  error?: string;
  errorCode?: ApiErrorCode;
  /** Switch domain and fetch its tips. */
  load: (domain: TipDomain) => Promise<void>;
};

export function useTips(initialDomain: TipDomain = "finance"): TipsState {
  const [status, setStatus] = useState<TipsStatus>("idle");
  const [domain, setDomain] = useState<TipDomain>(initialDomain);
  const [tips, setTips] = useState<string[]>([]);
  const [error, setError] = useState<string | undefined>();
  const [errorCode, setErrorCode] = useState<ApiErrorCode | undefined>();

  const load = useCallback(async (next: TipDomain) => {
    setDomain(next);
    setStatus("loading");
    setError(undefined);
    setErrorCode(undefined);
    setTips([]);
    const result = await fetchTips(next);
    if (result.ok) {
      setTips(result.data);
      setStatus("ready");
      return;
    }
    setError(result.message);
    setErrorCode(result.code);
    setStatus("error");
  }, []);

  return { status, domain, tips, error, errorCode, load };
}
