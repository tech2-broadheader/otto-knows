// t() — every user-facing string in the app comes through here (story 13.3).
// English at launch; registered translations are picked by the device
// language, with English filling any gaps.
import { readDeviceLocale } from "../lib/device-locale";
import { en, type EnglishCatalog } from "./en";
import { createTranslator, type MessageKey, type MessageParams } from "./translate";
import { TRANSLATIONS } from "./translations";

export type TKey = MessageKey<EnglishCatalog>;

function translatorFor(locale: string): (key: TKey, params?: MessageParams) => string {
  const language = locale.split("-")[0] ?? "en";
  return createTranslator(en, locale, TRANSLATIONS[language]);
}

const translate = translatorFor(readDeviceLocale().locale);

/** A user-facing message by key, e.g. t("common.save") or t("tasks.open", { count: 3 }). */
export function t(key: TKey, params?: MessageParams): string {
  return translate(key, params);
}
