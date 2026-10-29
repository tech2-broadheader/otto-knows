import { cloudUserIdSchema, connectorProviderSchema, connectorTokenSchema } from "@otto/schemas";
import { zInternalMutation } from "./lib/functions";
import { recordAudit } from "./lib/audit";

/**
 * Encrypted connector tokens (story 3.4, moving to Convex in 14.4). Only
 * ciphertext is stored; encryption and decryption happen in a Node action.
 * Every access is audit-logged, reads included, so reads are mutations.
 */

const AUDIT_ENTITY = "connector_token";

const tokenInput = connectorTokenSchema.omit({ updatedAt: true }).shape;

export const read = zInternalMutation({
  args: { userId: cloudUserIdSchema, provider: connectorProviderSchema },
  handler: async (ctx, { userId, provider }) => {
    const row = await ctx.db
      .query("connectorTokens")
      .withIndex("by_user_provider", (q) => q.eq("userId", userId).eq("provider", provider))
      .unique();
    await recordAudit(ctx, { userId, entity: AUDIT_ENTITY, action: "read" });
    return row
      ? {
          ciphertext: row.ciphertext,
          iv: row.iv,
          keyVersion: row.keyVersion,
          expiresAt: row.expiresAt,
        }
      : null;
  },
});

export const upsert = zInternalMutation({
  args: tokenInput,
  handler: async (ctx, token): Promise<void> => {
    const existing = await ctx.db
      .query("connectorTokens")
      .withIndex("by_user_provider", (q) =>
        q.eq("userId", token.userId).eq("provider", token.provider),
      )
      .unique();
    const row = { ...token, updatedAt: Date.now() };
    if (existing) await ctx.db.replace(existing._id, row);
    else await ctx.db.insert("connectorTokens", row);
    await recordAudit(ctx, { userId: token.userId, entity: AUDIT_ENTITY, action: "write" });
  },
});

export const remove = zInternalMutation({
  args: { userId: cloudUserIdSchema, provider: connectorProviderSchema },
  handler: async (ctx, { userId, provider }): Promise<void> => {
    const existing = await ctx.db
      .query("connectorTokens")
      .withIndex("by_user_provider", (q) => q.eq("userId", userId).eq("provider", provider))
      .unique();
    if (existing) await ctx.db.delete(existing._id);
    await recordAudit(ctx, { userId, entity: AUDIT_ENTITY, action: "delete" });
  },
});
