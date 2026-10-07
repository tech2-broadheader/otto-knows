import { describe, expect, it } from "vitest";
import type { Appointment } from "@otto/schemas";
import { addMinutesToIso } from "./appointments";
import { whatsOnToday } from "./context-graph";

describe("addMinutesToIso", () => {
  it("adds minutes and keeps the original UTC offset", () => {
    expect(addMinutesToIso("2026-10-13T15:00:00+08:00", 45)).toBe("2026-10-13T15:45:00+08:00");
  });

  it("subtracts minutes across midnight and month ends", () => {
    expect(addMinutesToIso("2026-11-01T00:30:00+08:00", -60)).toBe("2026-10-31T23:30:00+08:00");
  });

  it("handles negative offsets and Z", () => {
    expect(addMinutesToIso("2026-10-13T23:30:00-05:00", 60)).toBe("2026-10-14T00:30:00-05:00");
    expect(addMinutesToIso("2026-10-13T23:30:00Z", 60)).toBe("2026-10-14T00:30:00+00:00");
  });
});

describe("whatsOnToday with appointments", () => {
  const USER = "00000000-0000-4000-8000-000000000001";
  const appt = (id: string, startAt: string): Appointment => ({
    id,
    userId: USER,
    title: `Appt ${id.slice(-1)}`,
    startAt,
    endAt: addMinutesToIso(startAt, 60),
    location: "Makati",
    destination: "otto",
    createdAt: startAt,
    updatedAt: startAt,
  });

  it("shows only appointments on that day, as events", () => {
    const today = appt("00000000-0000-4000-8000-0000000000a1", "2026-10-13T15:00:00+08:00");
    const tomorrow = appt("00000000-0000-4000-8000-0000000000a2", "2026-10-14T09:00:00+08:00");
    const items = whatsOnToday(
      { appointments: [today, tomorrow] },
      { userId: USER, date: "2026-10-13", utcOffset: "+08:00" },
      () => "00000000-0000-4000-8000-0000000000ff",
    );
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      kind: "event",
      refId: today.id,
      title: "Appt 1",
      at: today.startAt,
      meta: { location: "Makati", appointment: true },
    });
  });
});
