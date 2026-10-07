import { z } from "zod";
import type { GoogleTokenResponse } from "@/server/google-oauth";
import { decryptJson, encryptJson, parseEncryptionKey } from "@/server/token-crypto";

/**
 * Token store (SERVER-ONLY) — stories 3.1 + 3.4.
 *
 * Holds per-user, per-provider OAuth tokens so the calendar route can read on
 * the user's behalf. Tokens are SENSITIVE access credentials: in production they
 * are encrypted (AES-256-GCM) before they reach Postgres, every access is
 * audit-logged, and token material is never logged or returned to clients
 * (CLAUDE.md §6, §11 / ARCHITECTURE.md §9).
 */

/** Connector providers we hold tokens for. Calendar/Tasks share one Google grant. */
export type TokenProvider = "google";

/**
 * The stored token bundle. Mirrors Google's token response plus the absolute
 * expiry instant we compute on store, so callers can tell when to refresh.
 */
export const storedTokenSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1).optional(),
  scope: z.string(),
  tokenType: z.string(),
  /** Epoch milliseconds at which `accessToken` expires. */
  expiresAt: z.number().int(),
});
export type StoredToken = z.infer<typeof storedTokenSchema>;

/** Per-user, per-provider token persistence; routes depend only on this. */
export interface TokenStore {
  get(userId: string, provider: TokenProvider): Promise<StoredToken | undefined>;
  set(userId: string, provider: TokenProvider, token: StoredToken): Promise<void>;
  delete(userId: string, provider: TokenProvider): Promise<void>;
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
 * In-memory `TokenStore` — local development only. Tokens live in this process
 * and are lost on restart; `getTokenStore()` never uses it in production.
 */
export class InMemoryTokenStore implements TokenStore {
  private readonly tokens = new Map<string, StoredToken>();

  async get(userId: string, provider: TokenProvider): Promise<StoredToken | undefined> {
    return this.tokens.get(keyFor(userId, provider));
  }

  async set(userId: string, provider: TokenProvider, token: StoredToken): Promise<void> {
    this.tokens.set(keyFor(userId, provider), token);
  }

  async delete(userId: string, provider: TokenProvider): Promise<void> {
    this.tokens.delete(keyFor(userId, provider));
  }
}

/** One encrypted row as persisted (see `connector_tokens` in db/schema.ts). */
export type TokenRow = {
  userId: string;
  provider: string;
  ciphertext: string;
  iv: string;
  keyVersion: number;
  expiresAt: Date;
};

/** Persistence port for encrypted rows — Postgres in production, a Map in tests. */
export interface TokenRowStore {
  get(userId: string, provider: string): Promise<TokenRow | undefined>;
  upsert(row: TokenRow): Promise<void>;
  delete(userId: string, provider: string): Promise<void>;
}

/** Server-side audit trail port (Tier 3). Never receives record contents. */
export interface AuditSink {
  record(event: { userId: string; entity: string; action: string }): Promise<void>;
}

const AUDIT_ENTITY = "connector_token";
/** Bump when TOKEN_ENCRYPTION_KEY is rotated; rows keep the version they were sealed with. */
const CURRENT_KEY_VERSION = 1;

/** AAD binding a sealed token to its owner and provider. */
function aadFor(userId: string, provider: string): string {
  return `${userId}:${provider}`;
}

/** Encrypts on write, decrypts on read, audit-logs every access, fails closed. */
export class EncryptedTokenStore implements TokenStore {
  constructor(
    private readonly rows: TokenRowStore,
    private readonly key: Buffer,
    private readonly audit: AuditSink,
  ) {}

  async get(userId: string, provider: TokenProvider): Promise<StoredToken | undefined> {
    const row = await this.rows.get(userId, provider);
    if (!row) return undefined;
    await this.audit.record({ userId, entity: AUDIT_ENTITY, action: "read" });
    try {
      // Rows sealed with another key version can't be read with this key; treat
      // them as not connected until key rotation support exists.
      if (row.keyVersion !== CURRENT_KEY_VERSION) return undefined;
      const parsed = storedTokenSchema.safeParse(
        decryptJson(row, this.key, aadFor(userId, provider)),
      );
      // A row we can't decrypt or that isn't a token bundle reads as "not
      // connected": the user reconnects rather than us using garbage credentials.
      return parsed.success ? parsed.data : undefined;
    } catch {
      return undefined;
    }
  }

  async set(userId: string, provider: TokenProvider, token: StoredToken): Promise<void> {
    const sealed = encryptJson(
      storedTokenSchema.parse(token),
      this.key,
      CURRENT_KEY_VERSION,
      aadFor(userId, provider),
    );
    await this.rows.upsert({ userId, provider, ...sealed, expiresAt: new Date(token.expiresAt) });
    await this.audit.record({ userId, entity: AUDIT_ENTITY, action: "write" });
  }

  async delete(userId: string, provider: TokenProvider): Promise<void> {
    await this.rows.delete(userId, provider);
    await this.audit.record({ userId, entity: AUDIT_ENTITY, action: "delete" });
  }
}

export type TokenStoreKind = "encrypted" | "memory" | "unconfigured";

/**
 * Which store to use. Production never keeps credentials in process memory:
 * without both a database and an encryption key it is "unconfigured".
 */
export function selectTokenStoreKind(env: {
  production: boolean;
  dbConfigured: boolean;
  hasKey: boolean;
}): TokenStoreKind {
  if (env.dbConfigured && env.hasKey) return "encrypted";
  return env.production ? "unconfigured" : "memory";
}

// The PROMISE is cached so concurrent first requests share one store (two
// in-memory stores would silently lose tokens written to the other one).
let cached: Promise<TokenStore | null> | undefined;

/**
 * The process-wide token store, or null when production lacks a database or
 * TOKEN_ENCRYPTION_KEY (routes then answer "not configured"). Shared so a token
 * stored by the OAuth callback is visible to the calendar route.
 */
export function getTokenStore(): Promise<TokenStore | null> {
  cached ??= createTokenStore();
  return cached;
}

async function createTokenStore(): Promise<TokenStore | null> {
  const { isDbConfigured } = await import("@/server/db/client");
  const rawKey = process.env.TOKEN_ENCRYPTION_KEY;
  const kind = selectTokenStoreKind({
    production: process.env.NODE_ENV === "production",
    dbConfigured: isDbConfigured(),
    hasKey: !!rawKey,
  });
  if (kind === "encrypted" && rawKey) {
    const { DbAuditSink, DbTokenRowStore } = await import("@/server/token-store-db");
    return new EncryptedTokenStore(
      new DbTokenRowStore(),
      parseEncryptionKey(rawKey),
      new DbAuditSink(),
    );
  }
  return kind === "memory" ? new InMemoryTokenStore() : null;
}
