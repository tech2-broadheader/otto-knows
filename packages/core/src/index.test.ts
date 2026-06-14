import { describe, expect, it } from "vitest";
import { greeting } from "./index";

describe("greeting", () => {
  it("addresses the user by name", () => {
    expect(greeting("Otto")).toBe("Otto knows your day, Otto.");
  });
});
