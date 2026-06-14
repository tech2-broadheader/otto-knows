import { describe, expect, it } from "vitest";
import {
  recurrenceSchema,
  moneySchema,
  timeOfDaySchema,
  routineAnchorSchema,
  billSchema,
  consentSchema,
  isSensitiveEntity,
} from "./index";

const ISO = "2026-06-14T08:00:00+08:00";
const UUID = "11111111-1111-4111-8111-111111111111";

describe("primitives", () => {
  it("accepts HH:mm and rejects out-of-range times", () => {
    expect(timeOfDaySchema.safeParse("08:30").success).toBe(true);
    expect(timeOfDaySchema.safeParse("24:00").success).toBe(false);
    expect(timeOfDaySchema.safeParse("8:30").success).toBe(false);
  });

  it("defaults money currency to PHP", () => {
    const parsed = moneySchema.parse({ amountMinor: 10050 });
    expect(parsed.currency).toBe("PHP");
  });

  it("requires daysOfWeek for custom recurrence", () => {
    expect(recurrenceSchema.safeParse({ freq: "daily" }).success).toBe(true);
    expect(recurrenceSchema.safeParse({ freq: "custom" }).success).toBe(false);
    expect(
      recurrenceSchema.safeParse({ freq: "custom", daysOfWeek: ["mon", "wed"] }).success,
    ).toBe(true);
  });
});

describe("entities", () => {
  it("validates a routine anchor", () => {
    const result = routineAnchorSchema.safeParse({
      id: UUID,
      label: "Lunch",
      kind: "meal",
      time: "12:30",
      recurrence: { freq: "daily" },
      createdAt: ISO,
      updatedAt: ISO,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a bill with a malformed due date", () => {
    const result = billSchema.safeParse({
      id: UUID,
      userId: UUID,
      name: "Electric",
      amount: { amountMinor: 250000 },
      dueDate: "June 14",
      recurrence: { freq: "monthly", dayOfMonth: 14 },
      createdAt: ISO,
      updatedAt: ISO,
    });
    expect(result.success).toBe(false);
  });

  it("requires grantedAt when a consent is granted", () => {
    const base = {
      id: UUID,
      userId: UUID,
      source: "finance" as const,
      purpose: "Show your budget",
      policyVersion: "2026-06-14",
    };
    expect(consentSchema.safeParse({ ...base, granted: true }).success).toBe(false);
    expect(consentSchema.safeParse({ ...base, granted: true, grantedAt: ISO }).success).toBe(true);
    expect(consentSchema.safeParse({ ...base, granted: false }).success).toBe(true);
  });
});

describe("sensitivity tagging", () => {
  it("flags finance and health entities as sensitive", () => {
    expect(isSensitiveEntity("transaction")).toBe(true);
    expect(isSensitiveEntity("medication")).toBe(true);
    expect(isSensitiveEntity("routine")).toBe(false);
  });
});
