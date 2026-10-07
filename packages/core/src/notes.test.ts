import { describe, expect, it } from "vitest";
import type { Note } from "@otto/schemas";
import { orderNotes, reminderDraftFromNote, searchNotes } from "./notes";

const USER = "00000000-0000-4000-8000-000000000001";
let seq = 0;
function note(body: string, extra: Partial<Note> = {}): Note {
  seq += 1;
  return {
    id: `00000000-0000-4000-8000-${String(seq).padStart(12, "0")}`,
    userId: USER,
    body,
    pinned: false,
    createdAt: "2026-10-01T08:00:00+08:00",
    updatedAt: "2026-10-01T08:00:00+08:00",
    ...extra,
  };
}

describe("orderNotes", () => {
  it("puts pinned notes first, then the most recently updated", () => {
    const old = note("old", { updatedAt: "2026-10-01T08:00:00+08:00" });
    const fresh = note("fresh", { updatedAt: "2026-10-07T08:00:00+08:00" });
    const pinnedOld = note("pinned", { pinned: true, updatedAt: "2026-09-01T08:00:00+08:00" });
    expect(orderNotes([old, fresh, pinnedOld]).map((n) => n.body)).toEqual([
      "pinned",
      "fresh",
      "old",
    ]);
  });

  it("does not mutate the input", () => {
    const list = [note("a"), note("b", { pinned: true })];
    orderNotes(list);
    expect(list.map((n) => n.body)).toEqual(["a", "b"]);
  });
});

describe("searchNotes", () => {
  const notes = [
    note("Buy gift for Ana", { title: "Birthday" }),
    note("Call the bank about the card"),
  ];

  it("matches title or body, ignoring case and surrounding spaces", () => {
    expect(searchNotes(notes, "  ANA ").map((n) => n.title)).toEqual(["Birthday"]);
    expect(searchNotes(notes, "birthday")).toHaveLength(1);
    expect(searchNotes(notes, "bank")).toHaveLength(1);
  });

  it("returns everything for an empty query", () => {
    expect(searchNotes(notes, "   ")).toHaveLength(2);
  });
});

describe("reminderDraftFromNote", () => {
  it("uses the title when there is one, and the body as the reminder notes", () => {
    expect(reminderDraftFromNote(note("Buy gift for Ana", { title: "Birthday" }))).toEqual({
      title: "Birthday",
      notes: "Buy gift for Ana",
    });
  });

  it("falls back to the first line of the body, trimmed to 140 characters", () => {
    const long = `${"x".repeat(200)}\nsecond line`;
    const draft = reminderDraftFromNote(note(long));
    expect(draft.title).toBe("x".repeat(140));
  });

  it("keeps reminder notes within their 2,000 character limit", () => {
    const draft = reminderDraftFromNote(note("y".repeat(5000), { title: "Long" }));
    expect(draft.notes).toHaveLength(2000);
  });
});
