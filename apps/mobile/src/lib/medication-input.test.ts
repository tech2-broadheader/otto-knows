import { describe, expect, it } from "vitest";
import { parseTimesList, recurrenceFromFreq } from "./medication-input";

describe("parseTimesList", () => {
  it("parses a comma-separated list, de-duped and sorted", () => {
    expect(parseTimesList("20:00, 08:00, 08:00")).toEqual(["08:00", "20:00"]);
  });

  it("accepts whitespace and newline separators", () => {
    expect(parseTimesList("08:00\n12:30  18:45")).toEqual(["08:00", "12:30", "18:45"]);
  });

  it("returns null when empty", () => {
    expect(parseTimesList("   ")).toBeNull();
  });

  it("returns null on any invalid HH:mm token", () => {
    expect(parseTimesList("08:00, 25:00")).toBeNull();
    expect(parseTimesList("8am")).toBeNull();
    expect(parseTimesList("08:60")).toBeNull();
  });
});

describe("recurrenceFromFreq", () => {
  it("wraps the frequency in a Recurrence object", () => {
    expect(recurrenceFromFreq("daily")).toEqual({ freq: "daily" });
    expect(recurrenceFromFreq("weekdays")).toEqual({ freq: "weekdays" });
  });
});
