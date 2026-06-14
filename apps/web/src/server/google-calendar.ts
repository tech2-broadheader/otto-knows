import { googleEventsListSchema } from "@otto/core";

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

/** Default PH timezone — Otto is PH-first (CLAUDE.md §0). */
const DEFAULT_TIMEZONE = "Asia/Manila";

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
    return googleEventsListSchema.parse(json).items;
  }
}

/** Default client used by the route in production. */
export const defaultGoogleCalendarClient: GoogleCalendarClient = new FetchGoogleCalendarClient();
