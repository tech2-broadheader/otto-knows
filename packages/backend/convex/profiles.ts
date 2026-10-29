import { cloudUserIdSchema, entitlementSchema, type Entitlement } from "@otto/schemas";
import { zInternalMutation, zInternalQuery } from "./lib/functions";
import { recordAudit } from "./lib/audit";

/** The user's tier. No profile means free (the free tier is local-first, ADR-002). */
export const getEntitlement = zInternalQuery({
  args: { userId: cloudUserIdSchema },
  handler: async (ctx, { userId }): Promise<Entitlement> => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    return profile?.entitlement ?? "free";
  },
});

/** Only the verified billing webhook sets this (story 14.5). Audit-logged. */
export const setEntitlement = zInternalMutation({
  args: { userId: cloudUserIdSchema, entitlement: entitlementSchema },
  handler: async (ctx, { userId, entitlement }): Promise<void> => {
    const updatedAt = Date.now();
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (existing) await ctx.db.patch(existing._id, { entitlement, updatedAt });
    else await ctx.db.insert("profiles", { userId, entitlement, updatedAt });
    await recordAudit(ctx, { userId, entity: "entitlement", action: `set:${entitlement}` });
  },
});
