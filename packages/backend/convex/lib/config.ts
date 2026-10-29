import { z } from "zod";

/**
 * Typed Convex environment (story 14.1). Values are set with
 * `npx convex env set NAME value`, never committed. Everything is optional so a
 * deployment boots before each feature is configured; the feature that needs a
 * value checks for it and fails closed.
 */
const envSchema = z.object({
  LLM_PROVIDER: z.enum(["anthropic", "gemini", "groq"]).optional(),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  LLM_MODEL: z.string().min(1).optional(),
  GEMINI_API_KEY: z.string().min(1).optional(),
  GEMINI_MODEL: z.string().min(1).optional(),
  GROQ_API_KEY: z.string().min(1).optional(),
  GROQ_MODEL: z.string().min(1).optional(),
  GOOGLE_OAUTH_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().min(1).optional(),
  /** 32 random bytes, base64 (AES-256-GCM for connector tokens). */
  TOKEN_ENCRYPTION_KEY: z.string().min(1).optional(),
  REVENUECAT_WEBHOOK_AUTH: z.string().min(1).optional(),
  REVENUECAT_ENTITLEMENT_ID: z.string().min(1).optional(),
  REVENUECAT_ALLOW_SANDBOX: z.enum(["true", "false"]).optional(),
});
export type ServerConfig = z.infer<typeof envSchema>;

/** Empty strings count as unset, the way `.env` files leave them. */
function withoutBlanks(env: Record<string, string | undefined>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(env).filter((entry): entry is [string, string] => Boolean(entry[1])),
  );
}

/** Parses the environment; throws naming the bad variable, never its value. */
export function serverConfig(env: Record<string, string | undefined> = process.env): ServerConfig {
  const parsed = envSchema.safeParse(withoutBlanks(env));
  if (!parsed.success) {
    const names = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Invalid Convex environment variable(s): ${names}`);
  }
  return parsed.data;
}
