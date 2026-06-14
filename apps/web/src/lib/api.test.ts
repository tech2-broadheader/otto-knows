import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ERROR_STATUS, fail, ok, validateBody } from "./api";

describe("ok()", () => {
  it("wraps data in a { data } envelope with 200 by default", async () => {
    const res = ok({ status: "ok" });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ data: { status: "ok" } });
  });

  it("honors a custom status code", () => {
    expect(ok({ created: true }, 201).status).toBe(201);
  });
});

describe("fail()", () => {
  it("wraps in a { error } envelope and maps code → canonical status", async () => {
    const res = fail("NOT_FOUND", "Missing");
    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({
      error: { code: "NOT_FOUND", message: "Missing" },
    });
  });

  it("maps each code to its documented status", () => {
    expect(fail("VALIDATION", "x").status).toBe(ERROR_STATUS.VALIDATION);
    expect(fail("UNAUTHORIZED", "x").status).toBe(401);
    expect(fail("FORBIDDEN", "x").status).toBe(403);
    expect(fail("CONFLICT", "x").status).toBe(409);
    expect(fail("INTERNAL", "x").status).toBe(500);
  });

  it("allows overriding the status code", () => {
    expect(fail("INTERNAL", "x", 503).status).toBe(503);
  });
});

describe("validateBody()", () => {
  const schema = z.object({ name: z.string().min(1) });

  it("returns typed data on a valid body", () => {
    const result = validateBody(schema, { name: "Otto" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name).toBe("Otto");
    }
  });

  it("returns a 400 fail response on an invalid body", async () => {
    const result = validateBody(schema, { name: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
      const json = (await result.response.json()) as { error: { code: string; message: string } };
      expect(json.error.code).toBe("VALIDATION");
      expect(json.error.message).toContain("name");
    }
  });
});
