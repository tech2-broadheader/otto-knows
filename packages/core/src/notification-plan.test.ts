import { describe, expect, it } from "vitest";
import type { Medication, Reminder, RoutineAnchor } from "@otto/schemas";
import { planDayNotifications } from "./notification-plan";

const U = (n: number) => `${n.toString().padStart(8, "0")}-1111-4111-8111-111111111111`;
const ISO = "2026-06-14T00:00:00+08:00";

const anchors: RoutineAnchor[] = [
  {
    id: U(1),
    label: "Meds",
    kind: "meds",
    time: "08:00",
    recurrence: { freq: "daily" },
    createdAt: ISO,
    updatedAt: ISO,
  },
];

describe("planDayNotifications", () => {
  it("fires an anchor-bound reminder at the anchor time", () => {
    const reminders: Reminder[] = [
      {
        id: U(10),
        userId: U(99),
        title: "Take BP meds",
        anchorId: U(1),
        status: "pending",
        createdAt: ISO,
        updatedAt: ISO,
      },
    ];
    const plan = planDayNotifications({ date: "2026-06-14", anchors, reminders });
    expect(plan).toHaveLength(1);
    expect(plan[0]?.fireAt).toBe("2026-06-14T08:00:00+08:00");
  });

  it("fires a dueAt reminder only on its date, and skips done ones", () => {
    const reminders: Reminder[] = [
      {
        id: U(11),
        userId: U(99),
        title: "Call bank",
        dueAt: "2026-06-14T10:30:00+08:00",
        status: "pending",
        createdAt: ISO,
        updatedAt: ISO,
      },
      {
        id: U(12),
        userId: U(99),
        title: "Yesterday",
        dueAt: "2026-06-13T10:30:00+08:00",
        status: "pending",
        createdAt: ISO,
        updatedAt: ISO,
      },
      {
        id: U(13),
        userId: U(99),
        title: "Already done",
        anchorId: U(1),
        status: "done",
        createdAt: ISO,
        updatedAt: ISO,
      },
    ];
    const plan = planDayNotifications({ date: "2026-06-14", anchors, reminders });
    expect(plan.map((p) => p.title)).toEqual(["Call bank"]);
  });

  it("fires a medication at each scheduled time when the recurrence lands", () => {
    const meds: Medication[] = [
      {
        id: U(20),
        userId: U(99),
        name: "Metformin",
        times: ["08:00", "20:00"],
        recurrence: { freq: "daily" },
        createdAt: ISO,
        updatedAt: ISO,
      },
      {
        id: U(21),
        userId: U(99),
        name: "WeekendOnly",
        times: ["09:00"],
        recurrence: { freq: "weekends" },
        createdAt: ISO,
        updatedAt: ISO,
      },
    ];
    const plan = planDayNotifications({ date: "2026-06-15", medications: meds }); // Mon
    expect(plan.map((p) => p.title)).toEqual(["Take Metformin", "Take Metformin"]);
    expect(plan[0]?.fireAt).toBe("2026-06-15T08:00:00+08:00");
  });

  it("returns notifications sorted by fire time across sources", () => {
    const reminders: Reminder[] = [
      {
        id: U(30),
        userId: U(99),
        title: "Afternoon",
        dueAt: "2026-06-14T15:00:00+08:00",
        status: "pending",
        createdAt: ISO,
        updatedAt: ISO,
      },
    ];
    const meds: Medication[] = [
      {
        id: U(31),
        userId: U(99),
        name: "Morning pill",
        times: ["08:00"],
        recurrence: { freq: "daily" },
        createdAt: ISO,
        updatedAt: ISO,
      },
    ];
    const plan = planDayNotifications({
      date: "2026-06-14",
      anchors,
      reminders,
      medications: meds,
    });
    expect(plan.map((p) => p.title)).toEqual(["Take Morning pill", "Afternoon"]);
  });
});
