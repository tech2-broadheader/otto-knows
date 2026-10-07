// Alarm timing for display (story 12.3). PURE: works on local wall-clock date
// and time, so it is deterministic in tests and independent of the device
// timezone. The Android alarm module computes the real fire instant itself
// (it must, to re-arm repeats and after a reboot without JS).
import type { Alarm, DayOfWeek } from "@otto/schemas";

export type LocalDateTime = { date: string; time: string };

const WEEK: readonly DayOfWeek[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const LABEL: Record<DayOfWeek, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};
const MINUTES_PER_DAY = 24 * 60;

function utcDate(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

function addDays(date: string, days: number): string {
  const d = utcDate(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function weekdayOf(date: string): DayOfWeek {
  // getUTCDay: 0 = Sunday … 6 = Saturday
  return WEEK[(utcDate(date).getUTCDay() + 6) % 7]!;
}

function minutesOf(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** When the alarm next rings (local), or null if it is switched off. */
export function nextAlarmAt(alarm: Alarm, now: LocalDateTime): LocalDateTime | null {
  if (!alarm.enabled) return null;
  const laterToday = minutesOf(alarm.time) > minutesOf(now.time);
  for (let offset = laterToday ? 0 : 1; offset <= 7; offset += 1) {
    const date = addDays(now.date, offset);
    if (alarm.repeatDays.length === 0 || alarm.repeatDays.includes(weekdayOf(date))) {
      return { date, time: alarm.time };
    }
  }
  return null;
}

function minutesBetween(from: LocalDateTime, to: LocalDateTime): number {
  const days = (utcDate(to.date).getTime() - utcDate(from.date).getTime()) / 86_400_000;
  return days * MINUTES_PER_DAY + minutesOf(to.time) - minutesOf(from.time);
}

/** The soonest enabled alarm, when it rings and how many minutes away that is. */
export function nextAlarm(
  alarms: readonly Alarm[],
  now: LocalDateTime,
): { alarm: Alarm; at: LocalDateTime; minutesUntil: number } | null {
  let best: { alarm: Alarm; at: LocalDateTime; minutesUntil: number } | null = null;
  for (const alarm of alarms) {
    const at = nextAlarmAt(alarm, now);
    if (!at) continue;
    const minutesUntil = minutesBetween(now, at);
    if (!best || minutesUntil < best.minutesUntil) best = { alarm, at, minutesUntil };
  }
  return best;
}

/** "Once", "Every day", "Mon–Fri", "Sat, Sun" or the days in week order. */
export function describeRepeat(days: readonly DayOfWeek[]): string {
  if (days.length === 0) return "Once";
  if (days.length === 7) return "Every day";
  const sorted = WEEK.filter((d) => days.includes(d));
  if (sorted.join() === "mon,tue,wed,thu,fri") return "Mon–Fri";
  return sorted.map((d) => LABEL[d]).join(", ");
}

/** "45 min", "7 h 20 min", "6 d 1 h". */
export function formatTimeUntil(minutes: number): string {
  if (minutes < 1) return "less than a minute";
  const d = Math.floor(minutes / MINUTES_PER_DAY);
  const h = Math.floor((minutes % MINUTES_PER_DAY) / 60);
  const m = minutes % 60;
  if (d > 0) return h > 0 ? `${d} d ${h} h` : `${d} d`;
  if (h > 0) return m > 0 ? `${h} h ${m} min` : `${h} h`;
  return `${m} min`;
}
