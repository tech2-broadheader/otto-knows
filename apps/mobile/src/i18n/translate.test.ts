import { describe, expect, it } from "vitest";
import { createTranslator, extraKeys, interpolate } from "./translate";

const base = {
  common: { save: "Save", hello: "Hello, {name}!" },
  reminders: { open_one: "{count} open", open_other: "{count} open items" },
} as const;

describe("interpolate", () => {
  it("fills {placeholders} and leaves unknown ones visible", () => {
    expect(interpolate("Hi {name}, {n} left", { name: "Ana", n: 3 })).toBe("Hi Ana, 3 left");
    expect(interpolate("Hi {name}", {})).toBe("Hi {name}");
  });
});

describe("createTranslator", () => {
  it("looks up dotted keys and interpolates", () => {
    const t = createTranslator(base, "en");
    expect(t("common.save")).toBe("Save");
    expect(t("common.hello", { name: "Ana" })).toBe("Hello, Ana!");
  });

  it("picks the plural form from {count}", () => {
    const t = createTranslator(base, "en");
    expect(t("reminders.open", { count: 1 })).toBe("1 open");
    expect(t("reminders.open", { count: 4 })).toBe("4 open items");
  });

  it("uses the translation and falls back to English for missing keys", () => {
    const t = createTranslator(base, "fil", { common: { save: "I-save" } });
    expect(t("common.save")).toBe("I-save");
    expect(t("common.hello", { name: "Ana" })).toBe("Hello, Ana!");
  });
});

describe("extraKeys", () => {
  it("lists keys a translation has that English doesn't (a typo or a stale key)", () => {
    const translation = { common: { save: "Guardar", sav: "typo" }, nope: { x: "y" } };
    expect(extraKeys(translation, base)).toEqual(["common.sav", "nope.x"]);
    expect(extraKeys({ common: { save: "Guardar" } }, base)).toEqual([]);
  });
});
