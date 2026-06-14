// Story 3.3 — Context-graph unification.
//
// Pure logic that merges every source (calendar events, reminders, bills,
// medications, routine anchors) into one routine-ordered `ContextItem[]` for a
// given day. No I/O, no side effects (CODING_CONVENTIONS §5).
//
// NOTE: `ContextItem.at` is an ISO-8601 datetime WITH offset. Anchors, meds and
// bills only carry an in-day time (HH:mm) or a date (YYYY-MM-DD), so the caller
// supplies the day (`date`) and the day's UTC offset (`utcOffset`, e.g.
// "+08:00"). Deriving the offset from an IANA zone needs the platform's
// Intl/timezone data, which is an I/O concern kept OUT of this pure layer.
import type {
  Bill,
  CalendarEvent,
  ContextItem,
  ContextItemKind,
  DataSource,
  Medication,
  Reminder,
  RoutineAnchor,
} from "@otto/schemas";

/** Fixed UTC offset for the day, e.g. "+08:00" or "Z". */
export type UtcOffset = string;

/** The full set of source entities for one user's day. */
export type DaySources = {
  events?: readonly CalendarEvent[];
  reminders?: readonly Reminder[];
  bills?: readonly Bill[];
  medications?: readonly Medication[];
  anchors?: readonly RoutineAnchor[];
};

/** Inputs that fix a concrete day on the timeline. */
export type DayContext = {
  /** The user this projection is for. Stamped onto every ContextItem. */
  userId: string;
  /** Calendar date being projected, YYYY-MM-DD. */
  date: string;
  /** The day's UTC offset, e.g. "+08:00". Defaults to "+00:00" (Z). */
  utcOffset?: UtcOffset;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const OFFSET_PATTERN = /^([+-]\d{2}:\d{2}|Z)$/;
const DEFAULT_OFFSET = "+00:00";

/**
 * Deterministic synthetic id for a projected ContextItem, so the same source
 * entity on the same day always yields the same item id (stable for diffing /
 * dedupe). Format: `ctx:<kind>:<refId>:<date>`. ContextItem.id in the schema is
 * a UUID; this helper returns a stable string and is exposed for callers that
 * want to map it onto their own id space.
 */
export function contextItemKey(kind: ContextItemKind, refId: string, date: string): string {
  return `ctx:${kind}:${refId}:${date}`;
}

/** Compose an ISO-8601 datetime with offset from a date + HH:mm + offset. */
function isoFromTime(date: string, time: string, offset: UtcOffset): string {
  const normalizedOffset = offset === "Z" ? "+00:00" : offset;
  return `${date}T${time}:00${normalizedOffset}`;
}

function assertDayContext(day: DayContext): UtcOffset {
  if (!DATE_PATTERN.test(day.date)) {
    throw new Error(`Invalid date "${day.date}": expected YYYY-MM-DD.`);
  }
  const offset = day.utcOffset ?? DEFAULT_OFFSET;
  if (!OFFSET_PATTERN.test(offset)) {
    throw new Error(`Invalid utcOffset "${offset}": expected ±HH:mm or "Z".`);
  }
  return offset === "Z" ? "+00:00" : offset;
}

/**
 * Build the ContextItem id. The schema demands a UUID; rather than fabricate a
 * fake UUID, we accept an `idFor` mapper so the host (which owns id generation)
 * stays in control. When omitted, we reuse the source entity's own id — every
 * source id in the schema is already a UUID, which keeps the projection valid.
 */
type IdFor = (kind: ContextItemKind, refId: string, date: string) => string;

const defaultIdFor: IdFor = (_kind, refId) => refId;

function mapEvent(event: CalendarEvent, userId: string, idFor: IdFor, date: string): ContextItem {
  const kind: ContextItemKind = "event";
  const source: DataSource = "calendar";
  return {
    id: idFor(kind, event.id, date),
    userId,
    kind,
    refId: event.id,
    source,
    title: event.title,
    at: event.startAt,
    meta: event.location ? { location: event.location } : undefined,
  };
}

function mapReminder(
  reminder: Reminder,
  day: DayContext,
  offset: UtcOffset,
  anchorTimes: Map<string, string>,
  idFor: IdFor,
): ContextItem | null {
  const kind: ContextItemKind = "reminder";
  const source: DataSource = "reminder";
  // Resolve the moment: explicit dueAt wins; else fall back to the anchor time.
  let at: string | undefined = reminder.dueAt;
  if (!at && reminder.anchorId) {
    const anchorTime = anchorTimes.get(reminder.anchorId);
    if (anchorTime) {
      at = isoFromTime(day.date, anchorTime, offset);
    }
  }
  if (!at) {
    // Untimed reminder for this day — can't place it on the timeline.
    return null;
  }
  return {
    id: idFor(kind, reminder.id, day.date),
    userId: day.userId,
    kind,
    refId: reminder.id,
    source,
    title: reminder.title,
    at,
  };
}

function mapBill(bill: Bill, day: DayContext, offset: UtcOffset, idFor: IdFor): ContextItem {
  const kind: ContextItemKind = "bill";
  const source: DataSource = "finance";
  // Bills carry a due DATE, not a time. Land them at start-of-day so they sort
  // first; the briefing layer decides how to phrase "due today".
  return {
    id: idFor(kind, bill.id, day.date),
    userId: day.userId,
    kind,
    refId: bill.id,
    source,
    title: bill.name,
    at: isoFromTime(day.date, "00:00", offset),
    meta: { amountMinor: bill.amount.amountMinor, currency: bill.amount.currency },
  };
}

function mapMedicationDoses(
  medication: Medication,
  day: DayContext,
  offset: UtcOffset,
  idFor: IdFor,
): ContextItem[] {
  const kind: ContextItemKind = "medication";
  const source: DataSource = "health";
  // A medication can have several daily times; emit one item per dose. `refId`
  // always points back at the medication's UUID (schema demands a UUID); the
  // per-dose distinction lives in the item id (idFor key suffix) and `meta.time`.
  return medication.times.map((time) => ({
    id: idFor(kind, `${medication.id}:${time}`, day.date),
    userId: day.userId,
    kind,
    refId: medication.id,
    source,
    title: medication.name,
    at: isoFromTime(day.date, time, offset),
    meta: medication.dosage ? { dosage: medication.dosage, time } : { time },
  }));
}

function mapAnchor(
  anchor: RoutineAnchor,
  day: DayContext,
  offset: UtcOffset,
  idFor: IdFor,
): ContextItem {
  const kind: ContextItemKind = "anchor";
  const source: DataSource = "routine";
  return {
    id: idFor(kind, anchor.id, day.date),
    userId: day.userId,
    kind,
    refId: anchor.id,
    source,
    title: anchor.label,
    at: isoFromTime(day.date, anchor.time, offset),
    meta: { anchorKind: anchor.kind },
  };
}

/** Stable kind ordering for ties at the same instant: routine frames the day. */
const KIND_ORDER: Record<ContextItemKind, number> = {
  anchor: 0,
  medication: 1,
  bill: 2,
  event: 3,
  reminder: 4,
  insight: 5,
};

/** Sort by time (`at`) ascending, then by kind (routine-first), then title. */
export function sortContextItems(items: readonly ContextItem[]): ContextItem[] {
  return [...items].sort((a, b) => {
    if (a.at !== b.at) return a.at < b.at ? -1 : 1;
    const kindDelta = KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
    if (kindDelta !== 0) return kindDelta;
    return a.title.localeCompare(b.title);
  });
}

/**
 * Merge every source into one routine-ordered `ContextItem[]` for the day.
 *
 * Mapping rules:
 *  - calendar event → `event` / `calendar`, at its `startAt`;
 *  - reminder       → `reminder` / `reminder`, at `dueAt` or its anchor's time
 *                     (untimed reminders are dropped from the timeline);
 *  - bill           → `bill` / `finance`, at start-of-day (due-date granularity);
 *  - medication     → one `medication` / `health` item per daily dose time;
 *  - routine anchor → `anchor` / `routine`, at the anchor time.
 *
 * Pass `idFor` to control ContextItem ids. In production the host owns id
 * generation and should supply a UUID-minting mapper (the schema's `id` is a
 * UUID). The default mapper reuses the source entity's UUID — handy for tests
 * and single-instance entities, but NOT schema-valid for multi-dose meds
 * (whose ids would collide), so supply `idFor` whenever meds have >1 dose.
 */
export function unifyContextGraph(
  sources: DaySources,
  day: DayContext,
  idFor: IdFor = defaultIdFor,
): ContextItem[] {
  const offset = assertDayContext(day);
  const anchors = sources.anchors ?? [];
  const anchorTimes = new Map(anchors.map((anchor) => [anchor.id, anchor.time]));

  const items: ContextItem[] = [];

  for (const event of sources.events ?? []) {
    items.push(mapEvent(event, day.userId, idFor, day.date));
  }
  for (const reminder of sources.reminders ?? []) {
    const item = mapReminder(reminder, day, offset, anchorTimes, idFor);
    if (item) items.push(item);
  }
  for (const bill of sources.bills ?? []) {
    items.push(mapBill(bill, day, offset, idFor));
  }
  for (const medication of sources.medications ?? []) {
    items.push(...mapMedicationDoses(medication, day, offset, idFor));
  }
  for (const anchor of anchors) {
    items.push(mapAnchor(anchor, day, offset, idFor));
  }

  return sortContextItems(items);
}

/**
 * "What's on today" — the query helper. Returns the unified, routine-ordered
 * list for the day. Thin wrapper over `unifyContextGraph` so callers read
 * intent at the call site.
 */
export function whatsOnToday(sources: DaySources, day: DayContext, idFor?: IdFor): ContextItem[] {
  return unifyContextGraph(sources, day, idFor);
}
