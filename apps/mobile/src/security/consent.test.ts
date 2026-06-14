import { describe, expect, it } from "vitest";
import type { Consent } from "@otto/schemas";
import { ConsentRequiredError, isConsentGranted, requireConsent } from "./consent";

function consent(overrides: Partial<Consent>): Consent {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    userId: "22222222-2222-4222-8222-222222222222",
    source: "calendar",
    granted: true,
    purpose: "Read today's events for your briefing",
    policyVersion: "2026-06-14",
    grantedAt: "2026-06-14T08:00:00+08:00",
    revokedAt: undefined,
    ...overrides,
  };
}

describe("isConsentGranted (pure decision)", () => {
  it("true when a granted, non-revoked consent for the source exists", () => {
    expect(isConsentGranted([consent({})], "calendar")).toBe(true);
  });

  it("false when no consent record for the source", () => {
    expect(isConsentGranted([consent({ source: "calendar" })], "finance")).toBe(false);
  });

  it("false when granted is false", () => {
    expect(isConsentGranted([consent({ granted: false, grantedAt: undefined })], "calendar")).toBe(
      false,
    );
  });

  it("false when revoked", () => {
    expect(
      isConsentGranted([consent({ revokedAt: "2026-06-14T09:00:00+08:00" })], "calendar"),
    ).toBe(false);
  });

  it("false on empty consent list", () => {
    expect(isConsentGranted([], "calendar")).toBe(false);
  });
});

describe("requireConsent guard", () => {
  it("does not throw when consent is granted", () => {
    expect(() => requireConsent([consent({})], "calendar")).not.toThrow();
  });

  it("throws ConsentRequiredError when refused", () => {
    expect(() => requireConsent([], "finance")).toThrow(ConsentRequiredError);
  });
});
