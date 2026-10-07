import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { getTableConfig } from "drizzle-orm/sqlite-core";
import {
  describeMigrationError,
  runMigrations,
  type Migration,
  type MigrationError,
  type MigrationExecutor,
} from "./migrations";
import { ALL_TABLE_NAMES, LATEST_SCHEMA_VERSION, MIGRATIONS } from "./migration-steps";
import { tables } from "./schema";

/**
 * Test executor over Node's built-in SQLite, mirroring what the expo-sqlite
 * adapter in client.ts does on device: exec, PRAGMA user_version, transaction.
 */
function createNodeSqliteExecutor(db: DatabaseSync): MigrationExecutor {
  return {
    exec: (sql) => db.exec(sql),
    getUserVersion: () =>
      (db.prepare("PRAGMA user_version").get() as { user_version: number }).user_version,
    transaction: (fn) => {
      db.exec("BEGIN");
      try {
        fn();
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
  };
}

function userVersion(db: DatabaseSync): number {
  return (db.prepare("PRAGMA user_version").get() as { user_version: number }).user_version;
}

function tableNames(db: DatabaseSync): string[] {
  return (
    db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all() as {
      name: string;
    }[]
  ).map((r) => r.name);
}

const STEP_A: Migration = { version: 1, name: "a", statements: ["CREATE TABLE a (id TEXT)"] };
const STEP_B: Migration = { version: 2, name: "b", statements: ["CREATE TABLE b (id TEXT)"] };
const FAILING_STEP: Migration = {
  version: 2,
  name: "broken",
  statements: ["CREATE TABLE b (id TEXT)", "THIS IS NOT SQL"],
};

describe("runMigrations (core)", () => {
  it("applies every step on a fresh database and records the version", () => {
    const db = new DatabaseSync(":memory:");
    const result = runMigrations(createNodeSqliteExecutor(db), [STEP_A, STEP_B]);
    expect(result).toEqual({ ok: true, fromVersion: 0, toVersion: 2 });
    expect(userVersion(db)).toBe(2);
    expect(tableNames(db)).toEqual(["a", "b"]);
  });

  it("applies only pending steps", () => {
    const db = new DatabaseSync(":memory:");
    const executor = createNodeSqliteExecutor(db);
    runMigrations(executor, [STEP_A]);
    const result = runMigrations(executor, [STEP_A, STEP_B]);
    expect(result).toEqual({ ok: true, fromVersion: 1, toVersion: 2 });
    expect(tableNames(db)).toEqual(["a", "b"]);
  });

  it("is a no-op when already at the latest version", () => {
    const db = new DatabaseSync(":memory:");
    const executor = createNodeSqliteExecutor(db);
    runMigrations(executor, [STEP_A, STEP_B]);
    const result = runMigrations(executor, [STEP_A, STEP_B]);
    expect(result).toEqual({ ok: true, fromVersion: 2, toVersion: 2 });
  });

  it("rolls back a failing step and keeps the last good version", () => {
    const db = new DatabaseSync(":memory:");
    const result = runMigrations(createNodeSqliteExecutor(db), [STEP_A, FAILING_STEP]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatchObject({ kind: "step-failed", fromVersion: 0, failedVersion: 2 });
    expect(userVersion(db)).toBe(1);
    // Step 2's first statement ran before the failure — it must be rolled back too.
    expect(tableNames(db)).toEqual(["a"]);
  });

  it("does not run steps after a failed one", () => {
    const db = new DatabaseSync(":memory:");
    const stepC: Migration = { version: 3, name: "c", statements: ["CREATE TABLE c (id TEXT)"] };
    const result = runMigrations(createNodeSqliteExecutor(db), [STEP_A, FAILING_STEP, stepC]);
    expect(result.ok).toBe(false);
    expect(tableNames(db)).toEqual(["a"]);
  });

  it("refuses to touch a database saved by a newer app version", () => {
    const db = new DatabaseSync(":memory:");
    db.exec("PRAGMA user_version = 5");
    const result = runMigrations(createNodeSqliteExecutor(db), [STEP_A, STEP_B]);
    expect(result).toMatchObject({
      ok: false,
      error: { kind: "newer-than-app", fromVersion: 5, latestVersion: 2 },
    });
    expect(tableNames(db)).toEqual([]);
    expect(userVersion(db)).toBe(5);
  });

  it("reports an unreadable database as open-failed instead of throwing", () => {
    const executor: MigrationExecutor = {
      exec: () => undefined,
      getUserVersion: () => {
        throw new Error("disk I/O error");
      },
      transaction: (fn) => fn(),
    };
    const result = runMigrations(executor, [STEP_A]);
    expect(result).toMatchObject({ ok: false, error: { kind: "open-failed" } });
  });

  it("rejects a migration list that is not contiguous from 1", () => {
    const db = new DatabaseSync(":memory:");
    const executor = createNodeSqliteExecutor(db);
    expect(() => runMigrations(executor, [STEP_B])).toThrow(/contiguous/);
    expect(() => runMigrations(executor, [STEP_B, STEP_A])).toThrow(/contiguous/);
  });
});

describe("MIGRATIONS (the shipped steps)", () => {
  it("brings a fresh install to the latest version", () => {
    const db = new DatabaseSync(":memory:");
    const result = runMigrations(createNodeSqliteExecutor(db), MIGRATIONS);
    expect(result).toEqual({ ok: true, fromVersion: 0, toVersion: LATEST_SCHEMA_VERSION });
    expect(tableNames(db)).toEqual([...ALL_TABLE_NAMES].sort());
  });

  it("upgrades a pre-migration (v0) install without touching existing rows", () => {
    const db = new DatabaseSync(":memory:");
    // A v0 install: today's tables exist (created by the old ensureSchema) but
    // user_version was never set. Step 1 recreates exactly that schema.
    for (const statement of MIGRATIONS[0]?.statements ?? []) db.exec(statement);
    expect(userVersion(db)).toBe(0);

    const ts = "2026-06-15T08:00:00+08:00";
    db.exec(
      `INSERT INTO transactions VALUES ('t1','u1','CIPHER:abc==','PHP','c1','CIPHER:desc==','${ts}','${ts}','${ts}')`,
    );
    db.exec(
      `INSERT INTO bills VALUES ('b1','u1','Electric','CIPHER:999==','PHP','2026-06-20','{"freq":"monthly"}',0,0,'${ts}','${ts}')`,
    );
    db.exec(
      `INSERT INTO income VALUES ('i1','u1','Salary','CIPHER:500==','PHP','semi-monthly','2026-06-15','${ts}','${ts}')`,
    );
    db.exec(
      `INSERT INTO reminders VALUES ('r1','u1','Call mom',NULL,'${ts}',NULL,NULL,'pending','${ts}','${ts}')`,
    );
    const snapshot = (): unknown[] =>
      ["transactions", "bills", "income", "reminders"].map((t) =>
        db.prepare(`SELECT * FROM ${t}`).all(),
      );
    const before = snapshot();

    const result = runMigrations(createNodeSqliteExecutor(db), MIGRATIONS);

    expect(result).toEqual({ ok: true, fromVersion: 0, toVersion: LATEST_SCHEMA_VERSION });
    expect(snapshot()).toEqual(before);
  });

  it("creates columns that match the Drizzle table definitions", () => {
    const db = new DatabaseSync(":memory:");
    runMigrations(createNodeSqliteExecutor(db), MIGRATIONS);
    for (const table of Object.values(tables)) {
      const config = getTableConfig(table);
      const expected = config.columns.map((c) => c.name).sort();
      const actual = (db.prepare(`PRAGMA table_info(${config.name})`).all() as { name: string }[])
        .map((c) => c.name)
        .sort();
      expect({ table: config.name, columns: actual }).toEqual({
        table: config.name,
        columns: expected,
      });
    }
  });

  it("lists every migrated table for data wipe (DPA erasure)", () => {
    const db = new DatabaseSync(":memory:");
    runMigrations(createNodeSqliteExecutor(db), MIGRATIONS);
    expect([...ALL_TABLE_NAMES].sort()).toEqual(tableNames(db));
  });
});

describe("describeMigrationError (user-facing copy)", () => {
  const sqlCause = new Error(
    'near "THIS": syntax error in CREATE TABLE transactions (amount_minor ...)',
  );
  const cases: MigrationError[] = [
    { kind: "step-failed", fromVersion: 0, failedVersion: 2, cause: sqlCause },
    { kind: "open-failed", cause: sqlCause },
    { kind: "newer-than-app", fromVersion: 5, latestVersion: 2 },
  ];

  it.each(cases)("never exposes SQL or internals ($kind)", (error) => {
    const { message } = describeMigrationError(error);
    expect(message).not.toMatch(/syntax|CREATE|TABLE|transactions|amount_minor|version d/i);
  });

  it("offers a retry for transient failures but not for a newer database", () => {
    expect(describeMigrationError(cases[0]!).canRetry).toBe(true);
    expect(describeMigrationError(cases[1]!).canRetry).toBe(true);
    expect(describeMigrationError(cases[2]!)).toEqual({
      message: "Your data was saved by a newer version of Otto. Please update the app to continue.",
      canRetry: false,
    });
  });
});
