import { defineSchema, defineTable } from "convex/server";
import { zodToConvexFields } from "convex-helpers/server/zod3";
import {
  billingEventSchema,
  cloudAuditEventSchema,
  connectorTokenSchema,
  llmUsageEventSchema,
  profileSchema,
  quickAddQuotaSchema,
  rateLimitWindowSchema,
} from "@otto/schemas";

/**
 * Pro cloud tables (ADR-008, story 14.1). Every table is generated from its
 * Zod contract in @otto/schemas, so the database and the app can't drift.
 * Better Auth keeps its own user/session tables in its component (story 14.2);
 * `userId` here is the Better Auth user id.
 */
export default defineSchema({
  profiles: defineTable(zodToConvexFields(profileSchema.shape)).index("by_user", ["userId"]),

  connectorTokens: defineTable(zodToConvexFields(connectorTokenSchema.shape)).index(
    "by_user_provider",
    ["userId", "provider"],
  ),

  auditEvents: defineTable(zodToConvexFields(cloudAuditEventSchema.shape)).index("by_user", [
    "userId",
  ]),

  billingEvents: defineTable(zodToConvexFields(billingEventSchema.shape))
    .index("by_event", ["eventId"])
    .index("by_user_applied", ["userId", "applied", "eventAt"]),

  llmUsage: defineTable(zodToConvexFields(llmUsageEventSchema.shape)).index("by_user", [
    "userId",
    "at",
  ]),

  quickAddQuota: defineTable(zodToConvexFields(quickAddQuotaSchema.shape)).index("by_user_date", [
    "userId",
    "date",
  ]),

  rateLimits: defineTable(zodToConvexFields(rateLimitWindowSchema.shape)).index("by_user", [
    "userId",
  ]),
});
