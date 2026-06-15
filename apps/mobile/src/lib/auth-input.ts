// Light, edge-only validation for the sign-in form. Deliberately permissive — the
// real check is Supabase server-side. We only catch obviously empty/garbled input
// so we can show a calm inline message instead of a network round-trip. NEVER log
// the password; this module only ever sees and returns booleans/messages.

/** A non-empty email that at least contains an "@" with text on both sides. */
export function isValidEmail(email: string): boolean {
  const trimmed = email.trim();
  const at = trimmed.indexOf("@");
  return at > 0 && at < trimmed.length - 1;
}

/** A non-empty password (length only — Supabase enforces the real policy). */
export function isValidPassword(password: string): boolean {
  return password.length > 0;
}

/**
 * Validate the sign-in/up form at the edge. Returns the first human message to
 * show in a Banner, or null when the input is good enough to submit.
 */
export function validateCredentials(email: string, password: string): string | null {
  if (email.trim().length === 0) return "Enter your email.";
  if (!isValidEmail(email)) return "That email doesn't look right.";
  if (!isValidPassword(password)) return "Enter your password.";
  return null;
}
