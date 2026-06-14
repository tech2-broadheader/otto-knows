// Consent decision logic — the privacy spine (story 1.4 AC1).
//
// The DECISION ("is reading this source allowed?") is a PURE function so it can
// be unit-tested in Node without a database. The repository layer fetches the
// consent records and calls isConsentGranted / requireConsent around reads.
import type { Consent, DataSource } from "@otto/schemas";

/**
 * PURE. A source is readable only if there is at least one consent record for it
 * that is granted, has a grantedAt, and has not been revoked.
 */
export function isConsentGranted(consents: readonly Consent[], source: DataSource): boolean {
  return consents.some((c) => c.source === source && c.granted && !!c.grantedAt && !c.revokedAt);
}

/** Error thrown when a source is read without a valid consent record. */
export class ConsentRequiredError extends Error {
  readonly source: DataSource;
  constructor(source: DataSource) {
    super(`Consent required to read source "${source}" — no granted, non-revoked consent found.`);
    this.name = "ConsentRequiredError";
    this.source = source;
  }
}

/**
 * Guard used by source-backed repositories. Throws ConsentRequiredError unless a
 * granted, non-revoked consent exists for the source. Pure (no I/O) — the caller
 * supplies the current consent records.
 */
export function requireConsent(consents: readonly Consent[], source: DataSource): void {
  if (!isConsentGranted(consents, source)) {
    throw new ConsentRequiredError(source);
  }
}
