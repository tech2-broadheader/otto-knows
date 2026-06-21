// Encryption-at-rest for SENSITIVE fields (CLAUDE.md §6, §11; story 1.3 AC3; GATE-3).
//
// Real authenticated AES-256-GCM via @noble/ciphers (audited, pure-TS — works in
// Hermes/Expo Go, where native crypto modules can't be loaded). Each message gets
// a fresh random 96-bit nonce, prepended to the ciphertext+tag; GCM's tag means
// any tampering or corruption is DETECTED on decrypt (decrypt throws), and the
// random nonce gives semantic security (same value → different ciphertext).
//
// The 256-bit key comes from the platform secure store (expo-secure-store) via the
// injected KeyStore. New writes use AES-GCM (the "g1:" prefix); decrypt still reads
// the pre-GCM SHA-256-keystream format so data written before this upgrade survives.
//
// Crypto primitives (secure random + SHA-256) are INJECTED so the pure transform
// is unit-testable in Node without expo-crypto natives. @noble/ciphers is pure JS,
// so the GCM path is testable there too.
import { gcm } from "@noble/ciphers/aes.js";

/** Abstracted key storage so we don't hard-depend on expo-secure-store (not installed). */
export interface KeyStore {
  /** Return the raw symmetric key bytes, creating + persisting one if absent. */
  getOrCreateKey(): Promise<Uint8Array>;
}

/** The contract every encryption provider satisfies. Async because hashing is async. */
export interface EncryptionProvider {
  encrypt(plaintext: string): Promise<string>;
  decrypt(ciphertext: string): Promise<string>;
}

/** Injectable crypto primitives (so the core transform is pure + testable). */
export interface CryptoPrimitives {
  /** Cryptographically secure random bytes. */
  randomBytes(byteCount: number): Uint8Array;
  /** SHA-256 of the input bytes, returned as bytes. */
  sha256(input: Uint8Array): Promise<Uint8Array>;
}

const NONCE_LENGTH = 12; // 96-bit GCM nonce (recommended)
const GCM_PREFIX = "g1:"; // marks the AES-GCM format (legacy = no prefix)
const IV_LENGTH = 16; // legacy keystream IV (decrypt-only, pre-GCM data)
const HASH_BLOCK = 32; // SHA-256 output length in bytes (legacy)

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  // btoa is available in RN (Hermes) and Node 16+.
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

/**
 * Produce a keystream of `length` bytes by hashing key || iv || counter blocks.
 * Pure given the injected sha256. Same key+iv always yields the same keystream,
 * so XOR is reversible for decrypt.
 */
async function deriveKeystream(
  key: Uint8Array,
  iv: Uint8Array,
  length: number,
  sha256: CryptoPrimitives["sha256"],
): Promise<Uint8Array> {
  const keystream = new Uint8Array(length);
  let produced = 0;
  let counter = 0;
  while (produced < length) {
    const counterBytes = new Uint8Array(4);
    counterBytes[0] = (counter >>> 24) & 0xff;
    counterBytes[1] = (counter >>> 16) & 0xff;
    counterBytes[2] = (counter >>> 8) & 0xff;
    counterBytes[3] = counter & 0xff;

    const block = await sha256(concatBytes(key, iv, counterBytes));
    const take = Math.min(HASH_BLOCK, length - produced);
    keystream.set(block.subarray(0, take), produced);
    produced += take;
    counter += 1;
  }
  return keystream;
}

function xor(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i += 1) out[i] = a[i] ^ b[i];
  return out;
}

/**
 * PURE core transform — encrypt with AES-256-GCM. Returns `"g1:" || base64(nonce
 * || ciphertext || tag)`. The fresh random nonce makes ciphertext non-deterministic
 * and the GCM tag authenticates it. Exported for unit testing (noble is pure JS).
 */
export async function encryptWith(
  plaintext: string,
  key: Uint8Array,
  primitives: CryptoPrimitives,
): Promise<string> {
  const nonce = primitives.randomBytes(NONCE_LENGTH);
  const data = textEncoder.encode(plaintext);
  const sealed = gcm(key, nonce).encrypt(data);
  return GCM_PREFIX + toBase64(concatBytes(nonce, sealed));
}

/**
 * PURE core transform — decrypt. Reads the AES-GCM format (`g1:` prefix); on a
 * bad key, tamper, or corruption GCM throws (fail-closed). Falls back to the
 * legacy SHA-256-keystream format for data written before the GCM upgrade.
 */
export async function decryptWith(
  ciphertext: string,
  key: Uint8Array,
  primitives: CryptoPrimitives,
): Promise<string> {
  if (ciphertext.startsWith(GCM_PREFIX)) {
    const bytes = fromBase64(ciphertext.slice(GCM_PREFIX.length));
    const nonce = bytes.subarray(0, NONCE_LENGTH);
    const sealed = bytes.subarray(NONCE_LENGTH);
    return textDecoder.decode(gcm(key, nonce).decrypt(sealed));
  }
  // Legacy keystream (pre-GCM). Decrypt-only, so old local data still reads.
  const bytes = fromBase64(ciphertext);
  const iv = bytes.subarray(0, IV_LENGTH);
  const cipher = bytes.subarray(IV_LENGTH);
  const keystream = await deriveKeystream(key, iv, cipher.length, primitives.sha256);
  const data = xor(cipher, keystream);
  return textDecoder.decode(data);
}

/** A provider built from injected key + primitives. The default wires expo-crypto. */
export function createEncryptionProvider(
  keyStore: KeyStore,
  primitives: CryptoPrimitives,
): EncryptionProvider {
  return {
    async encrypt(plaintext: string): Promise<string> {
      const key = await keyStore.getOrCreateKey();
      return encryptWith(plaintext, key, primitives);
    },
    async decrypt(ciphertext: string): Promise<string> {
      const key = await keyStore.getOrCreateKey();
      return decryptWith(ciphertext, key, primitives);
    },
  };
}
