// Small date/time helpers used at the UI edge to build schema-valid values.
// Pure; no native imports — unit-tested in Node.

/** Today's calendar date as YYYY-MM-DD for a given Date (defaults to now). */
export function todayDate(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Current month as YYYY-MM (for budget summaries). */
export function currentMonth(now: Date = new Date()): string {
  return todayDate(now).slice(0, 7);
}

/**
 * The local UTC offset as "+HH:mm" / "-HH:mm" (or "+00:00"). The context graph
 * needs the day's offset to place HH:mm anchors on the ISO timeline.
 */
export function localUtcOffset(now: Date = new Date()): string {
  // getTimezoneOffset is minutes BEHIND UTC, so invert the sign.
  const totalMinutes = -now.getTimezoneOffset();
  const sign = totalMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(totalMinutes);
  const hours = `${Math.floor(abs / 60)}`.padStart(2, "0");
  const minutes = `${abs % 60}`.padStart(2, "0");
  return `${sign}${hours}:${minutes}`;
}

/** Current instant as an ISO-8601 string WITH offset (matches isoDateTimeSchema). */
export function nowIso(now: Date = new Date()): string {
  const offset = localUtcOffset(now);
  const pad = (n: number, width = 2): string => `${n}`.padStart(width, "0");
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  return `${date}T${time}${offset}`;
}

/** Compose an ISO-8601 datetime from YYYY-MM-DD + HH:mm + offset. */
export function isoFromDateTime(date: string, time: string, offset: string): string {
  const normalized = offset === "Z" ? "+00:00" : offset;
  return `${date}T${time}:00${normalized}`;
}

/** The "HH:mm" portion of an ISO datetime, for compact display ("" if absent). */
export function timeLabel(iso: string): string {
  const match = /T(\d{2}:\d{2})/.exec(iso);
  return match?.[1] ?? "";
}

/** Pick the routine briefing slot for the hour of day. */
export function briefingSlotForHour(hour: number): "morning" | "midday" | "evening" {
  if (hour < 11) return "morning";
  if (hour < 17) return "midday";
  return "evening";
}

/** A warm, time-of-day greeting for the Today header (matches the design tone). */
export function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** "Thursday, June 18" (en-US) / "Thursday 18 June" (en-GB) — the date under the Today greeting. */
export function longDateLabel(now: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: "long", month: "long", day: "numeric" }).format(
    now,
  );
}
