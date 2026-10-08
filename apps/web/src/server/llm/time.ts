/**
 * Time context for the LLM, in the user's own timezone (story 13.2). We hand the
 * model the current wall-clock time WITH its UTC offset and weekday so it
 * anchors relative times ("tonight", "Friday") correctly and writes
 * offset-aware ISO datetimes instead of UTC "Z" (which would fire reminders at
 * the wrong hour). Requests from older apps carry no timezone and get
 * Asia/Manila, Otto's first market. Centralised so brief and quick-add agree.
 */

import type { AiUserContext, CurrencyCode } from "@otto/schemas";
import type { PromptLocale } from "./prompts";

export const DEFAULT_TIMEZONE = "Asia/Manila";
const DEFAULT_CURRENCY: CurrencyCode = "PHP";

export type LocalClock = {
  /** YYYY-MM-DD */
  date: string;
  /** HH:mm:ss (24h) */
  time: string;
  weekday: string;
  /** "+08:00" / "-04:00" / "+00:00" */
  offset: string;
};

/** A real IANA zone as given, else the default (never throws on bad input). */
export function resolveTimezone(timezone: string | undefined): string {
  if (!timezone) return DEFAULT_TIMEZONE;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return timezone;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

/** Read an instant as wall-clock date, time, weekday and offset in `timezone`. */
export function localClock(iso: string, timezone: string): LocalClock {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
      weekday: "long",
      timeZoneName: "longOffset",
    })
      .formatToParts(new Date(iso))
      .map((p) => [p.type, p.value]),
  );
  // longOffset reads "GMT+08:00", or plain "GMT" at UTC+0.
  const offset = (parts.timeZoneName ?? "GMT").replace("GMT", "") || "+00:00";
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}:${parts.second}`,
    weekday: parts.weekday ?? "",
    offset,
  };
}

/**
 * The zone, its offset at `nowIso` and the currency to prompt with. Older apps
 * send no user block and get Asia/Manila and PHP, as before.
 */
export function promptLocale(user: AiUserContext | undefined, nowIso: string): PromptLocale {
  const timezone = resolveTimezone(user?.timezone);
  return {
    timezone,
    offset: localClock(nowIso, timezone).offset,
    currency: user?.currency ?? DEFAULT_CURRENCY,
  };
}

/**
 * A "Current time:" line in the user's local time, e.g.
 * "Current time: 2026-06-15T23:00:00-04:00 (Monday, America/New_York, UTC-04:00)".
 * The weekday helps the model resolve "Friday"/"next Tuesday" correctly.
 */
export function currentTimeContext(iso: string, timezone: string = DEFAULT_TIMEZONE): string {
  if (Number.isNaN(new Date(iso).getTime())) {
    return `Current time: ${iso} (timezone ${timezone})`;
  }
  const clock = localClock(iso, timezone);
  return `Current time: ${clock.date}T${clock.time}${clock.offset} (${clock.weekday}, ${timezone}, UTC${clock.offset})`;
}
