// Appointments (story 12.4) — user-created events, stored apart from synced
// provider events so a calendar sync can never delete them.
import { z } from "zod";
import { idSchema, isoDateTimeSchema, timestampFields } from "./common";

export const APPOINTMENT_TITLE_MAX = 140;
export const APPOINTMENT_NOTES_MAX = 2000;
/** Longest "remind me before" lead time: one week. */
export const REMIND_BEFORE_MAX_MINUTES = 7 * 24 * 60;

/** Where the appointment is written: Otto only now; device / Google later in 12.4. */
export const appointmentDestinationSchema = z.enum(["otto", "device", "google"]);
export type AppointmentDestination = z.infer<typeof appointmentDestinationSchema>;

const remindMinutesBefore = z.number().int().min(0).max(REMIND_BEFORE_MAX_MINUTES);

export const appointmentSchema = z
  .object({
    id: idSchema,
    userId: idSchema,
    title: z.string().min(1).max(APPOINTMENT_TITLE_MAX),
    startAt: isoDateTimeSchema,
    endAt: isoDateTimeSchema,
    location: z.string().min(1).max(280).optional(),
    notes: z.string().min(1).max(APPOINTMENT_NOTES_MAX).optional(),
    remindMinutesBefore: remindMinutesBefore.optional(),
    destination: appointmentDestinationSchema.default("otto"),
    /** The provider's event id once written to a device / Google calendar. */
    externalId: z.string().min(1).optional(),
    ...timestampFields,
  })
  .refine((a) => Date.parse(a.endAt) > Date.parse(a.startAt), {
    message: "an appointment must end after it starts",
    path: ["endAt"],
  });
export type Appointment = z.infer<typeof appointmentSchema>;

/** What the LLM / quick-add proposes: an end time or a duration. */
export const eventDraftSchema = z
  .object({
    title: z.string().min(1).max(APPOINTMENT_TITLE_MAX),
    startAt: isoDateTimeSchema,
    endAt: isoDateTimeSchema.optional(),
    durationMinutes: z
      .number()
      .int()
      .positive()
      .max(24 * 60)
      .optional(),
    location: z.string().min(1).max(280).optional(),
    notes: z.string().min(1).max(APPOINTMENT_NOTES_MAX).optional(),
    remindMinutesBefore: remindMinutesBefore.optional(),
  })
  .refine((d) => d.endAt !== undefined || d.durationMinutes !== undefined, {
    message: "give an end time or a duration",
    path: ["durationMinutes"],
  });
export type EventDraft = z.infer<typeof eventDraftSchema>;
