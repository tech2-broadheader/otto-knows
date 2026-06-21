// expo-crypto-backed implementation of the injectable CryptoPrimitives + a
// default KeyStore. This file imports expo-crypto (native) and so must NOT be
// imported by pure unit tests — the pure transform lives in encryption.ts and
// takes these primitives by injection.
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import type { CryptoPrimitives, KeyStore } from "./encryption";

const KEY_LENGTH = 32; // 256-bit key

/** SecureStore item key under which the base64 symmetric key is persisted. */
const SECURE_KEY_ID = "otto.encryption.key.v1";

/** Production crypto primitives backed by expo-crypto's native secure random + SHA-256. */
export const expoCryptoPrimitives: CryptoPrimitives = {
  randomBytes(byteCount: number): Uint8Array {
    return Crypto.getRandomBytes(byteCount);
  },
  async sha256(input: Uint8Array): Promise<Uint8Array> {
    // Copy into a fresh ArrayBuffer-backed view so the type is Uint8Array<ArrayBuffer>
    // (TS 5.9 made Uint8Array generic over its buffer; digest wants a BufferSource).
    const data = new Uint8Array(input);
    const buffer = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, data);
    return new Uint8Array(buffer);
  },
};

/**
 * In-memory key store. Generates a random 256-bit key on first use.
 *
 * Superseded as the default by createSecureStoreKeyStore() (key persistence,
 * GATE-3). Retained for tests and as a fallback when secure storage is
 * unavailable; with a fresh key each launch, ciphertext from a previous session
 * is unreadable, so it must NOT back real persisted data.
 */
export function createInMemoryKeyStore(): KeyStore {
  let key: Uint8Array | undefined;
  return {
    async getOrCreateKey(): Promise<Uint8Array> {
      if (!key) key = Crypto.getRandomBytes(KEY_LENGTH);
      return key;
    },
  };
}

function keyToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function keyFromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

/**
 * SecureStore-backed key store (GATE-3 key-persistence fix). The 256-bit
 * symmetric key is generated once and stored in the platform secure store
 * (Android Keystore / iOS Keychain via expo-secure-store) so it PERSISTS across
 * launches — encrypted data written in one session is readable in the next.
 *
 * The key is cached in memory after first read to avoid repeated secure-store
 * round-trips. Reads tolerate a corrupt/wrong-length stored value by
 * regenerating (the previous ciphertext becomes unreadable, but the store stays
 * functional rather than throwing on every access).
 *
 * Pairs with the real AES-256-GCM cipher in encryption.ts (@noble/ciphers): this
 * provides the persisted 256-bit key, that authenticates + encrypts the data.
 * GATE-3's technical encryption is now in place; the remaining GATE-3 item is the
 * DPA consent/encryption review (process, not code).
 */
export function createSecureStoreKeyStore(): KeyStore {
  let key: Uint8Array | undefined;
  return {
    async getOrCreateKey(): Promise<Uint8Array> {
      if (key) return key;

      const stored = await SecureStore.getItemAsync(SECURE_KEY_ID);
      if (stored) {
        const decoded = keyFromBase64(stored);
        if (decoded.length === KEY_LENGTH) {
          key = decoded;
          return key;
        }
        // Corrupt/legacy value — fall through to regenerate + overwrite.
      }

      const fresh = Crypto.getRandomBytes(KEY_LENGTH);
      await SecureStore.setItemAsync(SECURE_KEY_ID, keyToBase64(fresh));
      key = fresh;
      return key;
    },
  };
}

/** The default production encryption primitives bundle. */
export const defaultCryptoPrimitives = expoCryptoPrimitives;
