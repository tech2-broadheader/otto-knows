// Sentences @otto/core writes for the user (story 13.3). English is the
// default — the server's fallback briefing uses it — and the app passes its
// own copy built from its string catalog so the same logic speaks the user's
// language. Messages are functions so each language orders its own words.
import type { BriefingSlot, DayOfWeek } from "@otto/schemas";

export type CoreCopy = {
  briefing: {
    greeting: Record<BriefingSlot, string>;
    openDay: string;
    /** "{count} things on today: {preview}" (the caller adds "." / more). */
    things: (p: { count: number; preview: string }) => string;
    /** ", and {count} more" */
    more: (p: { count: number }) => string;
  };
  safeToSpend: {
    safe: (p: { amount: string; payday: string; perDay: string }) => string;
    shortfall: (p: { amount: string; payday: string }) => string;
  };
  paydayBill: (p: { bill: string; amount: string; due: string; payday: string }) => string;
  repeat: {
    once: string;
    everyDay: string;
    weekdays: string;
    days: Record<DayOfWeek, string>;
    separator: string;
  };
  timeUntil: {
    underAMinute: string;
    minutes: (m: number) => string;
    hours: (h: number) => string;
    hoursMinutes: (h: number, m: number) => string;
    days: (d: number) => string;
    daysHours: (d: number, h: number) => string;
  };
};

export const EN_CORE_COPY: CoreCopy = {
  briefing: {
    greeting: {
      morning: "Good morning.",
      midday: "Quick midday check.",
      evening: "Winding down.",
    },
    openDay: "Nothing scheduled — an open day.",
    things: ({ count, preview }) =>
      `${count === 1 ? "1 thing on today" : `${count} things on today`}: ${preview}`,
    more: ({ count }) => `, and ${count} more`,
  },
  safeToSpend: {
    safe: ({ amount, payday, perDay }) =>
      `${amount} is safe to spend until payday on ${payday} — about ${perDay} a day.`,
    shortfall: ({ amount, payday }) =>
      `Heads up — bills before payday on ${payday} are ${amount} more than what's on hand.`,
  },
  paydayBill: ({ bill, amount, due, payday }) =>
    `Heads up — ${bill} (${amount}) is due ${due}, but your next pay lands ${payday}. Want a nudge the day before?`,
  repeat: {
    once: "Once",
    everyDay: "Every day",
    weekdays: "Mon–Fri",
    days: { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" },
    separator: ", ",
  },
  timeUntil: {
    underAMinute: "less than a minute",
    minutes: (m) => `${m} min`,
    hours: (h) => `${h} h`,
    hoursMinutes: (h, m) => `${h} h ${m} min`,
    days: (d) => `${d} d`,
    daysHours: (d, h) => `${d} d ${h} h`,
  },
};
