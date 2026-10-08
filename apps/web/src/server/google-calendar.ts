import { googleEventsListSchema } from "@otto/core";
import { DEFAULT_TIMEZONE, localClock } from "./llm/time";

/**
 * Google Calendar connector (SERVER-ONLY) — Story 3.1 backend.
 *
 * The PURE normalizer + Google event schemas now live in `@otto/core`
 * (`toCalendarEvents`, `googleEventSchema`, `googleEventsListSchema`) so the web
 * connector and the on-device mobile connector share one trusted mapping. This
 * file keeps only the server-side `fetch` client. Re-export the shared pieces so
 * existing importers (routes, tests) keep working.
 */
export {
  googleEventSchema,
  googleEventsListSchema,
  toCalendarEvents,
  type GoogleEvent,
  type CalendarIdFactory as IdFactory,
} from "@otto/core";

const CALENDAR_EVENTS_ENDPOINT = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

function offsetMinutes(offset: string): number {
  const sign = offset.startsWith("-") ? -1 : 1;
  const [h, m] = offset.slice(1).split(":").map(Number);
  return sign * ((h ?? 0) * 60 + (m ?? 0));
}

/** The UTC offset in force at local midnight of `date` in `timezone`. */
function midnightOffset(date: string, timezone: string): string {
  const utcMidnight = Date.parse(`${date}T00:00:00Z`);
  const guess = localClock(new Date(utcMidnight).toISOString(), timezone).offset;
  const instant = utcMidnight - offsetMinutes(guess) * 60_000;
  return localClock(new Date(instant).toISOString(), timezone).offset;
}

/**
 * The user's local day as an events.list window: midnight to the next midnight
 * (exclusive), each with its own UTC offset, as Google's API expects (story 13.2).
 */
export function dayWindow(date: string, timezone: string): { timeMin: string; timeMax: string } {
  const next = new Date(Date.parse(`${date}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
  return {
    timeMin: `${date}T00:00:00${midnightOffset(date, timezone)}`,
    timeMax: `${next}T00:00:00${midnightOffset(next, timezone)}`,
  };
}

/**
 * Reads calendar events for a given day on behalf of a user, using a bearer
 * access token. An interface so routes can inject a stub in tests (no network).
 */
export interface GoogleCalendarClient {
  /**
   * @param accessToken - the user's Google OAuth access token (read-only scope).
   * @param date - the day to fetch, YYYY-MM-DD (interpreted in `timezone`).
   * @param timezone - the user's IANA timezone bounding the day window
   *   (Asia/Manila for older apps that send none).
   * @returns the RAW Google event objects (unvalidated) for that day.
   */
  listEventsForDay(accessToken: string, date: string, timezone?: string): Promise<unknown[]>;
}

/**
 * `fetch`-based `GoogleCalendarClient`. Calls Calendar `events.list` for the day
 * window with the bearer token. Throws on transport/HTTP failure so the route
 * maps it to a 500/UNAUTHORIZED envelope; never logs the token.
 */
export class FetchGoogleCalendarClient implements GoogleCalendarClient {
  async listEventsForDay(
    accessToken: string,
    date: string,
    timezone: string = DEFAULT_TIMEZONE,
  ): Promise<unknown[]> {
    const { timeMin, timeMax } = dayWindow(date, timezone);
    const params = new URLSearchParams({
      timeMin,
      timeMax,
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
    return googleEventsListSchema.parse(json).items;
  }
}

/** Default client used by the route in production. */
export const defaultGoogleCalendarClient: GoogleCalendarClient = new FetchGoogleCalendarClient();
