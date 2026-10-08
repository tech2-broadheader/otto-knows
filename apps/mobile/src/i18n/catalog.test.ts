import { describe, expect, it } from "vitest";
import { en } from "./en";
import { extraKeys } from "./translate";
import { TRANSLATIONS } from "./translations";

describe("string catalog (story 13.3 AC2)", () => {
  it.each(Object.entries(TRANSLATIONS))(
    "the %s translation only uses keys that exist in English",
    (_language, translation) => {
      expect(extraKeys(translation, en)).toEqual([]);
    },
  );

  it("keeps every English message non-empty", () => {
    const empty: string[] = [];
    const walk = (node: unknown, path: string): void => {
      if (typeof node === "string") {
        if (node.trim() === "") empty.push(path);
      } else if (node && typeof node === "object") {
        for (const [k, v] of Object.entries(node)) walk(v, path ? `${path}.${k}` : k);
      }
    };
    walk(en, "");
    expect(empty).toEqual([]);
  });
});
