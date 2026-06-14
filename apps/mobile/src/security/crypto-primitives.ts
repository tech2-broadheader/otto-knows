// expo-crypto-backed implementation of the injectable CryptoPrimitives + a
// default KeyStore. This file imports expo-crypto (native) and so must NOT be
// imported by pure unit tests — the pure transform lives in encryption.ts and
// takes these primitives by injection.
import * as Crypto from "expo-crypto";
import type { CryptoPrimitives, KeyStore } from "./encryption";

const KEY_LENGTH = 32; // 256-bit key

/** Production crypto primitives backed by expo-crypto's native secure random + SHA-256. */
export const expoCryptoPrimitives: CryptoPrimitives = {
  randomBytes(byteCount: number): Uint8Array {
    return Crypto.getRandomBytes(byteCount);
  },
  async sha256(input: Uint8Array): Promise<Uint8Array> {
    const buffer = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, input);
    return new Uint8Array(buffer);
  },
};

/**
 * In-memory key store. Generates a random 256-bit key on first use.
 *
 * TODO(security): the key must be persisted in and read from secure storage
 * (expo-secure-store / Android Keystore) before storing real data — GATE-3.
 * expo-secure-store is NOT installed yet; this in-memory store is a placeholder
 * so the data layer can be wired and tested. A fresh key each app launch means
 * ciphertext from a previous session is unreadable, which is acceptable only
 * pre-GATE-3 (no real data persisted).
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

/** The default production encryption primitives bundle. */
export const defaultCryptoPrimitives = expoCryptoPrimitives;
