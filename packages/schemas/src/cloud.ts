// Cloud (Pro) records kept in Convex (ADR-008, story 14.1). convex/schema.ts
// mirrors these shapes table for table. Times are epoch milliseconds, the way
// Convex stores them. Free users never get any of these rows (ADR-002).
import { z } from "zod";
import { dateSchema } from "./common";

/** Better Auth user id. Not a UUID, so not idSchema. */
export const cloudUserIdSchema = z.string().min(1).max(128);

/** Epoch milliseconds. */
export const epochMsSchema = z.number().int().nonnegative();

export const entitlementSchema = z.enum(["free", "pro", "lifetime"]);
export type Entitlement = z.infer<typeof entitlementSchema>;

/** One per signed-up user. A missing profile means free. */
export const profileSchema = z.object({
  userId: cloudUserIdSchema,
  entitlement: entitlementSchema,
  updatedAt: epochMsSchema,
});
export type Profile = z.infer<typeof profileSchema>;

export const connectorProviderSchema = z.enum(["google"]);
export type ConnectorProvider = z.infer<typeof connectorProviderSchema>;

/**
 * Connector OAuth tokens, encrypted at rest (story 3.4): AES-256-GCM over the
 * JSON token bundle. Plaintext tokens never reach the database.
 */
export const connectorTokenSchema = z.object({
  userId: cloudUserIdSchema,
  provider: connectorProviderSchema,
  ciphertext: z.string().min(1),
  iv: z.string().min(1),
  keyVersion: z.number().int().positive(),
  expiresAt: epochMsSchema,
  updatedAt: epochMsSchema,
});
export type ConnectorToken = z.infer<typeof connectorTokenSchema>;

/** Sensitive server-side records whose access is audit-logged (Tier 3). */
export const cloudAuditEntitySchema = z.enum(["connector_token", "entitlement", "account"]);

/** Who touched what kind of record and how — never the record's contents. */
export const cloudAuditEventSchema = z.object({
  userId: cloudUserIdSchema,
  entity: cloudAuditEntitySchema,
  /** "read" / "write" / "delete", or an entitlement change such as "set:pro". */
  action: z.string().min(1).max(64),
  at: epochMsSchema,
});
export type CloudAuditEvent = z.infer<typeof cloudAuditEventSchema>;

/**
 * RevenueCat webhook events (story 9.5). The event id makes delivery
 * idempotent; `applied` + `eventAt` stop late events undoing newer ones.
 */
export const billingEventSchema = z.object({
  eventId: z.string().min(1).max(256),
  /** Null for anonymous app users. */
  userId: cloudUserIdSchema.nullable(),
  type: z.string().min(1).max(64),
  eventAt: epochMsSchema,
  applied: z.boolean(),
});
export type BillingEvent = z.infer<typeof billingEventSchema>;

export const llmFeatureSchema = z.enum(["brief", "quick-add", "optimize", "tips"]);
export type LlmFeature = z.infer<typeof llmFeatureSchema>;

/** Metered LLM use: token counts only, never prompt or reply text. */
export const llmUsageEventSchema = z.object({
  userId: cloudUserIdSchema,
  feature: llmFeatureSchema,
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  at: epochMsSchema,
});
export type LlmUsageEvent = z.infer<typeof llmUsageEventSchema>;

/** Free-tier quick-adds used on one day (the user's local date). */
export const quickAddQuotaSchema = z.object({
  userId: cloudUserIdSchema,
  date: dateSchema,
  count: z.number().int().nonnegative(),
});
export type QuickAddQuota = z.infer<typeof quickAddQuotaSchema>;

/** Requests in one fixed rate-limit window. */
export const rateLimitWindowSchema = z.object({
  userId: cloudUserIdSchema,
  windowStart: epochMsSchema,
  count: z.number().int().nonnegative(),
});
export type RateLimitWindow = z.infer<typeof rateLimitWindowSchema>;
