import { describe, expect, it } from "vitest";
import { parseConfig } from "./config";

const validEnv = {
  ANTHROPIC_API_KEY: "sk-ant-test",
  LLM_MODEL: "claude-opus-5-5",
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
    expect(config.server.LLM_MODEL).toBe("claude-opus-5-5");
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

describe("parseConfig() — TOKEN_ENCRYPTION_KEY (story 3.4)", () => {
  const key32 = Buffer.alloc(32, 7).toString("base64");

  it("is optional, and accepted when it decodes to 32 bytes", () => {
    expect(parseConfig(validEnv).server.TOKEN_ENCRYPTION_KEY).toBeUndefined();
    expect(
      parseConfig({ ...validEnv, TOKEN_ENCRYPTION_KEY: key32 }).server.TOKEN_ENCRYPTION_KEY,
    ).toBe(key32);
  });

  it("rejects a key of the wrong length without echoing it", () => {
    const short = Buffer.alloc(16, 7).toString("base64");
    expect(() => parseConfig({ ...validEnv, TOKEN_ENCRYPTION_KEY: short })).toThrow(
      /TOKEN_ENCRYPTION_KEY/,
    );
    expect(() => parseConfig({ ...validEnv, TOKEN_ENCRYPTION_KEY: short })).not.toThrow(short);
  });
});
