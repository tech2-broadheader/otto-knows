// Auth context for the mobile app. Login is OPTIONAL: free tier runs local and
// anonymous (ADR-002); signing in loads the user's entitlement and unlocks Pro.
// Wires the api-client token seam so Pro requests carry the access token.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { isAuthConfigured, supabase } from "./supabase";
import { setAuthTokenProvider } from "../lib/api-client";

type Entitlement = "free" | "pro" | "lifetime";
export type AuthAction = { ok: boolean; message?: string };

export type AuthState = {
  status: "loading" | "anonymous" | "signed-in";
  session: Session | null;
  email: string | null;
  entitlement: Entitlement;
  isPro: boolean;
  /** Whether Supabase auth is configured in this build (else login is unavailable). */
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<AuthAction>;
  signUp: (email: string, password: string) => Promise<AuthAction>;
  signOut: () => Promise<void>;
};

const NOT_CONFIGURED: AuthAction = {
  ok: false,
  message: "Sign-in isn't set up in this build yet.",
};

const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within <AuthProvider>");
  return value;
}

export function AuthProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [session, setSession] = useState<Session | null>(null);
  const [entitlement, setEntitlement] = useState<Entitlement>("free");
  const [status, setStatus] = useState<AuthState["status"]>(
    isAuthConfigured ? "loading" : "anonymous",
  );

  // Feed the current access token to the api-client (Authorization: Bearer …).
  useEffect(() => {
    setAuthTokenProvider(() => session?.access_token ?? null);
  }, [session]);

  // Load + subscribe to the Supabase session.
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setStatus(data.session ? "signed-in" : "anonymous");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setStatus(next ? "signed-in" : "anonymous");
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Load entitlement from the user's profile whenever the session changes.
  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      if (!supabase || !session?.user) {
        setEntitlement("free");
        return;
      }
      try {
        const { data } = await supabase
          .from("profiles")
          .select("entitlement")
          .eq("id", session.user.id)
          .maybeSingle();
        const value = (data as { entitlement?: Entitlement } | null)?.entitlement;
        if (!cancelled) setEntitlement(value ?? "free");
      } catch {
        if (!cancelled) setEntitlement("free");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [session]);

  const value = useMemo<AuthState>(
    () => ({
      status,
      session,
      email: session?.user?.email ?? null,
      entitlement,
      isPro: entitlement === "pro" || entitlement === "lifetime",
      isConfigured: isAuthConfigured,
      signIn: async (email, password) => {
        if (!supabase) return NOT_CONFIGURED;
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return error ? { ok: false, message: error.message } : { ok: true };
      },
      signUp: async (email, password) => {
        if (!supabase) return NOT_CONFIGURED;
        const { error } = await supabase.auth.signUp({ email, password });
        return error ? { ok: false, message: error.message } : { ok: true };
      },
      signOut: async () => {
        await supabase?.auth.signOut();
      },
    }),
    [status, session, entitlement],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
