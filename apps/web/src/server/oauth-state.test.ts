import { describe, expect, it } from "vitest";
import { createOAuthState, verifyOAuthState } from "./oauth-state";

const SECRET = "test-client-secret";
const USER = "00000000-0000-4000-8000-000000000001";
const NOW = 1_800_000_000_000;

describe("OAuth state", () => {
  it("verifies a state issued to the same user within its lifetime", () => {
    const state = createOAuthState(USER, SECRET, NOW);
    expect(verifyOAuthState(state, USER, SECRET, NOW + 60_000)).toBe(true);
  });

  it("rejects a state issued to someone else", () => {
    const state = createOAuthState(USER, SECRET, NOW);
    expect(verifyOAuthState(state, "00000000-0000-4000-8000-000000000002", SECRET, NOW)).toBe(
      false,
    );
  });

  it("rejects an expired state (older than 10 minutes)", () => {
    const state = createOAuthState(USER, SECRET, NOW);
    expect(verifyOAuthState(state, USER, SECRET, NOW + 10 * 60_000 + 1)).toBe(false);
  });

  it("rejects a forged or tampered state", () => {
    const state = createOAuthState(USER, SECRET, NOW);
    expect(verifyOAuthState(state, USER, "other-secret", NOW)).toBe(false);
    expect(verifyOAuthState(`${state}x`, USER, SECRET, NOW)).toBe(false);
    expect(verifyOAuthState("not-a-state", USER, SECRET, NOW)).toBe(false);
    expect(verifyOAuthState("", USER, SECRET, NOW)).toBe(false);
  });

  it("is unique per request", () => {
    expect(createOAuthState(USER, SECRET, NOW)).not.toBe(createOAuthState(USER, SECRET, NOW));
  });
});
