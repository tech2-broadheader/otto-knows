// Plan data + display helpers for the Upgrade / Pro paywall (spec §8–§9).
// PURE: no native/expo imports, unit-tested in Node. Presentational copy only.
//
// IMPORTANT: prices below are DISPLAY STRINGS for the paywall, not the source of
// truth. Real pricing, currency, and store SKUs come from the billing layer
// (RevenueCat / store products) once it lands.
// TODO(E9 monetization): replace these display strings + planId values with the
// real products resolved from billing; verify amounts against current PH pricing
// before launch (spec §9, §14 "Pricing validation").

/** Stable identifiers for each plan. Map to real billing SKUs in E9. */
export type PlanId = "free" | "pro-monthly" | "pro-annual" | "lifetime";

/** Billing rhythm — drives how the price is described. */
export type PlanCadence = "free" | "monthly" | "annual" | "one-time";

export type Plan = {
  id: PlanId;
  /** Short plan name shown as the card title. */
  name: string;
  /** Display price (e.g. "₱99"). TODO(E9): real amount from billing. */
  price: string;
  /** Unit suffix for the price (e.g. "/mo", "/yr", "one-time", or ""). */
  priceSuffix: string;
  cadence: PlanCadence;
  /** One-line positioning shown under the price. */
  tagline: string;
  /** Headline benefits listed on the card. */
  benefits: readonly string[];
  /** Optional badge (e.g. "Best value") for emphasis. */
  badge?: string;
  /** True for paid plans that get a purchase CTA. Free has no CTA. */
  isPaid: boolean;
};

/**
 * The plans shown on the paywall, in display order. Free first as the anchor,
 * then the three paid options (spec §9 pricing table).
 */
export const PLANS: readonly Plan[] = [
  {
    id: "free",
    name: "Free",
    price: "₱0",
    priceSuffix: "",
    cadence: "free",
    tagline: "It remembers and reminds.",
    benefits: [
      "Calendar, reminders & events",
      "Manual finance + basic monthly budget",
      "A fixed daily routine",
      "Routine-timed reminders & a basic daily brief",
      "A few quick-adds each day",
    ],
    isPaid: false,
  },
  {
    id: "pro-monthly",
    name: "Pro monthly",
    price: "₱99",
    priceSuffix: "/mo",
    cadence: "monthly",
    tagline: "It thinks and adjusts.",
    benefits: PRO_BENEFITS(),
    isPaid: true,
  },
  {
    id: "pro-annual",
    name: "Pro annual",
    price: "₱599",
    priceSuffix: "/yr",
    cadence: "annual",
    tagline: "Everything in Pro — about ₱50/mo, billed yearly.",
    benefits: PRO_BENEFITS(),
    badge: "Best value",
    isPaid: true,
  },
  {
    id: "lifetime",
    name: "Lifetime",
    price: "₱1,299",
    priceSuffix: "one-time",
    cadence: "one-time",
    tagline: "Pay once, keep Pro forever — no subscription.",
    benefits: PRO_BENEFITS(),
    isPaid: true,
  },
];

/** The shared Pro benefit list (spec §8 "Paid — the actual assistant"). */
function PRO_BENEFITS(): readonly string[] {
  return [
    "Conversational AI — unlimited natural language",
    "Adaptive routine that learns your real rhythm",
    "Routine optimizer — reshape your day, you confirm",
    "Gentle finance & health tips",
    "Cross-domain insights & forecasts",
    "Cloud backup, cross-device sync & export",
    "Caregiver / family mode",
    "Widgets",
  ];
}

/** The no-ads trust line shown on the paywall (spec §2). */
export const TRUST_LINE =
  "You pay us instead of being sold — no ads, ever. Your money-and-meds data is never used to advertise to you.";

/** The one-line free-vs-paid mental model (spec §3). */
export const FREE_VS_PAID_TAGLINE = "Free remembers and reminds. Pro thinks and adjusts.";

/** All paid plans (the ones that get a purchase CTA). */
export function paidPlans(): readonly Plan[] {
  return PLANS.filter((plan) => plan.isPaid);
}

/** Look up a plan by id, or undefined if unknown. */
export function planById(id: PlanId): Plan | undefined {
  return PLANS.find((plan) => plan.id === id);
}

/**
 * Full price label for display, e.g. "₱99/mo", "₱1,299 one-time", "₱0".
 * Joins price + suffix with a space only when the suffix is a standalone word.
 */
export function priceLabel(plan: Plan): string {
  if (plan.priceSuffix === "") return plan.price;
  // "/mo" and "/yr" attach directly; "one-time" reads as a separate word.
  const attached = plan.priceSuffix.startsWith("/");
  return attached ? `${plan.price}${plan.priceSuffix}` : `${plan.price} ${plan.priceSuffix}`;
}

/** Accessible CTA label for a paid plan (no CTA for Free). */
export function ctaLabel(plan: Plan): string {
  return `Choose ${plan.name}`;
}
