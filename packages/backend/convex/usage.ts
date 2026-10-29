import { cloudUserIdSchema, dateSchema, llmUsageEventSchema } from "@otto/schemas";
import { zInternalMutation } from "./lib/functions";

/**
 * LLM metering, rate limits and the free quick-add quota, stored in Convex so
 * they survive restarts and are shared across instances (replaces the web's
 * in-memory meter; wired into the LLM actions in story 14.3).
 */

/** Free-tier daily quick-add allowance (spec §8 "small daily quota"). */
export const FREE_QUICK_ADD_DAILY = 5;
export const RATE_WINDOW_MS = 60_000;
export const RATE_MAX_PER_WINDOW = 20;

/** Uses one free quick-add for the user's local date, if any are left. */
export const consumeQuickAdd = zInternalMutation({
  args: { userId: cloudUserIdSchema, date: dateSchema },
  handler: async (ctx, { userId, date }): Promise<{ allowed: boolean; remaining: number }> => {
    const entry = await ctx.db
      .query("quickAddQuota")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", date))
      .unique();
    const used = entry?.count ?? 0;
    if (used >= FREE_QUICK_ADD_DAILY) return { allowed: false, remaining: 0 };
    if (entry) await ctx.db.patch(entry._id, { count: used + 1 });
    else await ctx.db.insert("quickAddQuota", { userId, date, count: 1 });
    return { allowed: true, remaining: FREE_QUICK_ADD_DAILY - used - 1 };
  },
});

/** Fixed-window limit on LLM requests per user. Records the hit when allowed. */
export const checkRateLimit = zInternalMutation({
  args: { userId: cloudUserIdSchema },
  handler: async (ctx, { userId }): Promise<boolean> => {
    const now = Date.now();
    const windowStart = now - (now % RATE_WINDOW_MS);
    const entry = await ctx.db
      .query("rateLimits")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!entry || entry.windowStart !== windowStart) {
      if (entry) await ctx.db.replace(entry._id, { userId, windowStart, count: 1 });
      else await ctx.db.insert("rateLimits", { userId, windowStart, count: 1 });
      return true;
    }
    if (entry.count >= RATE_MAX_PER_WINDOW) return false;
    await ctx.db.patch(entry._id, { count: entry.count + 1 });
    return true;
  },
});

/** Token counts only — never prompt or reply text. */
export const recordUsage = zInternalMutation({
  args: llmUsageEventSchema.omit({ at: true }).shape,
  handler: async (ctx, usage): Promise<void> => {
    await ctx.db.insert("llmUsage", { ...usage, at: Date.now() });
  },
});
