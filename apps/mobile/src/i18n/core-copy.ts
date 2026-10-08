// The app's wording for sentences @otto/core writes (story 13.3): pass
// CORE_COPY wherever a core function takes `copy`.
import type { CoreCopy } from "@otto/core";
import { t } from ".";

export const CORE_COPY: CoreCopy = {
  briefing: {
    greeting: {
      morning: t("core.briefing.greeting.morning"),
      midday: t("core.briefing.greeting.midday"),
      evening: t("core.briefing.greeting.evening"),
    },
    openDay: t("core.briefing.openDay"),
    things: (p) => t("core.briefing.things", p),
    more: (p) => t("core.briefing.more", p),
  },
  safeToSpend: {
    safe: (p) => t("core.safeToSpend.safe", p),
    shortfall: (p) => t("core.safeToSpend.shortfall", p),
  },
  paydayBill: (p) => t("core.paydayBill", p),
  repeat: {
    once: t("core.repeat.once"),
    everyDay: t("core.repeat.everyDay"),
    weekdays: t("core.repeat.weekdays"),
    days: {
      mon: t("core.repeat.days.mon"),
      tue: t("core.repeat.days.tue"),
      wed: t("core.repeat.days.wed"),
      thu: t("core.repeat.days.thu"),
      fri: t("core.repeat.days.fri"),
      sat: t("core.repeat.days.sat"),
      sun: t("core.repeat.days.sun"),
    },
    separator: t("core.repeat.separator"),
  },
  timeUntil: {
    underAMinute: t("core.timeUntil.underAMinute"),
    minutes: (m) => t("core.timeUntil.minutes", { m }),
    hours: (h) => t("core.timeUntil.hours", { h }),
    hoursMinutes: (h, m) => t("core.timeUntil.hoursMinutes", { h, m }),
    days: (d) => t("core.timeUntil.days", { d }),
    daysHours: (d, h) => t("core.timeUntil.daysHours", { d, h }),
  },
};
