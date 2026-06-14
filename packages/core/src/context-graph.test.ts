import { describe, expect, it } from "vitest";
import type { Bill, CalendarEvent, Medication, Reminder, RoutineAnchor } from "@otto/schemas";
import { contextItemSchema } from "@otto/schemas";
import {
  contextItemKey,
  sortContextItems,
  unifyContextGraph,
  whatsOnToday,
  type DayContext,
} from "./context-graph";

const ISO = "2026-06-14T08:00:00+08:00";
const USER = "11111111-1111-4111-8111-111111111111";
const DATE = "2026-06-14";
const OFFSET = "+08:00";

const day: DayContext = { userId: USER, date: DATE, utcOffset: OFFSET };

// Distinct UUIDs so projected ContextItems (which reuse source ids) validate.
const ids = {
  event: "22222222-2222-4222-8222-222222222222",
  reminder: "33333333-3333-4333-8333-333333333333",
  bill: "44444444-4444-4444-8444-444444444444",
  med: "55555555-5555-4555-8555-555555555555",
  anchor: "66666666-6666-4666-8666-666666666666",
};

function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: ids.event,
    userId: USER,
    provider: "google",
    externalId: "ext-1",
    title: "Standup",
    startAt: `${DATE}T09:00:00${OFFSET}`,
    endAt: `${DATE}T09:30:00${OFFSET}`,
    createdAt: ISO,
    updatedAt: ISO,
    ...overrides,
  };
}

function makeReminder(overrides: Partial<Reminder> = {}): Reminder {
  return {
    id: ids.reminder,
    userId: USER,
    title: "Call pharmacy",
    status: "pending",
    createdAt: ISO,
    updatedAt: ISO,
    ...overrides,
  };
}

function makeBill(overrides: Partial<Bill> = {}): Bill {
  return {
    id: ids.bill,
    userId: USER,
    name: "Electric bill",
    amount: { amountMinor: 250000, currency: "PHP" },
    dueDate: DATE,
    recurrence: { freq: "monthly", dayOfMonth: 14 },
    isAutopay: false,
    isPaid: false,
    createdAt: ISO,
    updatedAt: ISO,
    ...overrides,
  };
}

function makeMedication(overrides: Partial<Medication> = {}): Medication {
  return {
    id: ids.med,
    userId: USER,
    name: "Metformin",
    times: ["08:00", "20:00"],
    recurrence: { freq: "daily" },
    createdAt: ISO,
    updatedAt: ISO,
    ...overrides,
  };
}

function makeAnchor(overrides: Partial<RoutineAnchor> = {}): RoutineAnchor {
  return {
    id: ids.anchor,
    label: "Lunch",
    kind: "meal",
    time: "12:00",
    recurrence: { freq: "daily" },
    createdAt: ISO,
    updatedAt: ISO,
    ...overrides,
  };
}

describe("unifyContextGraph mapping", () => {
  it("maps a calendar event to an event/calendar ContextItem at its start", () => {
    const [item] = unifyContextGraph({ events: [makeEvent({ location: "HQ" })] }, day);
    expect(item).toMatchObject({
      kind: "event",
      source: "calendar",
      refId: ids.event,
      title: "Standup",
      at: `${DATE}T09:00:00${OFFSET}`,
      meta: { location: "HQ" },
    });
  });

  it("maps a reminder with explicit dueAt", () => {
    const dueAt = `${DATE}T15:00:00${OFFSET}`;
    const [item] = unifyContextGraph({ reminders: [makeReminder({ dueAt })] }, day);
    expect(item).toMatchObject({ kind: "reminder", source: "reminder", at: dueAt });
  });

  it("resolves an anchor-relative reminder to the anchor's time", () => {
    const anchor = makeAnchor({ time: "12:00" });
    const reminder = makeReminder({ anchorId: anchor.id, dueAt: undefined });
    const items = unifyContextGraph({ anchors: [anchor], reminders: [reminder] }, day);
    const reminderItem = items.find((i) => i.kind === "reminder");
    expect(reminderItem?.at).toBe(`${DATE}T12:00:00${OFFSET}`);
  });

  it("drops an untimed reminder (no dueAt, no resolvable anchor)", () => {
    const items = unifyContextGraph({ reminders: [makeReminder()] }, day);
    expect(items).toHaveLength(0);
  });

  it("maps a bill to finance at start-of-day with amount meta", () => {
    const [item] = unifyContextGraph({ bills: [makeBill()] }, day);
    expect(item).toMatchObject({
      kind: "bill",
      source: "finance",
      at: `${DATE}T00:00:00${OFFSET}`,
      meta: { amountMinor: 250000, currency: "PHP" },
    });
  });

  it("emits one medication item per daily dose", () => {
    const items = unifyContextGraph({ medications: [makeMedication()] }, day);
    expect(items).toHaveLength(2);
    expect(items.map((i) => i.at)).toEqual([
      `${DATE}T08:00:00${OFFSET}`,
      `${DATE}T20:00:00${OFFSET}`,
    ]);
    expect(items[0]).toMatchObject({ kind: "medication", source: "health", refId: ids.med });
  });

  it("maps a routine anchor to routine source", () => {
    const [item] = unifyContextGraph({ anchors: [makeAnchor()] }, day);
    expect(item).toMatchObject({
      kind: "anchor",
      source: "routine",
      at: `${DATE}T12:00:00${OFFSET}`,
      meta: { anchorKind: "meal" },
    });
  });

  it("produces schema-valid ContextItems for every source", () => {
    // The host owns id generation; supply a UUID-minting mapper (the realistic
    // integration path) so multi-dose meds get distinct, schema-valid ids.
    let counter = 0;
    const uuidFor = (): string => {
      counter += 1;
      const hex = counter.toString(16).padStart(12, "0");
      return `00000000-0000-4000-8000-${hex}`;
    };
    const items = unifyContextGraph(
      {
        events: [makeEvent()],
        reminders: [makeReminder({ dueAt: `${DATE}T15:00:00${OFFSET}` })],
        bills: [makeBill()],
        medications: [makeMedication()],
        anchors: [makeAnchor()],
      },
      day,
      uuidFor,
    );
    for (const item of items) {
      expect(contextItemSchema.safeParse(item).success).toBe(true);
    }
  });
});

describe("ordering", () => {
  it("orders the unified list by time ascending", () => {
    const items = unifyContextGraph(
      {
        events: [makeEvent({ startAt: `${DATE}T09:00:00${OFFSET}` })],
        bills: [makeBill()], // 00:00
        medications: [makeMedication()], // 08:00, 20:00
        anchors: [makeAnchor({ time: "12:00" })],
      },
      day,
    );
    const times = items.map((i) => i.at);
    expect(times).toEqual([...times].sort());
  });

  it("breaks time ties routine-first (anchor before event at the same instant)", () => {
    const at = "08:00";
    const anchor = makeAnchor({ time: at, kind: "wake", label: "Wake" });
    const event = makeEvent({ startAt: `${DATE}T${at}:00${OFFSET}` });
    const items = unifyContextGraph({ anchors: [anchor], events: [event] }, day);
    expect(items.map((i) => i.kind)).toEqual(["anchor", "event"]);
  });

  it("sortContextItems is stable and pure (does not mutate input)", () => {
    const input = unifyContextGraph({ medications: [makeMedication()] }, day);
    const original = [...input];
    const sorted = sortContextItems(input);
    expect(input).toEqual(original); // unchanged
    expect(sorted).not.toBe(input); // new array
  });
});

describe("whatsOnToday", () => {
  it("returns an empty list for an empty day", () => {
    expect(whatsOnToday({}, day)).toEqual([]);
  });

  it("returns the same ordered projection as unifyContextGraph", () => {
    const sources = { anchors: [makeAnchor()], bills: [makeBill()] };
    expect(whatsOnToday(sources, day)).toEqual(unifyContextGraph(sources, day));
  });
});

describe("custom idFor + edge cases", () => {
  it("uses a custom id mapper when provided", () => {
    const items = unifyContextGraph({ bills: [makeBill()] }, day, (kind, refId, date) =>
      contextItemKey(kind, refId, date),
    );
    expect(items[0]?.id).toBe(`ctx:bill:${ids.bill}:${DATE}`);
  });

  it("defaults a missing utcOffset to UTC", () => {
    const [item] = unifyContextGraph(
      { anchors: [makeAnchor({ time: "06:00" })] },
      { userId: USER, date: DATE },
    );
    expect(item?.at).toBe(`${DATE}T06:00:00+00:00`);
  });

  it("throws on a malformed date or offset (programming error)", () => {
    expect(() => unifyContextGraph({}, { userId: USER, date: "June 14" })).toThrow();
    expect(() => unifyContextGraph({}, { userId: USER, date: DATE, utcOffset: "+8" })).toThrow();
  });
});
