// The export-my-data file (story 13.6 AC2): the user's records as JSON with a
// format tag and version, so a later Otto (or the user) can tell what it is.
// PURE — unit-tested.
import type { ExportBundle } from "../data/privacy";

export const EXPORT_FORMAT = "otto-export";
export const EXPORT_FORMAT_VERSION = 1;

/** The JSON text of an export, pretty-printed so it is readable by a person. */
export function buildExportFile(
  bundle: ExportBundle,
  meta: { appVersion: string; exportedAt: string },
): string {
  return JSON.stringify(
    {
      format: EXPORT_FORMAT,
      formatVersion: EXPORT_FORMAT_VERSION,
      appVersion: meta.appVersion,
      exportedAt: meta.exportedAt,
      data: bundle,
    },
    null,
    2,
  );
}

/** How many records the export holds (every list; settings and routine aside). */
export function exportRecordCount(bundle: ExportBundle): number {
  return Object.values(bundle).reduce<number>(
    (sum, value) => sum + (Array.isArray(value) ? value.length : 0),
    0,
  );
}
