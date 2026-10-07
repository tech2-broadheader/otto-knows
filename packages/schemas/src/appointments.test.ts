import { describe, expect, it } from "vitest";
import { appointmentSchema, proposalActionSchema } from "./index";

const ISO = "2026-10-08T08:00:00+08:00";
const UUID = "11111111-1111-4111-8111-111111111111";
const appt = {
  id: UUID,
  userId: UUID,
  title: "Dentist",
  startAt: "2026-10-13T15:00:00+08:00",
  endAt: "2026-10-13T16:00:00+08:00",
  createdAt: ISO,
  updatedAt: ISO,
};

describe("appointmentSchema", () => {
  it("accepts a minimal appointment and defaults the destination to Otto", () => {
    expect(appointmentSchema.parse(appt).destination).toBe("otto");
  });

  it("requires the end to be after the start", () => {
    expect(appointmentSchema.safeParse({ ...appt, endAt: appt.startAt }).success).toBe(false);
  });

  it("bounds the reminder lead time (0 to 7 days)", () => {
    expect(appointmentSchema.safeParse({ ...appt, remindMinutesBefore: 30 }).success).toBe(true);
    expect(appointmentSchema.safeParse({ ...appt, remindMinutesBefore: -1 }).success).toBe(false);
    expect(appointmentSchema.safeParse({ ...appt, remindMinutesBefore: 10_081 }).success).toBe(
      false,
    );
  });
});

describe("create_event proposal", () => {
  it("accepts a draft with a duration instead of an end", () => {
    const action = {
      type: "create_event",
      event: {
        title: "Dentist",
        startAt: appt.startAt,
        durationMinutes: 45,
        remindMinutesBefore: 60,
      },
    };
    expect(proposalActionSchema.safeParse(action).success).toBe(true);
  });

  it("rejects a draft with neither an end nor a duration", () => {
    const action = { type: "create_event", event: { title: "Dentist", startAt: appt.startAt } };
    expect(proposalActionSchema.safeParse(action).success).toBe(false);
  });
});
