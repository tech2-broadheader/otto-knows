// A small typed string catalog (story 13.3, ADR-007; no i18n dependency).
// Messages live in nested objects; keys are dotted paths ("today.title"),
// checked by TypeScript. "{name}" placeholders are filled from params.
// Plurals: give "key_one" / "key_other" (any CLDR category) and pass {count}.
// A translation is a partial copy of English; anything missing falls back.
// PURE — unit-tested.

export type CatalogTree = { readonly [key: string]: string | CatalogTree };

type LeafKey<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${LeafKey<T[K]>}`;
}[keyof T & string];

type PluralCategory = "zero" | "one" | "two" | "few" | "many" | "other";
type WithoutPlural<K> = K extends `${infer Base}_${PluralCategory}` ? Base : K;

/** Every key `t` accepts for a catalog (plural forms collapse to their base key). */
export type MessageKey<T> = WithoutPlural<LeafKey<T>>;

export type MessageParams = Record<string, string | number>;

/** A translation: the English shape with any subset of messages. */
export type Translation<T> = {
  [K in keyof T]?: T[K] extends string ? string : Translation<T[K]>;
};

export function interpolate(template: string, params: MessageParams = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

function lookup(tree: unknown, path: readonly string[]): string | undefined {
  let node: unknown = tree;
  for (const part of path) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : undefined;
}

/** Plural category for a count; English rules if the engine lacks PluralRules. */
function pluralCategory(locale: string, count: number): string {
  try {
    return new Intl.PluralRules(locale).select(count);
  } catch {
    return count === 1 ? "one" : "other";
  }
}

export function createTranslator<T extends CatalogTree>(
  english: T,
  locale: string,
  translation?: Translation<T>,
): (key: MessageKey<T>, params?: MessageParams) => string {
  const sources: unknown[] = translation ? [translation, english] : [english];
  return (key, params) => {
    const path = (key as string).split(".");
    const leaf = path[path.length - 1] ?? "";
    const parent = path.slice(0, -1);
    const count = params?.count;
    const candidates =
      typeof count === "number"
        ? [
            [...parent, `${leaf}_${pluralCategory(locale, count)}`],
            [...parent, `${leaf}_other`],
            path,
          ]
        : [path];
    for (const source of sources) {
      for (const candidate of candidates) {
        const template = lookup(source, candidate);
        if (template !== undefined) return interpolate(template, params);
      }
    }
    // Unknown key: show it, so a gap is visible rather than blank.
    return key as string;
  };
}

/** Dotted keys present in `translation` but not in `english` (typos, stale keys). */
export function extraKeys(translation: unknown, english: unknown, prefix = ""): string[] {
  if (typeof translation !== "object" || translation === null) return [];
  const out: string[] = [];
  for (const [key, value] of Object.entries(translation)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const counterpart =
      typeof english === "object" && english !== null
        ? (english as Record<string, unknown>)[key]
        : undefined;
    if (counterpart === undefined) {
      if (typeof value === "object" && value !== null) out.push(...extraKeys(value, {}, path));
      else out.push(path);
    } else if (typeof value === "object" && value !== null) {
      out.push(...extraKeys(value, counterpart, path));
    }
  }
  return out;
}

/**
 * Rich text inside one message (e.g. a bold amount mid-sentence): pass
 * SLOT_MARK as the slot's param, then split the result around it. The mark is
 * a control character no user text contains, so labels can't break the split.
 */
export const SLOT_MARK = "\u0000";

export function splitAtSlot(message: string): [string, string] {
  const at = message.indexOf(SLOT_MARK);
  return at === -1 ? [message, ""] : [message.slice(0, at), message.slice(at + SLOT_MARK.length)];
}
