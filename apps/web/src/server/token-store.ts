import type { GoogleTokenResponse } from "@/server/google-oauth";

/**
 * Token store (SERVER-ONLY) — Story 3.1 connector backend.
 *
 * Holds per-user, per-provider OAuth tokens so the calendar route can read on
 * the user's behalf. Tokens are SENSITIVE access credentials.
 *
 * // TODO: persist encrypted in Supabase; tokens are sensitive (DPA)
 *
 * No DB is wired yet, so the default implementation keeps tokens in memory for
 * the lifetime of the server process only. Never log token material (CLAUDE.md
 * §6, §11, §1.12 / ARCHITECTURE.md §9 — "tokens encrypted").
 */

/** Connector providers we hold tokens for. Calendar/Tasks share one Google grant. */
export type TokenProvider = "google";

/**
 * The stored token bundle. Mirrors Google's token response plus the absolute
 * expiry instant we compute on store, so callers can tell when to refresh.
 */
export type StoredToken = {
  accessToken: string;
  refreshToken?: string;
  scope: string;
  tokenType: string;
  /** Epoch milliseconds at which `accessToken` expires. */
  expiresAt: number;
};

/**
 * Per-user, per-provider token persistence. The real implementation will be
 * backed by encrypted Supabase rows; this interface lets routes and tests swap
 * in any store without changing call sites.
 */
export interface TokenStore {
  get(userId: string, provider: TokenProvider): Promise<StoredToken | undefined>;
  set(userId: string, provider: TokenProvider, token: StoredToken): Promise<void>;
}

/** Convert Google's token response into a `StoredToken`, computing absolute expiry. */
export function toStoredToken(
  response: GoogleTokenResponse,
  now: number = Date.now(),
): StoredToken {
  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    scope: response.scope,
    tokenType: response.token_type,
    expiresAt: now + response.expires_in * 1000,
  };
}

/** Compose the map key. Kept private so the key format never leaks to callers. */
function keyFor(userId: string, provider: TokenProvider): string {
  return `${provider}:${userId}`;
}

/**
 * In-memory `TokenStore` — the default until Supabase persistence lands.
 *
 * // TODO: persist encrypted in Supabase; tokens are sensitive (DPA)
 *
 * Tokens live only in this process and are lost on restart. Acceptable for the
 * Story 3.1 backend scaffold; NOT acceptable for production (no encryption, no
 * cross-instance sharing).
 */
export class InMemoryTokenStore implements TokenStore {
  private readonly tokens = new Map<string, StoredToken>();

  async get(userId: string, provider: TokenProvider): Promise<StoredToken | undefined> {
    return this.tokens.get(keyFor(userId, provider));
  }

  async set(userId: string, provider: TokenProvider, token: StoredToken): Promise<void> {
    this.tokens.set(keyFor(userId, provider), token);
  }
}

/**
 * Process-wide default store. Routes share this single instance so a token
 * stored by the callback is visible to the calendar route within the same
 * process. Replace with the Supabase-backed store once persistence is wired.
 */
export const defaultTokenStore: TokenStore = new InMemoryTokenStore();
