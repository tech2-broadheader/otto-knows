// Sentences the shared logic (@otto/core) writes for the user: the free
// template briefing, money nudges and alarm labels (story 13.3). Wired up in
// i18n/core-copy.ts.
export const core = {
  briefing: {
    greeting: {
      morning: "Good morning.",
      midday: "Quick midday check.",
      evening: "Winding down.",
    },
    openDay: "Nothing scheduled — an open day.",
    things_one: "1 thing on today: {preview}",
    things_other: "{count} things on today: {preview}",
    more: ", and {count} more",
  },
  safeToSpend: {
    safe: "{amount} is safe to spend until payday on {payday} — about {perDay} a day.",
    shortfall: "Heads up — bills before payday on {payday} are {amount} more than what's on hand.",
  },
  paydayBill:
    "Heads up — {bill} ({amount}) is due {due}, but your next pay lands {payday}. Want a nudge the day before?",
  repeat: {
    once: "Once",
    everyDay: "Every day",
    weekdays: "Mon–Fri",
    days: { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" },
    separator: ", ",
  },
  timeUntil: {
    underAMinute: "less than a minute",
    minutes: "{m} min",
    hours: "{h} h",
    hoursMinutes: "{h} h {m} min",
    days: "{d} d",
    daysHours: "{d} d {h} h",
  },
} as const;
