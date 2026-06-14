// The context graph — every source normalized into one queryable day model.
import { z } from "zod";
import { idSchema, isoDateTimeSchema, timestampFields } from "./common";

/** Where a piece of context originated. Drives consent checks and audit logging. */
export const dataSourceSchema = z.enum([
  "calendar",
  "tasks",
  "events",
  "finance",
  "health",
  "routine",
  "reminder",
]);
export type DataSource = z.infer<typeof dataSourceSchema>;

/** A calendar event read from a connected provider (read-only at first). */
export const calendarEventSchema = z.object({
  id: idSchema,
  userId: idSchema,
  provider: z.enum(["google", "apple"]),
  externalId: z.string().min(1),
  title: z.string().min(1).max(280),
  startAt: isoDateTimeSchema,
  endAt: isoDateTimeSchema,
  location: z.string().max(280).optional(),
  ...timestampFields,
});
export type CalendarEvent = z.infer<typeof calendarEventSchema>;

/** The unified projection kind. Each ContextItem points back at a source entity. */
export const contextItemKindSchema = z.enum([
  "event",
  "reminder",
  "bill",
  "medication",
  "anchor",
  "insight",
]);
export type ContextItemKind = z.infer<typeof contextItemKindSchema>;

/**
 * A normalized item in the context graph. `refId` is the id of the underlying
 * domain entity (reminder, bill, …). `at` is when it lands in the user's day.
 */
export const contextItemSchema = z.object({
  id: idSchema,
  userId: idSchema,
  kind: contextItemKindSchema,
  refId: idSchema,
  source: dataSourceSchema,
  title: z.string().min(1).max(280),
  at: isoDateTimeSchema,
  meta: z.record(z.string(), z.unknown()).optional(),
});
export type ContextItem = z.infer<typeof contextItemSchema>;
