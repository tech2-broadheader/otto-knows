import { z } from "zod";

/**
 * Typed, validated environment config (SERVER-ONLY).
 *
 * Read EVERY env var through this module (CODING_CONVENTIONS §7 / CLAUDE.md §6).
 * Required-at-startup secrets throw a clear error if missing; public vars are
 * separated out so it stays obvious what is safe to expose to the client.
 *
 * This module must never be imported by a client/mobile component — it reads
 * server-only secrets (LLM + Supabase service role keys). The `assertServerOnly`
 * guard below throws if it is ever evaluated in a browser bundle. (Once the
 * `server-only` package is installed centrally, prefer `import "server-only";`
 * for a compile-time guarantee — TODO.)
 */

/** Throws if this server-only module is evaluated in a browser context. */
function assertServerOnly(): void {
  if (typeof window !== "undefined") {
    throw new Error("config.ts is server-only and must not be imported into client/mobile code.");
  }
}

/**
 * Server-only secrets and connection strings. These are required for the Pro
 * backend to function (LLM proxy, cloud store, connectors), so they throw at
 * startup when absent rather than failing deep inside a request.
 */
const serverEnvSchema = z.object({
  // LLM brain — keys live behind the proxy, usage metered (CLAUDE.md §6 backend).
  // The provider is swappable; keys are optional so the app can run on whichever
  // provider is configured (or none → template/free fallback). The client factory
  // (server/llm/client.ts) reads these directly, not through this config.
  LLM_PROVIDER: z.enum(["anthropic", "gemini"]).optional(),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  LLM_MODEL: z.string().min(1).default("claude-opus-5-5"),
  GEMINI_API_KEY: z.string().min(1).optional(),
  GEMINI_MODEL: z.string().min(1).default("gemini-2.5-flash"),

  // Supabase (cloud store + auth, Pro tier).
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),

  // Direct DB connection for Drizzle migrations (server-side only).
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // Google Calendar / Tasks OAuth.
  GOOGLE_OAUTH_CLIENT_ID: z.string().min(1, "GOOGLE_OAUTH_CLIENT_ID is required"),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().min(1, "GOOGLE_OAUTH_CLIENT_SECRET is required"),

  // AES-256-GCM key for connector tokens at rest (story 3.4): 32 bytes, base64.
  // Optional so local dev runs without it; production refuses to store tokens
  // unencrypted when it is missing (server/token-store.ts).
  TOKEN_ENCRYPTION_KEY: z
    .string()
    .refine((v) => Buffer.from(v, "base64").length === 32, "must decode to 32 bytes (base64)")
    .optional(),
});

/**
 * Public config — safe to expose to the client. These mirror the `NEXT_PUBLIC_*`
 * and `EXPO_PUBLIC_*` vars in `.env.example`. URLs are validated; the Supabase
 * URL/anon key are intentionally optional so local dev runs without a project.
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  EXPO_PUBLIC_API_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type PublicEnv = z.infer<typeof publicEnvSchema>;

export type Config = {
  readonly server: ServerEnv;
  readonly public: PublicEnv;
};

/**
 * Parse an env-like record into a typed `Config`. Exposed (and pure) so tests
 * can exercise valid + missing-required cases without mutating `process.env`.
 *
 * @throws {Error} with a clear, aggregated message when required vars are missing
 *   or malformed. The message never echoes secret values, only the var names.
 */
export function parseConfig(source: Record<string, string | undefined>): Config {
  const server = serverEnvSchema.safeParse(source);
  const publicResult = publicEnvSchema.safeParse(source);

  if (!server.success || !publicResult.success) {
    const issues = [
      ...(server.success ? [] : server.error.issues),
      ...(publicResult.success ? [] : publicResult.error.issues),
    ]
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration: ${issues}`);
  }

  return { server: server.data, public: publicResult.data };
}

let cached: Config | undefined;

/**
 * The validated config singleton. Lazily parsed from `process.env` on first
 * access so that simply importing the module (e.g. in a client bundle that
 * tree-shakes it out) doesn't eagerly throw.
 */
export function getConfig(): Config {
  assertServerOnly();
  if (!cached) {
    cached = parseConfig(process.env);
  }
  return cached;
}
