// Consent state for the privacy spine (story 1.4). Loads the user's consent
// records and grants/revokes them via the consent repository. Every write is an
// explicit user action (toggle + the record carries grantedAt/revokedAt).
import { useCallback, useEffect, useState } from "react";
import { consentSchema, type Consent, type DataSource } from "@otto/schemas";
import { consentRepository } from "../data";
import { isConsentGranted } from "../security/consent";
import { CONSENT_POLICY_VERSION, LOCAL_USER_ID } from "../lib/constants";
import { newUuid } from "../lib/id";
import { nowIso } from "../lib/datetime";
import type { LoadState } from "../components/AsyncBoundary";
import { t } from "../i18n";

export type ConsentState = {
  state: LoadState;
  error?: string;
  consents: Consent[];
  /** True if the given source currently has a granted, non-revoked consent. */
  isGranted: (source: DataSource) => boolean;
  /** Grant or revoke a source. Persists a validated consent record. */
  setConsent: (source: DataSource, granted: boolean, purpose: string) => Promise<void>;
  reload: () => Promise<void>;
};

export function useConsents(): ConsentState {
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | undefined>();
  const [consents, setConsents] = useState<Consent[]>([]);

  const reload = useCallback(async () => {
    setState("loading");
    try {
      const rows = await consentRepository.list(LOCAL_USER_ID);
      setConsents(rows);
      setState("ready");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("account.errors.loadSettings"));
      setState("error");
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const setConsent = useCallback(
    async (source: DataSource, granted: boolean, purpose: string) => {
      const existing = consents.find((c) => c.source === source);
      const now = nowIso();
      const record = consentSchema.parse({
        id: existing?.id ?? newUuid(),
        userId: LOCAL_USER_ID,
        source,
        granted,
        purpose,
        policyVersion: CONSENT_POLICY_VERSION,
        grantedAt: granted ? now : existing?.grantedAt,
        revokedAt: granted ? undefined : now,
      });
      if (existing) await consentRepository.update(record);
      else await consentRepository.create(record);
      await reload();
    },
    [consents, reload],
  );

  const isGranted = useCallback(
    (source: DataSource) => isConsentGranted(consents, source),
    [consents],
  );

  return { state, error, consents, isGranted, setConsent, reload };
}
