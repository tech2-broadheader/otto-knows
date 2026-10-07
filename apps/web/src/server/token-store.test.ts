import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { encryptJson, parseEncryptionKey } from "./token-crypto";
import {
  EncryptedTokenStore,
  selectTokenStoreKind,
  type AuditSink,
  type StoredToken,
  type TokenRow,
  type TokenRowStore,
} from "./token-store";

const USER = "00000000-0000-4000-8000-000000000001";
const KEY = parseEncryptionKey(randomBytes(32).toString("base64"));
const TOKEN: StoredToken = {
  accessToken: "ya29.access",
  refreshToken: "1//refresh",
  scope: "https://www.googleapis.com/auth/calendar.readonly",
  tokenType: "Bearer",
  expiresAt: 1_800_000_000_000,
};

class MemoryRows implements TokenRowStore {
  readonly rows = new Map<string, TokenRow>();
  async get(userId: string, provider: string): Promise<TokenRow | undefined> {
    return this.rows.get(`${provider}:${userId}`);
  }
  async upsert(row: TokenRow): Promise<void> {
    this.rows.set(`${row.provider}:${row.userId}`, row);
  }
  async delete(userId: string, provider: string): Promise<void> {
    this.rows.delete(`${provider}:${userId}`);
  }
}

class MemoryAudit implements AuditSink {
  readonly events: { userId: string; entity: string; action: string }[] = [];
  async record(event: { userId: string; entity: string; action: string }): Promise<void> {
    this.events.push(event);
  }
}

function setup(): { rows: MemoryRows; audit: MemoryAudit; store: EncryptedTokenStore } {
  const rows = new MemoryRows();
  const audit = new MemoryAudit();
  return { rows, audit, store: new EncryptedTokenStore(rows, KEY, audit) };
}

describe("EncryptedTokenStore", () => {
  it("stores tokens encrypted and reads them back", async () => {
    const { rows, store } = setup();
    await store.set(USER, "google", TOKEN);

    const row = rows.rows.get(`google:${USER}`);
    expect(row?.ciphertext).not.toContain("ya29");
    expect(row?.keyVersion).toBe(1);
    expect(row?.expiresAt.getTime()).toBe(TOKEN.expiresAt);
    expect(await store.get(USER, "google")).toEqual(TOKEN);
  });

  it("returns undefined when nothing is stored", async () => {
    expect(await setup().store.get(USER, "google")).toBeUndefined();
  });

  it("deletes the stored token (disconnect)", async () => {
    const { store } = setup();
    await store.set(USER, "google", TOKEN);
    await store.delete(USER, "google");
    expect(await store.get(USER, "google")).toBeUndefined();
  });

  it("fails closed on a corrupt or tampered row", async () => {
    const { rows, store } = setup();
    await store.set(USER, "google", TOKEN);
    const row = rows.rows.get(`google:${USER}`)!;
    rows.rows.set(`google:${USER}`, {
      ...row,
      ciphertext: Buffer.from("garbage").toString("base64"),
    });
    expect(await store.get(USER, "google")).toBeUndefined();
  });

  it("fails closed when the decrypted shape is wrong", async () => {
    const { rows, store } = setup();
    await store.set(USER, "google", TOKEN);
    const row = rows.rows.get(`google:${USER}`)!;
    // A validly encrypted value that isn't a token bundle.
    const sealed = encryptJson({ unexpected: true }, KEY, 1);
    rows.rows.set(`google:${USER}`, { ...row, ciphertext: sealed.ciphertext, iv: sealed.iv });
    expect(await store.get(USER, "google")).toBeUndefined();
  });

  it("refuses a token row copied from another user", async () => {
    const { rows, store } = setup();
    const OTHER = "00000000-0000-4000-8000-000000000002";
    await store.set(USER, "google", TOKEN);
    const stolen = rows.rows.get(`google:${USER}`)!;
    rows.rows.set(`google:${OTHER}`, { ...stolen, userId: OTHER });
    expect(await store.get(OTHER, "google")).toBeUndefined();
  });

  it("audit-logs every access without any token material", async () => {
    const { audit, store } = setup();
    await store.set(USER, "google", TOKEN);
    await store.get(USER, "google");
    await store.delete(USER, "google");
    expect(audit.events).toEqual([
      { userId: USER, entity: "connector_token", action: "write" },
      { userId: USER, entity: "connector_token", action: "read" },
      { userId: USER, entity: "connector_token", action: "delete" },
    ]);
    expect(JSON.stringify(audit.events)).not.toContain("ya29");
  });
});

describe("selectTokenStoreKind", () => {
  it("uses the encrypted database store when both DB and key are configured", () => {
    expect(selectTokenStoreKind({ production: true, dbConfigured: true, hasKey: true })).toBe(
      "encrypted",
    );
    expect(selectTokenStoreKind({ production: false, dbConfigured: true, hasKey: true })).toBe(
      "encrypted",
    );
  });

  it("falls back to memory only outside production", () => {
    expect(selectTokenStoreKind({ production: false, dbConfigured: false, hasKey: false })).toBe(
      "memory",
    );
    expect(selectTokenStoreKind({ production: false, dbConfigured: true, hasKey: false })).toBe(
      "memory",
    );
  });

  it("refuses to keep tokens in memory in production", () => {
    expect(selectTokenStoreKind({ production: true, dbConfigured: true, hasKey: false })).toBe(
      "unconfigured",
    );
    expect(selectTokenStoreKind({ production: true, dbConfigured: false, hasKey: true })).toBe(
      "unconfigured",
    );
  });
});
