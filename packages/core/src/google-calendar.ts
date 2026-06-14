// Pure Google Calendar normalization — shared by the web connector (server fetch)
// and the on-device mobile connector. The platform-specific fetch/OAuth lives in
// each app; only this trust-no-input mapping is shared (CLAUDE.md §6, §11).
import { z } from "zod";
import { calendarEventSchema, type CalendarEvent } from "@otto/schemas";

/**
 * Start/end of a Google event: EITHER `dateTime` (timed, RFC3339 w/ offset) OR
 * `date` (all-day, YYYY-MM-DD).
 */
const googleDateSchema = z.object({
  dateTime: z.string().min(1).optional(),
  date: z.string().min(1).optional(),
  timeZone: z.string().optional(),
});

/** The subset of a Google Calendar event we consume; extra fields pass through. */
export const googleEventSchema = z
  .object({
    id: z.string().min(1),
    status: z.string().optional(),
    summary: z.string().optional(),
    location: z.string().optional(),
    start: googleDateSchema.optional(),
    end: googleDateSchema.optional(),
  })
  .passthrough();
export type GoogleEvent = z.infer<typeof googleEventSchema>;

/** Google's `events.list` envelope. Only `items` is required by us. */
export const googleEventsListSchema = z
  .object({
    items: z.array(z.unknown()).default([]),
  })
  .passthrough();

/** Produces the synthetic `CalendarEvent.id` (a UUID) from the Google externalId. */
export type CalendarIdFactory = (externalId: string) => string;

/** All-day events carry only `date`; expand to PH midnight so it is a valid offset datetime. */
const ALL_DAY_OFFSET = "+08:00";

function resolveInstant(slot: GoogleEvent["start"]): string | undefined {
  if (slot?.dateTime) return slot.dateTime;
  if (slot?.date) return `${slot.date}T00:00:00${ALL_DAY_OFFSET}`;
  return undefined;
}

/**
 * PURE normalizer: RAW Google event JSON → validated `CalendarEvent[]` (provider
 * "google"). Each item is parsed against `googleEventSchema` then
 * `calendarEventSchema`; an item that fails either, is missing a usable
 * start/end, or is `cancelled` is SKIPPED — one bad event never sinks the day.
 */
export function toCalendarEvents(
  googleEvents: readonly unknown[],
  userId: string,
  idFactory: CalendarIdFactory,
  now: string = new Date().toISOString(),
): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  for (const raw of googleEvents) {
    const parsed = googleEventSchema.safeParse(raw);
    if (!parsed.success) continue;
    const event = parsed.data;
    if (event.status === "cancelled") continue;

    const startAt = resolveInstant(event.start);
    const endAt = resolveInstant(event.end);
    if (!startAt || !endAt) continue;

    const candidate = {
      id: idFactory(event.id),
      userId,
      provider: "google" as const,
      externalId: event.id,
      title: event.summary?.trim() || "(no title)",
      startAt,
      endAt,
      ...(event.location ? { location: event.location } : {}),
      createdAt: now,
      updatedAt: now,
    };

    const validated = calendarEventSchema.safeParse(candidate);
    if (validated.success) events.push(validated.data);
  }

  return events;
}
