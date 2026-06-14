// Audit logging decision logic (story 1.4 AC3; CLAUDE.md §6, §11).
//
// "Should this access be audited?" and "build the audit entry for it" are PURE
// functions so they are testable in Node. The repository layer calls
// shouldAudit() and, when true, persists buildAuditEntry(...) to audit_entries.
import { isSensitiveEntity } from "@otto/schemas";
import type { AuditAction, AuditActor, AuditEntry } from "@otto/schemas";

/**
 * PURE. Any access (read/write/export/delete) to a SENSITIVE entity must be
 * audited (income, transaction, bill, medication, healthMetric).
 */
export function shouldAudit(entity: string): boolean {
  return isSensitiveEntity(entity);
}

/** Inputs needed to construct an audit entry. */
export interface AuditContext {
  id: string;
  userId: string;
  entity: string;
  entityId?: string;
  action: AuditAction;
  actor: AuditActor;
  at: string;
  note?: string;
}

/**
 * PURE. Build a well-formed AuditEntry from context. Returns the object shape
 * matching AuditEntrySchema; the repository validates + persists it.
 */
export function buildAuditEntry(ctx: AuditContext): AuditEntry {
  return {
    id: ctx.id,
    userId: ctx.userId,
    entity: ctx.entity,
    entityId: ctx.entityId,
    action: ctx.action,
    actor: ctx.actor,
    at: ctx.at,
    note: ctx.note,
  };
}
