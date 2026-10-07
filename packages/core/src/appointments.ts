// Appointment helpers (story 12.4). Pure.

const ISO_WITH_OFFSET =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

/**
 * Add (or subtract) minutes to an ISO datetime, keeping its UTC offset so the
 * result reads in the same local time ("15:00+08:00" + 45 → "15:45+08:00").
 * A trailing "Z" is written back as "+00:00".
 */
export function addMinutesToIso(iso: string, minutes: number): string {
  const match = ISO_WITH_OFFSET.exec(iso);
  if (!match) throw new Error(`Not an ISO datetime with offset: ${iso}`);
  const [, y, mo, d, h, mi, s, offset] = match;
  const wall = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s));
  const shifted = new Date(wall + minutes * 60_000).toISOString().slice(0, 19);
  return `${shifted}${offset === "Z" ? "+00:00" : offset}`;
}
