import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Authenticated encryption for connector credentials at rest (SERVER-ONLY,
 * story 3.4). AES-256-GCM from Node's built-in crypto — a standard primitive, not
 * a hand-rolled cipher (CLAUDE.md §11). Any tampering or a wrong key makes
 * decryption throw, so callers fail closed.
 */

const ALGORITHM = "aes-256-gcm";
const KEY_BYTES = 32;
const IV_BYTES = 12; // GCM's recommended nonce size
const TAG_BYTES = 16;

/** What gets persisted: base64 ciphertext (with the GCM tag appended) + IV. */
export type SealedJson = {
  ciphertext: string;
  iv: string;
  /** Which key encrypted this row, so keys can be rotated later. */
  keyVersion: number;
};

/** Decode and validate a base64 key. The error never echoes the key itself. */
export function parseEncryptionKey(base64: string): Buffer {
  const key = Buffer.from(base64, "base64");
  if (key.length !== KEY_BYTES) {
    throw new Error(`TOKEN_ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes (got ${key.length}).`);
  }
  return key;
}

export function encryptJson(value: unknown, key: Buffer, keyVersion: number): SealedJson {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return {
    ciphertext: Buffer.concat([body, cipher.getAuthTag()]).toString("base64"),
    iv: iv.toString("base64"),
    keyVersion,
  };
}

/** @throws when the data was tampered with or the key is wrong. */
export function decryptJson(sealed: SealedJson, key: Buffer): unknown {
  const bytes = Buffer.from(sealed.ciphertext, "base64");
  if (bytes.length <= TAG_BYTES) throw new Error("Sealed value is too short.");
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(sealed.iv, "base64"));
  decipher.setAuthTag(bytes.subarray(bytes.length - TAG_BYTES));
  const plain = Buffer.concat([
    decipher.update(bytes.subarray(0, bytes.length - TAG_BYTES)),
    decipher.final(),
  ]);
  return JSON.parse(plain.toString("utf8"));
}
