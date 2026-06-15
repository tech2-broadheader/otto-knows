import { describe, expect, it } from "vitest";
import { parseConfig } from "./config";

const validEnv = {
  ANTHROPIC_API_KEY: "sk-ant-test",
  LLM_MODEL: "claude-opus-4-8",
  SUPABASE_SERVICE_ROLE_KEY: "service-role",
  DATABASE_URL: "postgres://localhost:5432/otto",
  GOOGLE_OAUTH_CLIENT_ID: "client-id",
  GOOGLE_OAUTH_CLIENT_SECRET: "client-secret",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  EXPO_PUBLIC_API_URL: "http://localhost:3000",
};

describe("parseConfig() — valid", () => {
  it("parses a complete env into server + public sections", () => {
    const config = parseConfig(validEnv);
    expect(config.server.ANTHROPIC_API_KEY).toBe("sk-ant-test");
    expect(config.server.DATABASE_URL).toContain("postgres://");
    expect(config.public.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
  });

  it("applies defaults for LLM_MODEL and public URLs", () => {
    const { ANTHROPIC_API_KEY, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL } = validEnv;
    const config = parseConfig({
      ANTHROPIC_API_KEY,
      SUPABASE_SERVICE_ROLE_KEY,
      DATABASE_URL,
      GOOGLE_OAUTH_CLIENT_ID: "id",
      GOOGLE_OAUTH_CLIENT_SECRET: "secret",
    });
    expect(config.server.LLM_MODEL).toBe("claude-opus-4-8");
    expect(config.public.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
  });

  it("treats Supabase public URL/anon key as optional", () => {
    const config = parseConfig(validEnv);
    expect(config.public.NEXT_PUBLIC_SUPABASE_URL).toBeUndefined();
  });
});

describe("parseConfig() — missing required", () => {
  it("throws with the offending var name when a required secret is absent", () => {
    const { SUPABASE_SERVICE_ROLE_KEY: _omit, ...rest } = validEnv;
    expect(() => parseConfig(rest)).toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
  });

  it("treats the LLM keys as optional (provider is swappable)", () => {
    const { ANTHROPIC_API_KEY: _a, ...rest } = validEnv;
    expect(() => parseConfig(rest)).not.toThrow();
  });

  it("aggregates multiple missing required vars in the message", () => {
    expect(() => parseConfig({})).toThrow(/DATABASE_URL/);
    expect(() => parseConfig({})).toThrow(/GOOGLE_OAUTH_CLIENT_ID/);
  });

  it("rejects a malformed public URL", () => {
    expect(() => parseConfig({ ...validEnv, NEXT_PUBLIC_APP_URL: "not-a-url" })).toThrow(
      /NEXT_PUBLIC_APP_URL/,
    );
  });
});
