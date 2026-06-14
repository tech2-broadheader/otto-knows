// Default wiring for the data layer: opens the DB, builds the encryption
// provider from expo-crypto, and exposes ready-to-use repositories. This module
// pulls in native modules (db client + expo-crypto) and is for app runtime use,
// not for Node tests.
import { ensureSchema } from "../db/client";
import { createEncryptionProvider } from "../security/encryption";
import { createInMemoryKeyStore, defaultCryptoPrimitives } from "../security/crypto-primitives";
import { consentRepository, persistAuditEntry, type RepositoryDeps } from "./repositories";

export * from "./repositories";
export * from "./privacy";

/** Build the production RepositoryDeps (encryption + consent loader + audit sink). */
export function createRepositoryDeps(): RepositoryDeps {
  const encryption = createEncryptionProvider(createInMemoryKeyStore(), defaultCryptoPrimitives);
  return {
    encryption,
    loadConsents: (userId) => consentRepository.list(userId),
    writeAudit: (ctx) => persistAuditEntry(ctx),
  };
}

/** Call once at app boot before any repository use. */
export function initDataLayer(): void {
  ensureSchema();
}
