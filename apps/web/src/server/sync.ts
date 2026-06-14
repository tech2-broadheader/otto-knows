import { z } from "zod";
import { idSchema, isoDateTimeSchema } from "@otto/schemas";

/**
 * Cloud backup / cross-device sync (SERVER-ONLY) — STUB.
 *
 * Pro-only (ARCHITECTURE.md §7). The real implementation reconciles the local
 * SQLite store against Supabase Postgres. This stub validates a minimal payload
 * and acknowledges receipt without persisting anything.
 */

/** Minimal sync request: which device, and the last sync watermark. */
export const syncRequestSchema = z.object({
  deviceId: idSchema,
  /** ISO timestamp of the client's last successful sync, if any. */
  lastSyncedAt: isoDateTimeSchema.optional(),
});
export type SyncRequest = z.infer<typeof syncRequestSchema>;

export const syncResponseSchema = z.object({
  status: z.literal("accepted"),
  deviceId: idSchema,
  /** Server timestamp the client should record as its new watermark. */
  syncedAt: isoDateTimeSchema,
  /** Stub never returns changes yet. */
  changes: z.array(z.unknown()),
});
export type SyncResponse = z.infer<typeof syncResponseSchema>;

/**
 * Acknowledge a sync request.
 *
 * TODO(sync): implement real backup/restore reconciliation against Supabase.
 */
export function runSync(_userId: string, request: SyncRequest): SyncResponse {
  return {
    status: "accepted",
    deviceId: request.deviceId,
    syncedAt: "2026-06-14T08:00:00+08:00",
    changes: [],
  };
}
