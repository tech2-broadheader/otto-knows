import { describe, expect, it } from "vitest";
import {
  buildConsentUrl,
  GOOGLE_CALENDAR_READONLY_SCOPE,
  GOOGLE_TASKS_READONLY_SCOPE,
  googleTokenResponseSchema,
  mergeRefreshedToken,
  needsRefresh,
  refreshAccessToken,
} from "@/server/google-oauth";

/**
 * Unit tests for the PURE consent-URL builder (Story 3.1). Config is injected
 * via overrides so the builder never touches `process.env` / `getConfig()`.
 */

const OVERRIDES = {
  clientId: "test-client-id.apps.googleusercontent.com",
  redirectUri: "http://localhost:3000/api/connectors/google/callback",
};

describe("buildConsentUrl()", () => {
  it("points at Google's OAuth consent endpoint", () => {
    const url = new URL(buildConsentUrl("state-123", OVERRIDES));
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
  });

  it("includes the client id, redirect uri, and state", () => {
    const params = new URL(buildConsentUrl("state-123", OVERRIDES)).searchParams;
    expect(params.get("client_id")).toBe(OVERRIDES.clientId);
    expect(params.get("redirect_uri")).toBe(OVERRIDES.redirectUri);
    expect(params.get("state")).toBe("state-123");
    expect(params.get("response_type")).toBe("code");
  });

  it("requests both read-only scopes (calendar + tasks)", () => {
    const scope = new URL(buildConsentUrl("s", OVERRIDES)).searchParams.get("scope") ?? "";
    expect(scope).toContain(GOOGLE_CALENDAR_READONLY_SCOPE);
    expect(scope).toContain(GOOGLE_TASKS_READONLY_SCOPE);
  });

  it("requests offline access so Otto can read without re-prompting", () => {
    const params = new URL(buildConsentUrl("s", OVERRIDES)).searchParams;
    expect(params.get("access_type")).toBe("offline");
  });
});

describe("googleTokenResponseSchema", () => {
  it("accepts a complete token response", () => {
    const result = googleTokenResponseSchema.safeParse({
      access_token: "ya29.token",
      expires_in: 3599,
      token_type: "Bearer",
      scope: GOOGLE_CALENDAR_READONLY_SCOPE,
      refresh_token: "1//refresh",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a response without a refresh_token (Google may omit it)", () => {
    const result = googleTokenResponseSchema.safeParse({
      access_token: "ya29.token",
      expires_in: 3599,
      token_type: "Bearer",
      scope: GOOGLE_CALENDAR_READONLY_SCOPE,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a response missing the access token", () => {
    const result = googleTokenResponseSchema.safeParse({
      expires_in: 3599,
      token_type: "Bearer",
      scope: GOOGLE_CALENDAR_READONLY_SCOPE,
    });
    expect(result.success).toBe(false);
  });
});

describe("refreshAccessToken() + mergeRefreshedToken() (expired-token refresh)", () => {
  const stored = {
    accessToken: "old-access",
    refreshToken: "1//refresh",
    scope: GOOGLE_CALENDAR_READONLY_SCOPE,
    tokenType: "Bearer",
    expiresAt: 1_000,
  };

  it("posts a refresh_token grant and returns the validated response", async () => {
    let sentBody = "";
    const fakeFetch = async (_url: string | URL | Request, init?: RequestInit) => {
      sentBody = String(init?.body);
      return new Response(
        JSON.stringify({
          access_token: "new-access",
          expires_in: 3600,
          token_type: "Bearer",
          scope: GOOGLE_CALENDAR_READONLY_SCOPE,
        }),
        { status: 200 },
      );
    };
    const result = await refreshAccessToken("1//refresh", {
      clientId: "id",
      clientSecret: "secret",
      fetchImpl: fakeFetch as typeof fetch,
    });
    expect(sentBody).toContain("grant_type=refresh_token");
    expect(sentBody).toContain("refresh_token=1%2F%2Frefresh");
    expect(result.ok && result.tokens.access_token).toBe("new-access");
  });

  it("reports a failed refresh without leaking details", async () => {
    const fakeFetch = async () =>
      new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 });
    const result = await refreshAccessToken("1//refresh", {
      clientId: "id",
      clientSecret: "secret",
      fetchImpl: fakeFetch as typeof fetch,
    });
    expect(result).toEqual({ ok: false, reason: "Token refresh failed (status 400)." });
  });

  it("keeps the existing refresh token when Google doesn't send a new one", () => {
    const merged = mergeRefreshedToken(
      stored,
      { access_token: "new-access", expires_in: 3600, token_type: "Bearer", scope: stored.scope },
      10_000,
    );
    expect(merged).toEqual({ ...stored, accessToken: "new-access", expiresAt: 10_000 + 3_600_000 });
  });

  it("knows when a token needs refreshing (expired or within a minute)", () => {
    expect(needsRefresh({ ...stored, expiresAt: 100_000 }, 40_001)).toBe(true);
    expect(needsRefresh({ ...stored, expiresAt: 100_000 }, 39_999)).toBe(false);
    expect(needsRefresh({ ...stored, refreshToken: undefined, expiresAt: 0 }, 1)).toBe(false);
  });
});
