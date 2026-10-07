import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Signed, stateless OAuth `state` (SERVER-ONLY). Binds the Google consent round
 * trip to the user who started it and expires after 10 minutes, so a callback
 * carrying someone else's (or a forged) state is refused — classic OAuth CSRF
 * protection without storing anything server-side.
 *
 * Format: base64url(`${userId}.${expiresAtMs}.${nonce}`) + "." + base64url(HMAC-SHA256).
 */

const STATE_TTL_MS = 10 * 60_000;

function sign(payload: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(payload).digest();
}

export function createOAuthState(userId: string, secret: string, now: number = Date.now()): string {
  const payload = `${userId}.${now + STATE_TTL_MS}.${randomBytes(12).toString("hex")}`;
  return `${Buffer.from(payload).toString("base64url")}.${sign(payload, secret).toString("base64url")}`;
}

export function verifyOAuthState(
  state: string,
  userId: string,
  secret: string,
  now: number = Date.now(),
): boolean {
  const [encodedPayload, encodedSig, extra] = state.split(".");
  if (!encodedPayload || !encodedSig || extra !== undefined) return false;

  const payload = Buffer.from(encodedPayload, "base64url").toString("utf8");
  const expected = sign(payload, secret);
  const received = Buffer.from(encodedSig, "base64url");
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return false;

  const [stateUser, expiresAt] = payload.split(".");
  return stateUser === userId && Number(expiresAt) >= now;
}
