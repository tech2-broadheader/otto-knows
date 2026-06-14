import { describe, expect, it } from "vitest";
import { appInfoSchema } from "./index";

describe("appInfoSchema", () => {
  it("accepts a valid app info object", () => {
    const result = appInfoSchema.safeParse({ name: "otto", version: "0.1.0" });
    expect(result.success).toBe(true);
  });

  it("rejects a wrong app name", () => {
    const result = appInfoSchema.safeParse({ name: "not-otto", version: "0.1.0" });
    expect(result.success).toBe(false);
  });
});
