// Notes (story 12.1) — quick plain-text capture next to reminders and budget.
import { z } from "zod";
import { idSchema, timestampFields } from "./common";

export const NOTE_TITLE_MAX = 120;
export const NOTE_BODY_MAX = 10_000;

/** A plain-text note. Not sensitive-tier (same as reminders); stored on device. */
export const noteSchema = z.object({
  id: idSchema,
  userId: idSchema,
  title: z.string().min(1).max(NOTE_TITLE_MAX).optional(),
  body: z.string().min(1).max(NOTE_BODY_MAX),
  pinned: z.boolean().default(false),
  ...timestampFields,
});
export type Note = z.infer<typeof noteSchema>;
