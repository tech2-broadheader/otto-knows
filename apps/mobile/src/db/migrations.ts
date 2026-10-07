// Versioned on-device schema migrations (ADR-004). PURE — must not import
// expo-sqlite: the native adapter lives in client.ts, and Node tests drive this
// module through node:sqlite. The schema version is SQLite's `PRAGMA user_version`.

/** The three operations the migrator needs from a SQLite handle. */
export type MigrationExecutor = {
  exec(sql: string): void;
  getUserVersion(): number;
  /** Run `fn` atomically: commit if it returns, roll back and rethrow if it throws. */
  transaction(fn: () => void): void;
};

/** One forward-only schema step. Shipped steps are immutable. */
export type Migration = {
  version: number;
  name: string;
  statements: readonly string[];
};

export type MigrationError =
  /** Step `failedVersion` threw and was rolled back; the DB stays at `failedVersion - 1`. */
  | { kind: "step-failed"; fromVersion: number; failedVersion: number; cause: unknown }
  /** The DB was written by a newer app build; we leave it untouched. */
  | { kind: "newer-than-app"; fromVersion: number; latestVersion: number }
  /** The DB could not be opened or its version read. */
  | { kind: "open-failed"; cause: unknown };

export type MigrationResult =
  | { ok: true; fromVersion: number; toVersion: number }
  | { ok: false; error: MigrationError };

/**
 * Throw if the list isn't exactly versions 1..N in order. A malformed list is a
 * programming error caught by tests, not a runtime condition users can hit.
 */
function assertContiguous(migrations: readonly Migration[]): void {
  migrations.forEach((m, index) => {
    if (m.version !== index + 1) {
      throw new Error(
        `Migrations must be contiguous from 1 in ascending order; found version ${m.version} at position ${index + 1}`,
      );
    }
  });
}

/**
 * Apply every step newer than the database's current version, each in its own
 * transaction together with its `user_version` bump, so a failure leaves the
 * database at the last fully-applied step and never half-migrated.
 */
export function runMigrations(
  executor: MigrationExecutor,
  migrations: readonly Migration[],
): MigrationResult {
  assertContiguous(migrations);
  const latestVersion = migrations.length;

  let fromVersion: number;
  try {
    fromVersion = executor.getUserVersion();
  } catch (cause) {
    return { ok: false, error: { kind: "open-failed", cause } };
  }

  if (fromVersion > latestVersion) {
    return { ok: false, error: { kind: "newer-than-app", fromVersion, latestVersion } };
  }

  for (const migration of migrations.slice(fromVersion)) {
    try {
      executor.transaction(() => {
        for (const statement of migration.statements) executor.exec(statement);
        executor.exec(`PRAGMA user_version = ${migration.version}`);
      });
    } catch (cause) {
      return {
        ok: false,
        error: { kind: "step-failed", fromVersion, failedVersion: migration.version, cause },
      };
    }
  }

  return { ok: true, fromVersion, toVersion: latestVersion };
}

/**
 * Gentle, jargon-free copy for the boot error screen. Deliberately ignores
 * `cause`: SQL, stack traces and data must never reach the UI (CLAUDE.md §6).
 */
export function describeMigrationError(error: MigrationError): {
  message: string;
  canRetry: boolean;
} {
  if (error.kind === "newer-than-app") {
    return {
      message: "Your data was saved by a newer version of Otto. Please update the app to continue.",
      canRetry: false,
    };
  }
  return {
    message:
      "Otto couldn't finish updating your data. Your information is safe — please try again.",
    canRetry: true,
  };
}
