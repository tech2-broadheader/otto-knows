// Alarms (story 12.3; ADR-005). A ringing alarm at a time of day, once or on
// chosen weekdays. Not sensitive-tier; stored on device and handed to the
// Android alarm module, which rings it even when Otto is closed.
import { z } from "zod";
import { dayOfWeekSchema, idSchema, timeOfDaySchema, timestampFields } from "./common";

export const ALARM_LABEL_MAX = 60;
export const SNOOZE_MINUTES = [5, 10, 15] as const;

export const alarmSchema = z.object({
  id: idSchema,
  userId: idSchema,
  time: timeOfDaySchema,
  /** Weekdays it repeats on; empty = rings once at the next matching time. */
  repeatDays: z
    .array(dayOfWeekSchema)
    .refine((days) => new Set(days).size === days.length, { message: "Each day once" })
    .default([]),
  label: z.string().trim().min(1).max(ALARM_LABEL_MAX).optional(),
  enabled: z.boolean().default(true),
  vibrate: z.boolean().default(true),
  snoozeMinutes: z
    .number()
    .int()
    .refine((m) => (SNOOZE_MINUTES as readonly number[]).includes(m), {
      message: "Snooze is 5, 10 or 15 minutes",
    })
    .default(5),
  ...timestampFields,
});
export type Alarm = z.infer<typeof alarmSchema>;
