// The phone's language/region and timezone, read from Intl (story 13.1). Hermes
// exposes both through Intl.DateTimeFormat().resolvedOptions(), so no extra
// localization package is needed. Pure enough to unit-test with an injected Intl.

type DateTimeFormatFactory = () => {
  resolvedOptions: () => { locale?: string; timeZone?: string };
};

const defaultFactory: DateTimeFormatFactory = () => new Intl.DateTimeFormat();

/** Device locale (BCP 47) and IANA timezone, with safe fallbacks. */
export function readDeviceLocale(factory: DateTimeFormatFactory = defaultFactory): {
  locale: string;
  timeZone: string;
} {
  const options = factory().resolvedOptions();
  return { locale: options.locale || "en", timeZone: options.timeZone || "UTC" };
}
