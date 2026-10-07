import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decryptJson, encryptJson, parseEncryptionKey } from "./token-crypto";

const KEY = parseEncryptionKey(randomBytes(32).toString("base64"));
const OTHER_KEY = parseEncryptionKey(randomBytes(32).toString("base64"));
const SECRET = { accessToken: "ya29.secret", refreshToken: "1//refresh", expiresAt: 1_800_000_000 };

describe("parseEncryptionKey", () => {
  it("accepts exactly 32 bytes of base64", () => {
    expect(parseEncryptionKey(randomBytes(32).toString("base64")).length).toBe(32);
  });

  it("rejects keys of the wrong length without echoing the value", () => {
    const short = randomBytes(16).toString("base64");
    expect(() => parseEncryptionKey(short)).toThrow(/32 bytes/);
    expect(() => parseEncryptionKey(short)).not.toThrow(short);
  });
});

describe("encryptJson / decryptJson", () => {
  it("round-trips a value", () => {
    const sealed = encryptJson(SECRET, KEY, 1);
    expect(sealed.keyVersion).toBe(1);
    expect(decryptJson(sealed, KEY)).toEqual(SECRET);
  });

  it("never stores the plaintext", () => {
    const sealed = encryptJson(SECRET, KEY, 1);
    expect(sealed.ciphertext).not.toContain("ya29");
    expect(Buffer.from(sealed.ciphertext, "base64").toString("utf8")).not.toContain("ya29");
  });

  it("uses a fresh IV for every write", () => {
    const a = encryptJson(SECRET, KEY, 1);
    const b = encryptJson(SECRET, KEY, 1);
    expect(a.iv).not.toBe(b.iv);
    expect(a.ciphertext).not.toBe(b.ciphertext);
  });

  it("fails closed on tampered ciphertext", () => {
    const sealed = encryptJson(SECRET, KEY, 1);
    const bytes = Buffer.from(sealed.ciphertext, "base64");
    bytes[0] = (bytes[0] ?? 0) ^ 0xff;
    expect(() => decryptJson({ ...sealed, ciphertext: bytes.toString("base64") }, KEY)).toThrow();
  });

  it("fails closed with the wrong key", () => {
    expect(() => decryptJson(encryptJson(SECRET, KEY, 1), OTHER_KEY)).toThrow();
  });
});
