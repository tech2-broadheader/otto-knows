import { createClient } from "@supabase/supabase-js";

/**
 * Supabase auth (SERVER-ONLY). Verifies a user's access token and returns their
 * id. Injectable behind an interface so routes/tests don't hit the network.
 * Reads env directly so it stays usable when other config is absent — when
 * Supabase isn't configured, `getAuthVerifier()` returns null and callers treat
 * requests as unauthenticated.
 */

export interface AuthVerifier {
  /** Returns the Supabase user id for a valid access token, or null. */
  verify(accessToken: string): Promise<string | null>;
}

export class SupabaseAuthVerifier implements AuthVerifier {
  private readonly client;

  constructor(url: string, anonKey: string) {
    this.client = createClient(url, anonKey, { auth: { persistSession: false } });
  }

  async verify(accessToken: string): Promise<string | null> {
    try {
      const { data, error } = await this.client.auth.getUser(accessToken);
      if (error || !data.user) return null;
      return data.user.id;
    } catch {
      // Network/transport failure → treat as unverifiable (never throw to the route).
      return null;
    }
  }
}

let cached: AuthVerifier | null = null;

/** The production verifier, or null when Supabase env isn't configured. */
export function getAuthVerifier(): AuthVerifier | null {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  cached = new SupabaseAuthVerifier(url, anon);
  return cached;
}
