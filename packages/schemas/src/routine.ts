// The routine layer — the lens through which every other domain is timed.
import { z } from "zod";
import { idSchema, recurrenceSchema, timeOfDaySchema, timezoneSchema, timestampFields } from "./common";

/** The kind of anchor, used for seeding defaults and for the timing engine. */
export const routineAnchorKindSchema = z.enum([
  "wake",
  "meds",
  "meal",
  "work",
  "exercise",
  "wind-down",
  "sleep",
  "custom",
]);
export type RoutineAnchorKind = z.infer<typeof routineAnchorKindSchema>;

/** A single recurring moment in the user's day (e.g. "lunch at 12:30"). */
export const routineAnchorSchema = z.object({
  id: idSchema,
  label: z.string().min(1).max(80),
  kind: routineAnchorKindSchema,
  time: timeOfDaySchema,
  recurrence: recurrenceSchema,
  ...timestampFields,
});
export type RoutineAnchor = z.infer<typeof routineAnchorSchema>;

/** Free tier = fixed (seeded, doesn't learn). Pro = adaptive (learns real rhythm). */
export const routineModeSchema = z.enum(["fixed", "adaptive"]);
export type RoutineMode = z.infer<typeof routineModeSchema>;

/** The model of the user's day. All scheduling and proactivity reads from this. */
export const routineSchema = z.object({
  id: idSchema,
  userId: idSchema,
  mode: routineModeSchema.default("fixed"),
  timezone: timezoneSchema,
  anchors: z.array(routineAnchorSchema),
  ...timestampFields,
});
export type Routine = z.infer<typeof routineSchema>;
