import { billingEventSchema, cloudUserIdSchema } from "@otto/schemas";
import { zInternalMutation, zInternalQuery } from "./lib/functions";

/**
 * RevenueCat event log (story 9.5, moving to Convex in 14.5). RevenueCat
 * delivers at least once, so the event id makes recording idempotent.
 */

const eventInput = billingEventSchema.omit({ applied: true }).shape;

export const recordEvent = zInternalMutation({
  args: eventInput,
  handler: async (ctx, event): Promise<"new" | "duplicate"> => {
    const seen = await ctx.db
      .query("billingEvents")
      .withIndex("by_event", (q) => q.eq("eventId", event.eventId))
      .unique();
    if (seen) return "duplicate";
    await ctx.db.insert("billingEvents", { ...event, applied: false });
    return "new";
  },
});

/** When the newest applied event happened, so late deliveries can't undo it. */
export const lastAppliedAt = zInternalQuery({
  args: { userId: cloudUserIdSchema },
  handler: async (ctx, { userId }): Promise<number | null> => {
    const latest = await ctx.db
      .query("billingEvents")
      .withIndex("by_user_applied", (q) => q.eq("userId", userId).eq("applied", true))
      .order("desc")
      .first();
    return latest?.eventAt ?? null;
  },
});

export const markApplied = zInternalMutation({
  args: { eventId: billingEventSchema.shape.eventId },
  handler: async (ctx, { eventId }): Promise<void> => {
    const event = await ctx.db
      .query("billingEvents")
      .withIndex("by_event", (q) => q.eq("eventId", eventId))
      .unique();
    if (!event) throw new Error("Unknown billing event");
    await ctx.db.patch(event._id, { applied: true });
  },
});
