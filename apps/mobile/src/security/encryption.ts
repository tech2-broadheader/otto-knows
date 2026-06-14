// Encryption-at-rest for SENSITIVE fields (CLAUDE.md §6, §11; story 1.3 AC3).
//
// expo-crypto exposes hashing + secure random, but NO symmetric AES primitive.
// So the default provider below derives a per-message keystream by hashing
// key || iv || counter (SHA-256) and XORs it against the plaintext bytes. The IV
// is random per message and prepended to the ciphertext, so re-encrypting the
// same value yields different ciphertext (semantic security against equality
// leaks). This is a stopgap, NOT authenticated AES.
//
// TODO(security): replace with SQLCipher or vetted AES-GCM before storing real
// data; key must come from secure storage (expo-secure-store) — GATE-3
//
// The crypto primitives (random bytes + SHA-256) are INJECTED so the pure
// transform can be unit-tested in Node without loading expo-crypto natives.

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

const IV_LENGTH = 16;
const HASH_BLOCK = 32; // SHA-256 output length in bytes

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
 * PURE core transform — encrypt. Given key + primitives, returns base64 of
 * (iv || ciphertext). Exported for unit testing without native modules.
 */
export async function encryptWith(
  plaintext: string,
  key: Uint8Array,
  primitives: CryptoPrimitives,
): Promise<string> {
  const iv = primitives.randomBytes(IV_LENGTH);
  const data = textEncoder.encode(plaintext);
  const keystream = await deriveKeystream(key, iv, data.length, primitives.sha256);
  const cipher = xor(data, keystream);
  return toBase64(concatBytes(iv, cipher));
}

/**
 * PURE core transform — decrypt. Inverse of encryptWith. Exported for testing.
 */
export async function decryptWith(
  ciphertext: string,
  key: Uint8Array,
  primitives: CryptoPrimitives,
): Promise<string> {
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
