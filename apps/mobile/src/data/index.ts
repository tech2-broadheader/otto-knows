// Default wiring for the data layer: opens the DB, builds the encryption
// provider from expo-crypto, and exposes ready-to-use repositories. This module
// pulls in native modules (db client + expo-crypto) and is for app runtime use,
// not for Node tests.
import { migrateDatabase } from "../db/client";
import type { MigrationResult } from "../db/migrations";
import { createEncryptionProvider } from "../security/encryption";
import { createSecureStoreKeyStore, defaultCryptoPrimitives } from "../security/crypto-primitives";
import { consentRepository, persistAuditEntry, type RepositoryDeps } from "./repositories";

export * from "./repositories";
export * from "./privacy";

/** Build the production RepositoryDeps (encryption + consent loader + audit sink). */
export function createRepositoryDeps(): RepositoryDeps {
  // GATE-3: the key persists across launches via expo-secure-store so encrypted
  // data stays readable between sessions. The cipher itself remains the
  // documented stopgap (see encryption.ts).
  const encryption = createEncryptionProvider(createSecureStoreKeyStore(), defaultCryptoPrimitives);
  return {
    encryption,
    loadConsents: (userId) => consentRepository.list(userId),
    writeAudit: (ctx) => persistAuditEntry(ctx),
  };
}

/**
 * Call once at app boot before any repository use. Repositories must not be used
 * unless the result is ok — the schema may be missing or out of date.
 */
export function initDataLayer(): MigrationResult {
  return migrateDatabase();
}
