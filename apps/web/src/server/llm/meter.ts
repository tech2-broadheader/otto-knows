import type { LlmUsage } from "./client";

/**
 * Usage metering + rate limiting + free-tier quota for the LLM proxy.
 *
 * Every paid user costs API spend (spec §12), so the free tier is quota-capped
 * and all callers are rate-limited. This is an IN-MEMORY, per-instance
 * implementation — fine for a single node / dev. TODO(scale): back rate limits
 * and quota with a shared store (Redis/Postgres) before multi-instance deploy.
 */

const RATE_WINDOW_MS = 60_000;
const RATE_MAX_PER_WINDOW = 20;
const rateHits = new Map<string, number[]>();

/** True if the caller is within the per-minute request budget. Records the hit. */
export function checkRateLimit(userId: string, nowMs: number): boolean {
  const recent = (rateHits.get(userId) ?? []).filter((t) => nowMs - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_MAX_PER_WINDOW) {
    rateHits.set(userId, recent);
    return false;
  }
  recent.push(nowMs);
  rateHits.set(userId, recent);
  return true;
}

const quota = new Map<string, { date: string; count: number }>();

/**
 * Consume one free-tier quick-add from the caller's daily quota. Returns false
 * when the cap is reached. Pro callers should skip this check entirely.
 */
export function checkAndConsumeQuota(userId: string, date: string, dailyMax: number): boolean {
  const entry = quota.get(userId);
  if (!entry || entry.date !== date) {
    quota.set(userId, { date, count: 1 });
    return true;
  }
  if (entry.count >= dailyMax) return false;
  entry.count += 1;
  return true;
}

/** Record metered usage. Never logs prompt content — only token counts. */
export function recordUsage(userId: string, feature: string, usage: LlmUsage): void {
  console.info(
    `[llm-usage] user=${userId} feature=${feature} in=${usage.inputTokens} out=${usage.outputTokens}`,
  );
}

/** Free-tier daily quick-add allowance (spec §8 "small daily quota"). */
export const FREE_QUICK_ADD_DAILY = 5;
