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

  it("produces different ciphertext for the same plaintext (random IV)", async () => {
    const a = await encryptWith("same", KEY, primitives);
    const b = await encryptWith("same", KEY, primitives);
    expect(a).not.toBe(b);
    expect(await decryptWith(a, KEY, primitives)).toBe("same");
    expect(await decryptWith(b, KEY, primitives)).toBe("same");
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
