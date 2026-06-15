import { describe, expect, it } from "vitest";
import { isValidEmail, isValidPassword, validateCredentials } from "./auth-input";

describe("isValidEmail", () => {
  it("accepts an address with text on both sides of @", () => {
    expect(isValidEmail("a@b.co")).toBe(true);
    expect(isValidEmail("  tech@broadheader.com  ")).toBe(true);
  });

  it("rejects empty, @-less, or edge-@ strings", () => {
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail("nobody")).toBe(false);
    expect(isValidEmail("@nope.com")).toBe(false);
    expect(isValidEmail("nope@")).toBe(false);
  });
});

describe("isValidPassword", () => {
  it("accepts any non-empty password and rejects empty", () => {
    expect(isValidPassword("x")).toBe(true);
    expect(isValidPassword("")).toBe(false);
  });
});

describe("validateCredentials", () => {
  it("returns null when both fields are good", () => {
    expect(validateCredentials("tech@broadheader.com", "secret")).toBeNull();
  });

  it("flags the first problem in order: email empty, email shape, password", () => {
    expect(validateCredentials("", "secret")).toBe("Enter your email.");
    expect(validateCredentials("bad", "secret")).toBe("That email doesn't look right.");
    expect(validateCredentials("tech@broadheader.com", "")).toBe("Enter your password.");
  });
});
