import { createHash, randomBytes as nodeRandomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  createEncryptionProvider,
  decryptWith,
  encryptWith,
  type CryptoPrimitives,
  type KeyStore,
} from "./encryption";

// Node-backed primitives standing in for expo-crypto (same algorithm: SHA-256).
const primitives: CryptoPrimitives = {
  randomBytes(byteCount: number): Uint8Array {
    return new Uint8Array(nodeRandomBytes(byteCount));
  },
  async sha256(input: Uint8Array): Promise<Uint8Array> {
    return new Uint8Array(createHash("sha256").update(input).digest());
  },
};

const KEY = new Uint8Array(nodeRandomBytes(32));

describe("encryption core (pure)", () => {
  it("round-trips: decrypt(encrypt(x)) === x", async () => {
    const original = "Maintenance meds — ₱1,250.50";
    const ciphertext = await encryptWith(original, KEY, primitives);
    const back = await decryptWith(ciphertext, KEY, primitives);
    expect(back).toBe(original);
  });

  it("round-trips an empty string", async () => {
    const ciphertext = await encryptWith("", KEY, primitives);
    expect(await decryptWith(ciphertext, KEY, primitives)).toBe("");
  });

  it("round-trips unicode and long values", async () => {
    const original = "🩺 Losartan 50mg ".repeat(50);
    const ciphertext = await encryptWith(original, KEY, primitives);
    expect(await decryptWith(ciphertext, KEY, primitives)).toBe(original);
  });

  it("produces different ciphertext for the same plaintext (random nonce)", async () => {
    const a = await encryptWith("same", KEY, primitives);
    const b = await encryptWith("same", KEY, primitives);
    expect(a).not.toBe(b);
    expect(await decryptWith(a, KEY, primitives)).toBe("same");
    expect(await decryptWith(b, KEY, primitives)).toBe("same");
  });

  it("writes the authenticated AES-GCM format", async () => {
    const ciphertext = await encryptWith("secret", KEY, primitives);
    expect(ciphertext.startsWith("g1:")).toBe(true);
  });

  it("rejects tampered ciphertext (GCM authentication)", async () => {
    const ciphertext = await encryptWith("Pay Meralco ₱2,480", KEY, primitives);
    // Flip one base64 char in the middle of the payload — GCM's tag must catch it.
    const body = ciphertext.slice(3); // strip "g1:"
    const i = Math.floor(body.length / 2);
    const ch = body[i] === "A" ? "B" : "A";
    const tampered = "g1:" + body.slice(0, i) + ch + body.slice(i + 1);
    await expect(decryptWith(tampered, KEY, primitives)).rejects.toThrow();
  });

  it("fails to decrypt with the wrong key", async () => {
    const ciphertext = await encryptWith("private", KEY, primitives);
    const otherKey = new Uint8Array(nodeRandomBytes(32));
    await expect(decryptWith(ciphertext, otherKey, primitives)).rejects.toThrow();
  });
});

describe("EncryptionProvider", () => {
  it("round-trips through the provider with an injected key store", async () => {
    const keyStore: KeyStore = { getOrCreateKey: async () => KEY };
    const provider = createEncryptionProvider(keyStore, primitives);
    const ciphertext = await provider.encrypt("10050");
    expect(await provider.decrypt(ciphertext)).toBe("10050");
  });
});
