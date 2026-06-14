// UUID v4 generation at the UI edge. The @otto schemas require `id` to be a v4
// UUID; this wraps expo-crypto's native RFC-4122 generator. Isolated here so
// screens/hooks import one helper rather than the native module directly.
import * as Crypto from "expo-crypto";

/** A fresh RFC-4122 v4 UUID. */
export function newUuid(): string {
  return Crypto.randomUUID();
}
