import { describe, expect, it } from "vitest";
import { FREE_CAPS, isAtCap, remainingBeforeCap, upgradePromptFor } from "./caps";

describe("free caps", () => {
  it("is not at cap below the limit", () => {
    expect(isAtCap("bills", FREE_CAPS.bills - 1)).toBe(false);
  });
  it("is at cap at the limit", () => {
    expect(isAtCap("bills", FREE_CAPS.bills)).toBe(true);
  });
  it("is at cap above the limit (defensive)", () => {
    expect(isAtCap("medications", FREE_CAPS.medications + 2)).toBe(true);
  });
  it("reports remaining slots", () => {
    expect(remainingBeforeCap("budgetCategories", 1)).toBe(FREE_CAPS.budgetCategories - 1);
  });
  it("never reports negative remaining", () => {
    expect(remainingBeforeCap("bills", 99)).toBe(0);
  });
  it("builds an upgrade prompt mentioning the cap", () => {
    expect(upgradePromptFor("bills")).toContain(String(FREE_CAPS.bills));
  });
  it("allows 3 active wallets on the free plan (story 11.2)", () => {
    expect(FREE_CAPS.wallets).toBe(3);
    expect(isAtCap("wallets", 2)).toBe(false);
    expect(isAtCap("wallets", 3)).toBe(true);
    expect(upgradePromptFor("wallets")).toBe(
      "Free plan includes up to 3 wallets. Upgrade to Pro for unlimited.",
    );
  });
});
