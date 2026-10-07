import { describe, expect, it } from "vitest";
import { noteSchema, proposalActionSchema } from "./index";

const ISO = "2026-10-08T08:00:00+08:00";
const UUID = "11111111-1111-4111-8111-111111111111";
const note = { id: UUID, userId: UUID, body: "Buy gift for Ana", createdAt: ISO, updatedAt: ISO };

describe("noteSchema", () => {
  it("accepts a body-only note and defaults pinned to false", () => {
    const parsed = noteSchema.parse(note);
    expect(parsed.pinned).toBe(false);
    expect(parsed.title).toBeUndefined();
  });

  it("bounds the title (120) and body (1-10,000)", () => {
    expect(noteSchema.safeParse({ ...note, title: "x".repeat(121) }).success).toBe(false);
    expect(noteSchema.safeParse({ ...note, body: "" }).success).toBe(false);
    expect(noteSchema.safeParse({ ...note, body: "x".repeat(10_000) }).success).toBe(true);
    expect(noteSchema.safeParse({ ...note, body: "x".repeat(10_001) }).success).toBe(false);
  });
});

describe("add_note proposal", () => {
  it("is a valid proposal action", () => {
    const action = { type: "add_note", note: { title: "Gift", body: "Buy gift for Ana" } };
    expect(proposalActionSchema.safeParse(action).success).toBe(true);
    expect(proposalActionSchema.safeParse({ type: "add_note", note: { body: "" } }).success).toBe(
      false,
    );
  });
});
