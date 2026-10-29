import type { CloudAuditEvent } from "@otto/schemas";
import type { MutationCtx } from "../_generated/server";

/** Tier 3 audit trail: who, what kind of record and which action — never contents. */
export async function recordAudit(
  ctx: MutationCtx,
  event: Omit<CloudAuditEvent, "at">,
): Promise<void> {
  await ctx.db.insert("auditEvents", { ...event, at: Date.now() });
}
