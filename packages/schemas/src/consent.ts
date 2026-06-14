// Consent & audit — the privacy spine (Tier 3 / PH DPA). Nothing reads a source
// without a granted consent record; sensitive-data access writes an audit entry.
import { z } from "zod";
import { idSchema, isoDateTimeSchema } from "./common";
import { dataSourceSchema } from "./context";

/** A granular, revocable consent for one data source. */
export const consentSchema = z
  .object({
    id: idSchema,
    userId: idSchema,
    source: dataSourceSchema,
    granted: z.boolean(),
    purpose: z.string().min(1).max(280),
    policyVersion: z.string().min(1),
    grantedAt: isoDateTimeSchema.optional(),
    revokedAt: isoDateTimeSchema.optional(),
  })
  .refine((c) => !c.granted || !!c.grantedAt, {
    message: "a granted consent must record grantedAt",
    path: ["grantedAt"],
  });
export type Consent = z.infer<typeof consentSchema>;

export const auditActionSchema = z.enum(["read", "write", "export", "delete"]);
export type AuditAction = z.infer<typeof auditActionSchema>;

export const auditActorSchema = z.enum(["user", "system", "caregiver"]);
export type AuditActor = z.infer<typeof auditActorSchema>;

/** An append-only audit record for access to a sensitive entity. */
export const auditEntrySchema = z.object({
  id: idSchema,
  userId: idSchema,
  entity: z.string().min(1),
  entityId: idSchema.optional(),
  action: auditActionSchema,
  actor: auditActorSchema,
  at: isoDateTimeSchema,
  note: z.string().max(500).optional(),
});
export type AuditEntry = z.infer<typeof auditEntrySchema>;

/**
 * Entities holding DPA-sensitive data. Persistence layers MUST encrypt these at
 * rest and audit-log access (CLAUDE.md §6 "Sensitive data", §11).
 */
export const SENSITIVE_ENTITIES = [
  "income",
  "transaction",
  "bill",
  "medication",
  "healthMetric",
] as const;
export type SensitiveEntity = (typeof SENSITIVE_ENTITIES)[number];

/** True if the named entity must be encrypted at rest / audit-logged. */
export function isSensitiveEntity(entity: string): entity is SensitiveEntity {
  return (SENSITIVE_ENTITIES as readonly string[]).includes(entity);
}
