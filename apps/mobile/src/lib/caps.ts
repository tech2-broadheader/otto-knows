// Free-tier caps (epics 3.2 / 9.2). Enforced client-side for the local free tier;
// the cloud backend re-enforces server-side for Pro routes (ARCHITECTURE §8).
// Pure; no native imports — unit-tested in Node.
import { t } from "../i18n";

/** Maximum number of each capped entity a free-tier user may create. */
export const FREE_CAPS = {
  bills: 5,
  medications: 3,
  budgetCategories: 4,
  // Active (non-archived) wallets, including the default Cash (story 11.2).
  wallets: 3,
} as const;

export type CappedEntity = keyof typeof FREE_CAPS;

/** True when the current count is at (or above) the free cap for that entity. */
export function isAtCap(entity: CappedEntity, currentCount: number): boolean {
  return currentCount >= FREE_CAPS[entity];
}

/** Slots remaining before the free cap is hit (never negative). */
export function remainingBeforeCap(entity: CappedEntity, currentCount: number): number {
  return Math.max(0, FREE_CAPS[entity] - currentCount);
}

/** User-facing upgrade prompt shown when an entity hits its free cap. */
export function upgradePromptFor(entity: CappedEntity): string {
  return t(`account.caps.upgradePrompt.${entity}`, { cap: FREE_CAPS[entity] });
}
