import { describe, expect, it } from "vitest";
import { currentTimeContext, localClock, resolveTimezone } from "./time";

describe("localClock", () => {
  it("reads an instant as wall-clock date, time, weekday and offset in the user's timezone", () => {
    // 03:00Z on Tue 16 June 2026.
    expect(localClock("2026-06-16T03:00:00.000Z", "Asia/Manila")).toEqual({
      date: "2026-06-16",
      time: "11:00:00",
      weekday: "Tuesday",
      offset: "+08:00",
    });
    // New York is on daylight time in June (UTC−4): still Monday evening.
    expect(localClock("2026-06-16T03:00:00.000Z", "America/New_York")).toEqual({
      date: "2026-06-15",
      time: "23:00:00",
      weekday: "Monday",
      offset: "-04:00",
    });
    // London in winter is UTC+00:00.
    expect(localClock("2026-01-10T09:30:00.000Z", "Europe/London").offset).toBe("+00:00");
  });
});

describe("resolveTimezone", () => {
  it("keeps a real IANA zone and falls back to Asia/Manila for a missing or unknown one", () => {
    expect(resolveTimezone("Europe/Berlin")).toBe("Europe/Berlin");
    expect(resolveTimezone(undefined)).toBe("Asia/Manila");
    expect(resolveTimezone("Mars/Olympus_Mons")).toBe("Asia/Manila");
  });
});

describe("currentTimeContext", () => {
  it("states the user's local time with its offset, weekday and zone", () => {
    const ctx = currentTimeContext("2026-06-16T03:00:00.000Z", "America/New_York");
    expect(ctx).toBe(
      "Current time: 2026-06-15T23:00:00-04:00 (Monday, America/New_York, UTC-04:00)",
    );
  });

  it("defaults to Asia/Manila for requests from older apps", () => {
    expect(currentTimeContext("2026-06-16T20:00:00.000Z")).toBe(
      "Current time: 2026-06-17T04:00:00+08:00 (Wednesday, Asia/Manila, UTC+08:00)",
    );
  });

  it("degrades gracefully on an unparseable input", () => {
    const ctx = currentTimeContext("not-a-date", "Europe/London");
    expect(ctx).toContain("not-a-date");
    expect(ctx).toContain("Europe/London");
  });
});
