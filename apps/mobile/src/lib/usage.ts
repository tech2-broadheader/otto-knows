// Lightweight local usage counters (not sensitive) used to pace the Pro offer:
// we count how many sessions reach the main app, and remember once we've offered
// Pro so it's a one-time, non-nagging prompt. Persisted via expo-secure-store
// (already a dependency; the values are trivial, just convenient to store there).
import * as SecureStore from "expo-secure-store";

const LAUNCH_KEY = "otto.launchCount.v1";
const OFFER_KEY = "otto.proOfferShown.v1";

/** Offer Pro once the user has reached the main app this many times. */
export const PRO_OFFER_AFTER_LAUNCHES = 3;

/** Increment and return the number of sessions that have reached the main app. */
export async function recordLaunch(): Promise<number> {
  try {
    const current = Number((await SecureStore.getItemAsync(LAUNCH_KEY)) ?? "0");
    const next = Number.isFinite(current) ? current + 1 : 1;
    await SecureStore.setItemAsync(LAUNCH_KEY, String(next));
    return next;
  } catch {
    return 1; // storage unavailable — never block, just don't pace
  }
}

/** True once we've already shown the one-time Pro offer. */
export async function proOfferShown(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(OFFER_KEY)) === "1";
  } catch {
    return true; // if unsure, err toward NOT nagging
  }
}

export async function markProOfferShown(): Promise<void> {
  try {
    await SecureStore.setItemAsync(OFFER_KEY, "1");
  } catch {
    // best-effort
  }
}
