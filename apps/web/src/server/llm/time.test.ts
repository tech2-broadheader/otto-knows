import { describe, expect, it } from "vitest";
import { currentTimeContext } from "./time";

describe("currentTimeContext", () => {
  it("renders a UTC instant in Manila local time with a +08:00 offset and weekday", () => {
    // 03:00Z is 11:00 in Manila (UTC+08:00); 2026-06-16 is a Tuesday.
    const ctx = currentTimeContext("2026-06-16T03:00:00.000Z");
    expect(ctx).toContain("2026-06-16T11:00:00.000+08:00");
    expect(ctx).toContain("Tuesday");
    expect(ctx).toContain("Asia/Manila");
    expect(ctx).not.toContain("Z (");
  });

  it("rolls the date (and weekday) forward when the UTC time is late evening", () => {
    // 20:00Z on Tue the 16th is 04:00 on Wed the 17th in Manila.
    const ctx = currentTimeContext("2026-06-16T20:00:00.000Z");
    expect(ctx).toContain("2026-06-17T04:00:00.000+08:00");
    expect(ctx).toContain("Wednesday");
  });

  it("degrades gracefully on an unparseable input", () => {
    const ctx = currentTimeContext("not-a-date");
    expect(ctx).toContain("not-a-date");
    expect(ctx).toContain("UTC+08:00");
  });
});
