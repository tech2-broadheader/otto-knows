import { describe, expect, it } from "vitest";
import type { ExportBundle } from "../data/privacy";
import { buildExportFile, exportRecordCount } from "./data-export";

// reason: record contents are irrelevant here; `as never` stands in for full entities
const EMPTY: ExportBundle = {
  settings: null,
  routine: null,
  accounts: [],
  transactions: [],
  budgetCategories: [],
  bills: [],
  income: [],
  reminders: [],
  notes: [],
  appointments: [],
  medications: [],
  consents: [],
  auditLog: [],
};

describe("buildExportFile", () => {
  it("wraps the data with a format tag, version, app version and export time", () => {
    const file = JSON.parse(
      buildExportFile(
        { ...EMPTY, notes: [{ id: "n1" } as never] },
        { appVersion: "0.4.0", exportedAt: "2026-10-08T10:00:00.000Z" },
      ),
    );
    expect(file).toEqual({
      format: "otto-export",
      formatVersion: 1,
      appVersion: "0.4.0",
      exportedAt: "2026-10-08T10:00:00.000Z",
      data: { ...EMPTY, notes: [{ id: "n1" } as never] },
    });
  });
});

describe("exportRecordCount", () => {
  it("counts the records in every list, not the settings or routine", () => {
    expect(exportRecordCount(EMPTY)).toBe(0);
    expect(
      exportRecordCount({
        ...EMPTY,
        settings: { userId: "u" } as never,
        transactions: [{} as never, {} as never],
        auditLog: [{} as never],
      }),
    ).toBe(3);
  });
});
