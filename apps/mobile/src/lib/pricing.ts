// Plan data + display helpers for the Upgrade / Pro paywall (spec §8–§9).
// PURE: no native/expo imports, unit-tested in Node. Presentational copy only.
//
// IMPORTANT: prices below are DISPLAY STRINGS for the paywall, not the source of
// truth. Real pricing, currency, and store SKUs come from the billing layer
// (RevenueCat / store products) once it lands.
// TODO(E9 monetization): replace these display strings + planId values with the
// real products resolved from billing; verify amounts against current PH pricing
// before launch (spec §9, §14 "Pricing validation").
import { t } from "../i18n";

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
    name: t("account.plans.free.name"),
    price: "₱0",
    priceSuffix: "",
    cadence: "free",
    tagline: t("account.plans.free.tagline"),
    benefits: [
      t("account.plans.freeBenefits.calendar"),
      t("account.plans.freeBenefits.finance"),
      t("account.plans.freeBenefits.routine"),
      t("account.plans.freeBenefits.reminders"),
      t("account.plans.freeBenefits.quickAdds"),
    ],
    isPaid: false,
  },
  {
    id: "pro-monthly",
    name: t("account.plans.proMonthly.name"),
    price: "₱99",
    priceSuffix: "/mo",
    cadence: "monthly",
    tagline: t("account.plans.proMonthly.tagline"),
    benefits: PRO_BENEFITS(),
    isPaid: true,
  },
  {
    id: "pro-annual",
    name: t("account.plans.proAnnual.name"),
    price: "₱599",
    priceSuffix: "/yr",
    cadence: "annual",
    tagline: t("account.plans.proAnnual.tagline"),
    benefits: PRO_BENEFITS(),
    badge: t("account.plans.bestValue"),
    isPaid: true,
  },
  {
    id: "lifetime",
    name: t("account.plans.lifetime.name"),
    price: "₱1,299",
    priceSuffix: t("account.plans.suffixOneTime"),
    cadence: "one-time",
    tagline: t("account.plans.lifetime.tagline"),
    benefits: PRO_BENEFITS(),
    isPaid: true,
  },
];

/** The shared Pro benefit list (spec §8 "Paid — the actual assistant"). */
function PRO_BENEFITS(): readonly string[] {
  return [
    t("account.plans.proBenefits.ai"),
    t("account.plans.proBenefits.adaptive"),
    t("account.plans.proBenefits.optimizer"),
    t("account.plans.proBenefits.tips"),
    t("account.plans.proBenefits.insights"),
    t("account.plans.proBenefits.sync"),
    t("account.plans.proBenefits.caregiver"),
    t("account.plans.proBenefits.widgets"),
  ];
}

/** The no-ads trust line shown on the paywall (spec §2). */
export const TRUST_LINE = t("account.plans.trustLine");

/** The one-line free-vs-paid mental model (spec §3). */
export const FREE_VS_PAID_TAGLINE = t("account.plans.freeVsPaid");

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
  return t("account.plans.choose", { plan: plan.name });
}

/**
 * Plans as shown to a user with this home currency. The placeholder prices are
 * PHP; anyone else sees no amount (the paywall says "Price at checkout") until
 * the app stores supply local prices per country (E9 / story 9.6).
 */
export function plansForCurrency(plans: readonly Plan[], currency: string): Plan[] {
  if (currency === "PHP") return [...plans];
  return plans.map((plan) => ({ ...plan, price: "", priceSuffix: "" }));
}
