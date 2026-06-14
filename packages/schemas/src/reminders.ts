// Reminders, medications and bills — the things Otto fires at the right moment.
import { z } from "zod";
import {
  idSchema,
  isoDateTimeSchema,
  dateSchema,
  timeOfDaySchema,
  moneySchema,
  recurrenceSchema,
  timestampFields,
} from "./common";

export const reminderStatusSchema = z.enum(["pending", "done", "snoozed", "dismissed"]);
export type ReminderStatus = z.infer<typeof reminderStatusSchema>;

/**
 * A routine-timed reminder. Either pinned to an absolute `dueAt`, or slotted
 * relative to a routine anchor (`anchorId`) so it fires at the right moment.
 */
export const reminderSchema = z.object({
  id: idSchema,
  userId: idSchema,
  title: z.string().min(1).max(140),
  notes: z.string().max(2000).optional(),
  dueAt: isoDateTimeSchema.optional(),
  anchorId: idSchema.optional(),
  recurrence: recurrenceSchema.optional(),
  status: reminderStatusSchema.default("pending"),
  ...timestampFields,
});
export type Reminder = z.infer<typeof reminderSchema>;

/**
 * SENSITIVE (health). A medication schedule. `times` are routine-friendly HH:mm
 * slots; refill tracking powers the Pro med-refill warning.
 */
export const medicationSchema = z.object({
  id: idSchema,
  userId: idSchema,
  name: z.string().min(1).max(140),
  dosage: z.string().max(120).optional(),
  times: z.array(timeOfDaySchema).nonempty(),
  recurrence: recurrenceSchema,
  quantityRemaining: z.number().int().min(0).optional(),
  refillReminderAt: isoDateTimeSchema.optional(),
  ...timestampFields,
});
export type Medication = z.infer<typeof medicationSchema>;

/** SENSITIVE (finance). A recurring or one-off bill with a due date. */
export const billSchema = z.object({
  id: idSchema,
  userId: idSchema,
  name: z.string().min(1).max(140),
  amount: moneySchema,
  dueDate: dateSchema,
  recurrence: recurrenceSchema,
  isAutopay: z.boolean().default(false),
  isPaid: z.boolean().default(false),
  ...timestampFields,
});
export type Bill = z.infer<typeof billSchema>;
