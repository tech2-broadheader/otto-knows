import { describe, expect, it } from "vitest";
import { calendarEventSchema } from "@otto/schemas";
import { dayWindow, toCalendarEvents, type IdFactory } from "@/server/google-calendar";

/**
 * Unit tests for the PURE `toCalendarEvents` normalizer (Story 3.1).
 * No network: we feed raw Google event JSON in and assert the mapping +
 * documented skip policy. Deterministic id factory + `now` keep output stable.
 */

const USER_ID = "11111111-1111-4111-8111-111111111111";
const NOW = "2026-06-14T08:00:00+08:00";

// Deterministic, VALID UUIDs: hash the externalId to hex digits for the node
// segment so the synthetic id always satisfies `idSchema` (uuid).
const idFactory: IdFactory = (externalId) => {
  let hex = "";
  for (const char of externalId) {
    hex += char.charCodeAt(0).toString(16);
  }
  const node = (hex + "000000000000").slice(0, 12);
  return `00000000-0000-4000-8000-${node}`;
};

describe("toCalendarEvents() — valid mapping", () => {
  it("maps a timed Google event onto a validated CalendarEvent (provider google)", () => {
    const raw = [
      {
        id: "evt-1",
        summary: "Standup",
        location: "Zoom",
        start: { dateTime: "2026-06-14T09:00:00+08:00" },
        end: { dateTime: "2026-06-14T09:15:00+08:00" },
      },
    ];

    const events = toCalendarEvents(raw, USER_ID, idFactory, NOW);

    expect(events).toHaveLength(1);
    const [event] = events;
    expect(event).toBeDefined();
    if (!event) return;
    expect(event.provider).toBe("google");
    expect(event.externalId).toBe("evt-1");
    expect(event.userId).toBe(USER_ID);
    expect(event.title).toBe("Standup");
    expect(event.location).toBe("Zoom");
    expect(event.startAt).toBe("2026-06-14T09:00:00+08:00");
    expect(event.endAt).toBe("2026-06-14T09:15:00+08:00");
    // Output satisfies the shared contract.
    expect(calendarEventSchema.safeParse(event).success).toBe(true);
  });

  it("falls back to a placeholder title for an untitled event", () => {
    const raw = [
      {
        id: "evt-untitled",
        start: { dateTime: "2026-06-14T10:00:00+08:00" },
        end: { dateTime: "2026-06-14T11:00:00+08:00" },
      },
    ];
    const [event] = toCalendarEvents(raw, USER_ID, idFactory, NOW);
    expect(event?.title).toBe("(no title)");
  });
});

describe("toCalendarEvents() — all-day vs timed", () => {
  it("expands an all-day event (date only) to an offset midnight instant", () => {
    const raw = [
      {
        id: "evt-allday",
        summary: "Holiday",
        start: { date: "2026-06-14" },
        end: { date: "2026-06-15" },
      },
    ];

    const [event] = toCalendarEvents(raw, USER_ID, idFactory, NOW);
    expect(event?.startAt).toBe("2026-06-14T00:00:00+08:00");
    expect(event?.endAt).toBe("2026-06-15T00:00:00+08:00");
    expect(calendarEventSchema.safeParse(event).success).toBe(true);
  });
});

describe("toCalendarEvents() — skip policy (malformed / unusable)", () => {
  it("skips an event missing an id (fails googleEventSchema)", () => {
    const raw = [
      {
        summary: "No id here",
        start: { dateTime: "2026-06-14T09:00:00+08:00" },
        end: { dateTime: "2026-06-14T10:00:00+08:00" },
      },
    ];
    expect(toCalendarEvents(raw, USER_ID, idFactory, NOW)).toHaveLength(0);
  });

  it("skips an event with no usable start/end window", () => {
    const raw = [{ id: "evt-no-time", summary: "Floating" }];
    expect(toCalendarEvents(raw, USER_ID, idFactory, NOW)).toHaveLength(0);
  });

  it("skips a cancelled event", () => {
    const raw = [
      {
        id: "evt-cancelled",
        status: "cancelled",
        summary: "Old meeting",
        start: { dateTime: "2026-06-14T09:00:00+08:00" },
        end: { dateTime: "2026-06-14T10:00:00+08:00" },
      },
    ];
    expect(toCalendarEvents(raw, USER_ID, idFactory, NOW)).toHaveLength(0);
  });

  it("keeps the good events and skips only the bad ones in a mixed batch", () => {
    const raw = [
      {
        id: "good-1",
        summary: "Keep me",
        start: { dateTime: "2026-06-14T09:00:00+08:00" },
        end: { dateTime: "2026-06-14T10:00:00+08:00" },
      },
      { id: "bad-1" }, // no time window
      "not-an-object", // not even an object
      {
        id: "good-2",
        summary: "Keep me too",
        start: { date: "2026-06-14" },
        end: { date: "2026-06-15" },
      },
    ];
    const events = toCalendarEvents(raw, USER_ID, idFactory, NOW);
    expect(events.map((event) => event.externalId)).toEqual(["good-1", "good-2"]);
  });
});

describe("dayWindow (story 13.2)", () => {
  it("bounds the user's local day with explicit offsets, end exclusive", () => {
    expect(dayWindow("2026-06-15", "America/New_York")).toEqual({
      timeMin: "2026-06-15T00:00:00-04:00",
      timeMax: "2026-06-16T00:00:00-04:00",
    });
    expect(dayWindow("2026-12-31", "Asia/Manila")).toEqual({
      timeMin: "2026-12-31T00:00:00+08:00",
      timeMax: "2027-01-01T00:00:00+08:00",
    });
  });

  it("follows a daylight-saving change across the day (London, 29 March 2026)", () => {
    expect(dayWindow("2026-03-29", "Europe/London")).toEqual({
      timeMin: "2026-03-29T00:00:00+00:00",
      timeMax: "2026-03-30T00:00:00+01:00",
    });
  });
});
