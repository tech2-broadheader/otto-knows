/**
 * Time context for the LLM. Otto's users are in the Philippines, which is
 * UTC+08:00 year-round (no DST). We hand the model the current time in Manila
 * local time WITH an explicit +08:00 offset so it anchors relative times
 * ("tonight", "8pm") correctly and emits offset-aware ISO datetimes instead of
 * UTC "Z" (which would fire reminders 8 hours early). Centralised so the brief
 * and quick-add paths stay consistent.
 */

export const APP_TIMEZONE = "Asia/Manila";

const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Render an instant as a "Current time:" line in Manila local time with the
 * +08:00 offset AND the weekday name, e.g.
 * "Current time: 2026-06-16T11:00:00.000+08:00 (Tuesday, Asia/Manila, UTC+08:00)".
 * The weekday is included so the model resolves "Friday"/"next Tuesday" against
 * the right date instead of miscounting.
 */
export function currentTimeContext(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return `Current time: ${iso} (timezone ${APP_TIMEZONE}, UTC+08:00)`;
  }
  // Shift into Manila wall-clock; the shifted instant's UTC fields then read as
  // Manila local date/time/weekday.
  const shifted = new Date(d.getTime() + MANILA_OFFSET_MS);
  const local = shifted.toISOString().replace("Z", "+08:00");
  const weekday = WEEKDAYS[shifted.getUTCDay()];
  return `Current time: ${local} (${weekday}, ${APP_TIMEZONE}, UTC+08:00)`;
}
