import { describe, expect, it } from "vitest";
import {
  GOOGLE_CALENDAR_READONLY_SCOPE,
  buildEventsListUrl,
  isTokenFresh,
  nextDate,
  type StoredGoogleToken,
} from "./google-calendar-core";

const baseToken = (over: Partial<StoredGoogleToken> = {}): StoredGoogleToken => ({
  accessToken: "tok",
  issuedAtMs: 1_000_000,
  expiresInSec: 3600,
  ...over,
});

describe("isTokenFresh", () => {
  it("is fresh well within the lifetime", () => {
    const token = baseToken({ issuedAtMs: 1_000_000, expiresInSec: 3600 });
    expect(isTokenFresh(token, 1_000_000 + 1000 * 1000)).toBe(true);
  });

  it("is stale once past expiry (minus skew)", () => {
    const token = baseToken({ issuedAtMs: 1_000_000, expiresInSec: 3600 });
    // 3600 - 60 skew = 3540s of usable life.
    expect(isTokenFresh(token, 1_000_000 + 3541 * 1000)).toBe(false);
  });

  it("treats a token with no expiry as stale (force refresh)", () => {
    expect(isTokenFresh(baseToken({ expiresInSec: undefined }), 1_000_000)).toBe(false);
  });

  it("treats an empty access token as not fresh", () => {
    expect(isTokenFresh(baseToken({ accessToken: "" }), 1_000_000)).toBe(false);
  });
});

describe("nextDate", () => {
  it("advances one day", () => {
    expect(nextDate("2026-06-14")).toBe("2026-06-15");
  });
  it("rolls over month boundaries", () => {
    expect(nextDate("2026-06-30")).toBe("2026-07-01");
  });
  it("rolls over year boundaries", () => {
    expect(nextDate("2026-12-31")).toBe("2027-01-01");
  });
});

describe("buildEventsListUrl", () => {
  it("builds a day-window primary-calendar query with read-friendly params", () => {
    const url = buildEventsListUrl("2026-06-14", "+08:00");
    expect(url).toContain("/calendars/primary/events?");
    expect(url).toContain(encodeURIComponent("2026-06-14T00:00:00+08:00"));
    expect(url).toContain(encodeURIComponent("2026-06-15T00:00:00+08:00"));
    expect(url).toContain("singleEvents=true");
    expect(url).toContain("orderBy=startTime");
  });

  it("encodes a non-default calendar id", () => {
    const url = buildEventsListUrl("2026-06-14", "+08:00", "team@group.calendar.google.com");
    expect(url).toContain(encodeURIComponent("team@group.calendar.google.com"));
  });
});

describe("GOOGLE_CALENDAR_READONLY_SCOPE", () => {
  it("is the read-only calendar scope", () => {
    expect(GOOGLE_CALENDAR_READONLY_SCOPE).toBe(
      "https://www.googleapis.com/auth/calendar.readonly",
    );
  });
});
