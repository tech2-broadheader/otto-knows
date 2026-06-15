import { afterEach, describe, expect, it } from "vitest";
import { getAuthContext, isProEntitled, type AuthDeps } from "./auth";

function req(headers: Record<string, string> = {}): Request {
  return new Request("https://otto.test/api", { headers });
}

const verifier = (token: string | null) => ({
  verify: async (t: string) =>
    t === "good-token" ? "11111111-1111-4111-8111-111111111111" : token,
});

afterEach(() => {
  delete process.env.OTTO_DEV_AUTH;
});

describe("getAuthContext", () => {
  const proStore = { load: async () => "pro" as const };

  it("honors the dev bypass outside production", () => {
    process.env.OTTO_DEV_AUTH = "pro";
    return getAuthContext(req(), { verifier: null, entitlements: null }).then((r) => {
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.context.entitlement).toBe("pro");
    });
  });

  it("is unauthenticated with no token or no verifier", async () => {
    expect(
      (await getAuthContext(req(), { verifier: verifier(null), entitlements: proStore })).ok,
    ).toBe(false);
    expect(
      (
        await getAuthContext(req({ Authorization: "Bearer x" }), {
          verifier: null,
          entitlements: proStore,
        })
      ).ok,
    ).toBe(false);
  });

  it("rejects an invalid token", async () => {
    const deps: AuthDeps = { verifier: verifier(null), entitlements: proStore };
    const r = await getAuthContext(req({ Authorization: "Bearer nope" }), deps);
    expect(r.ok).toBe(false);
  });

  it("resolves a valid token and loads entitlement from the store", async () => {
    const r = await getAuthContext(req({ Authorization: "Bearer good-token" }), {
      verifier: verifier(null),
      entitlements: proStore,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.context.userId).toBe("11111111-1111-4111-8111-111111111111");
      expect(r.context.entitlement).toBe("pro");
    }
  });

  it("defaults entitlement to free when there is no entitlement store", async () => {
    const r = await getAuthContext(req({ Authorization: "Bearer good-token" }), {
      verifier: verifier(null),
      entitlements: null,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.context.entitlement).toBe("free");
  });
});

describe("isProEntitled", () => {
  it("grants pro and lifetime, not free", () => {
    expect(isProEntitled("pro")).toBe(true);
    expect(isProEntitled("lifetime")).toBe(true);
    expect(isProEntitled("free")).toBe(false);
  });
});
