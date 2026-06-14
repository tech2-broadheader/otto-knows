import { describe, expect, it } from "vitest";
import { toCalendarEvents } from "./google-calendar";

const USER = "00000099-1111-4111-8111-111111111111";
const NOW = "2026-06-14T00:00:00+08:00";
// Map any external id onto a valid UUID (the real app uses expo-crypto randomUUID).
const idFor = (_ext: string) => "1a2b3c4d-1111-4111-8111-111111111111";

describe("toCalendarEvents", () => {
  it("maps a timed event to a validated CalendarEvent", () => {
    const events = toCalendarEvents(
      [
        {
          id: "abc123",
          summary: "Dentist",
          location: "Clinic",
          start: { dateTime: "2026-06-14T14:00:00+08:00" },
          end: { dateTime: "2026-06-14T15:00:00+08:00" },
        },
      ],
      USER,
      idFor,
      NOW,
    );
    expect(events).toHaveLength(1);
    expect(events[0]?.provider).toBe("google");
    expect(events[0]?.title).toBe("Dentist");
    expect(events[0]?.externalId).toBe("abc123");
  });

  it("expands all-day events to a PH-midnight instant", () => {
    const events = toCalendarEvents(
      [{ id: "d1", summary: "Holiday", start: { date: "2026-06-12" }, end: { date: "2026-06-13" } }],
      USER,
      idFor,
      NOW,
    );
    expect(events[0]?.startAt).toBe("2026-06-12T00:00:00+08:00");
  });

  it("titles untitled events and skips cancelled / timeless / malformed", () => {
    const events = toCalendarEvents(
      [
        { id: "u1", start: { dateTime: "2026-06-14T09:00:00+08:00" }, end: { dateTime: "2026-06-14T09:30:00+08:00" } },
        { id: "c1", status: "cancelled", start: { dateTime: "2026-06-14T10:00:00+08:00" }, end: { dateTime: "2026-06-14T10:30:00+08:00" } },
        { id: "t1", summary: "No time" },
        { summary: "No id" },
      ],
      USER,
      idFor,
      NOW,
    );
    expect(events).toHaveLength(1);
    expect(events[0]?.title).toBe("(no title)");
  });
});
