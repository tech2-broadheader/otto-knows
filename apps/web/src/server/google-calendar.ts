import { z } from "zod";
import { calendarEventSchema, type CalendarEvent } from "@otto/schemas";

/**
 * Google Calendar connector (SERVER-ONLY) — Story 3.1 backend.
 *
 * A thin `fetch`-based client over Calendar `events.list` (no `googleapis`
 * dependency) plus a PURE normalizer that maps Google's event JSON onto our
 * shared `CalendarEvent` contract. Every external shape is validated with Zod
 * at the boundary — we never trust Google's JSON (CLAUDE.md §6, §11).
 */

const CALENDAR_EVENTS_ENDPOINT = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

/**
 * The subset of a Google Calendar event we consume. Marked `passthrough` so
 * unexpected extra fields don't fail parsing — we only assert the shape we use.
 * `start`/`end` carry EITHER `dateTime` (timed) OR `date` (all-day).
 */
const googleDateSchema = z.object({
  dateTime: z.string().min(1).optional(),
  date: z.string().min(1).optional(),
  timeZone: z.string().optional(),
});

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

/** Factory for the synthetic `CalendarEvent.id` (a UUID). Injected for testability. */
export type IdFactory = (externalId: string) => string;

/**
 * Reads calendar events for a given day on behalf of a user, using a bearer
 * access token. An interface so routes can inject a stub in tests (no network).
 */
export interface GoogleCalendarClient {
  /**
   * @param accessToken - the user's Google OAuth access token (read-only scope).
   * @param date - the day to fetch, YYYY-MM-DD (interpreted in `timezone`).
   * @param timezone - IANA timezone bounding the day window (defaults to Asia/Manila).
   * @returns the RAW Google event objects (unvalidated) for that day.
   */
  listEventsForDay(accessToken: string, date: string, timezone?: string): Promise<unknown[]>;
}

/** Default PH timezone — Otto is PH-first (CLAUDE.md §0). */
const DEFAULT_TIMEZONE = "Asia/Manila";

/**
 * `fetch`-based `GoogleCalendarClient`. Calls Calendar `events.list` for the
 * day window with the bearer token. Throws on transport/HTTP failure so the
 * route maps it to a 500/UNAUTHORIZED envelope; never logs the token.
 */
export class FetchGoogleCalendarClient implements GoogleCalendarClient {
  async listEventsForDay(
    accessToken: string,
    date: string,
    timezone: string = DEFAULT_TIMEZONE,
  ): Promise<unknown[]> {
    // Day window as RFC3339 instants. The offset is left to Google via timeZone;
    // we pass local midnight bounds and let single-day filtering do the rest.
    const params = new URLSearchParams({
      timeMin: `${date}T00:00:00`,
      timeMax: `${date}T23:59:59`,
      timeZone: timezone,
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "250",
    });

    const response = await fetch(`${CALENDAR_EVENTS_ENDPOINT}?${params.toString()}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error(`Google Calendar events.list failed (status ${response.status}).`);
    }

    const json: unknown = await response.json();
    const parsed = googleEventsListSchema.parse(json);
    return parsed.items;
  }
}

/** Default client used by the route in production. */
export const defaultGoogleCalendarClient: GoogleCalendarClient = new FetchGoogleCalendarClient();

/**
 * Resolve a Google start/end into an ISO-8601 datetime WITH offset, the form
 * `calendarEventSchema` requires.
 *
 * - Timed events carry `dateTime` already in RFC3339 with offset → used as-is.
 * - All-day events carry only `date` (YYYY-MM-DD) → expanded to a midnight
 *   instant. We append `+08:00` (PH) so it is a valid offset datetime; this is
 *   a deliberate normalization choice for all-day events (documented).
 *
 * Returns `undefined` when neither field is present so the caller can skip the
 * event rather than fabricate a time.
 */
function resolveInstant(
  slot: GoogleEvent["start"],
  allDayEndExclusive = false,
): string | undefined {
  if (slot?.dateTime) {
    return slot.dateTime;
  }
  if (slot?.date) {
    // All-day: midnight in PH time. End dates from Google are EXCLUSIVE; we keep
    // the same date boundary at midnight (good enough for the read-only briefing).
    void allDayEndExclusive;
    return `${slot.date}T00:00:00+08:00`;
  }
  return undefined;
}

/**
 * PURE normalizer: map RAW Google event JSON → validated `CalendarEvent[]`
 * (provider "google"). This is the unit-tested core.
 *
 * Policy on malformed events: each item is parsed against `googleEventSchema`
 * and then `calendarEventSchema`. An item that fails either parse — or that is
 * missing a usable start/end, or is `status: "cancelled"` — is SKIPPED, not
 * thrown. One bad event must never sink the whole day's read.
 *
 * @param googleEvents - raw items from `events.list` (untrusted).
 * @param userId - the authenticated owner, stamped onto each event.
 * @param idFactory - produces the synthetic UUID id from the Google externalId.
 * @param now - injected timestamp for deterministic createdAt/updatedAt in tests.
 */
export function toCalendarEvents(
  googleEvents: unknown[],
  userId: string,
  idFactory: IdFactory,
  now: string = new Date().toISOString(),
): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  for (const raw of googleEvents) {
    const parsedGoogle = googleEventSchema.safeParse(raw);
    if (!parsedGoogle.success) {
      // Malformed shape — skip per documented policy.
      continue;
    }
    const event = parsedGoogle.data;

    if (event.status === "cancelled") {
      continue;
    }

    const startAt = resolveInstant(event.start);
    const endAt = resolveInstant(event.end, true);
    if (!startAt || !endAt) {
      // No usable time window — skip rather than fabricate one.
      continue;
    }

    const candidate = {
      id: idFactory(event.id),
      userId,
      provider: "google" as const,
      externalId: event.id,
      // Google allows untitled events; our schema requires a non-empty title.
      title: event.summary?.trim() || "(no title)",
      startAt,
      endAt,
      ...(event.location ? { location: event.location } : {}),
      createdAt: now,
      updatedAt: now,
    };

    const validated = calendarEventSchema.safeParse(candidate);
    if (!validated.success) {
      // Could not satisfy our contract (e.g. non-offset datetime) — skip.
      continue;
    }
    events.push(validated.data);
  }

  return events;
}
