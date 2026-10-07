import { describe, expect, it } from "vitest";
import {
  PLANS,
  TRUST_LINE,
  FREE_VS_PAID_TAGLINE,
  ctaLabel,
  paidPlans,
  planById,
  plansForCurrency,
  priceLabel,
} from "./pricing";

describe("pricing plans", () => {
  it("includes the four spec plans in display order (free first)", () => {
    expect(PLANS.map((p) => p.id)).toEqual(["free", "pro-monthly", "pro-annual", "lifetime"]);
  });

  it("marks only the three paid plans as paid", () => {
    expect(paidPlans().map((p) => p.id)).toEqual(["pro-monthly", "pro-annual", "lifetime"]);
  });

  it("free plan has no purchase CTA (isPaid false, ₱0)", () => {
    const free = planById("free");
    expect(free?.isPaid).toBe(false);
    expect(free?.price).toBe("₱0");
  });

  it("looks plans up by id", () => {
    expect(planById("lifetime")?.name).toBe("Lifetime");
    // reason: cast exercises the not-found branch without widening the public type
    expect(planById("nope" as never)).toBeUndefined();
  });

  it("every paid plan carries the Pro benefit set", () => {
    for (const plan of paidPlans()) {
      expect(plan.benefits.length).toBeGreaterThan(0);
      expect(plan.benefits.some((b) => /optimizer/i.test(b))).toBe(true);
      expect(plan.benefits.some((b) => /caregiver/i.test(b))).toBe(true);
    }
  });

  it("free plan benefits describe the organizer, not the assistant", () => {
    const free = planById("free");
    expect(free?.benefits.some((b) => /remind/i.test(b))).toBe(true);
    expect(free?.benefits.some((b) => /optimizer/i.test(b))).toBe(false);
  });
});

describe("priceLabel", () => {
  it("renders ₱0 with no suffix for free", () => {
    expect(priceLabel(planById("free")!)).toBe("₱0");
  });
  it("attaches slash suffixes directly", () => {
    expect(priceLabel(planById("pro-monthly")!)).toBe("₱99/mo");
    expect(priceLabel(planById("pro-annual")!)).toBe("₱599/yr");
  });
  it("spaces a standalone-word suffix", () => {
    expect(priceLabel(planById("lifetime")!)).toBe("₱1,299 one-time");
  });
});

describe("display helpers", () => {
  it("builds a per-plan CTA label", () => {
    expect(ctaLabel(planById("pro-annual")!)).toBe("Choose Pro annual");
  });
  it("annual plan is flagged as best value without a currency-specific tagline", () => {
    const annual = planById("pro-annual");
    expect(annual?.badge).toBe("Best value");
    expect(annual?.tagline).toMatch(/billed yearly/);
    expect(annual?.tagline).not.toContain("₱");
  });
  it("trust line promises no ads (spec §2)", () => {
    expect(TRUST_LINE).toMatch(/no ads/i);
  });
  it("free-vs-paid tagline captures the mental model (spec §3)", () => {
    expect(FREE_VS_PAID_TAGLINE).toMatch(/remembers/i);
    expect(FREE_VS_PAID_TAGLINE).toMatch(/thinks/i);
  });
});

describe("plansForCurrency (international, story 13.1)", () => {
  it("keeps the placeholder PHP prices for PHP users", () => {
    expect(plansForCurrency(paidPlans(), "PHP").map((p) => p.price)).toEqual([
      "₱99",
      "₱599",
      "₱1,299",
    ]);
  });

  it("never shows peso prices to other currencies until the stores provide local prices", () => {
    const usd = plansForCurrency(paidPlans(), "USD");
    expect(usd.every((p) => p.price === "" && p.priceSuffix === "")).toBe(true);
    expect(JSON.stringify(usd)).not.toContain("₱");
  });
});
