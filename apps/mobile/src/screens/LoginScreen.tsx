// Optional sign-in (ADR-002). Login is never required — the free tier runs local
// and anonymous — but signing in loads the user's entitlement and unlocks Pro.
// Presented modally from the root stack. OTTO design kit (inline styles); calm
// look: clam avatar, warm headline, email + password, one primary action, and a
// sign-in/up toggle. Sign-up that needs email confirmation shows a "check your
// email" state instead of silently closing. Credentials are never logged.
import { useState } from "react";
import { View, Text, Pressable, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Display, PrimaryButton, GhostButton, Field, TextField, CLAM_ASSET } from "../design/kit";
import { Icon } from "../design/Icon";
import { OC, FONT, RADIUS, shadow } from "../design/theme";
import { useAuth } from "../auth/AuthProvider";
import { validateCredentials } from "../lib/auth-input";

type Mode = "sign-in" | "sign-up";

/** Inline notice (info=mist, error=coral). */
function Notice({ tone, children }: { tone: "info" | "error"; children: string }) {
  const c = tone === "error" ? { bg: OC.coralBg, fg: OC.coralInk } : { bg: OC.mist, fg: OC.forest };
  return (
    <View style={{ backgroundColor: c.bg, borderRadius: RADIUS.inner, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 14 }}>
      <Text style={{ color: c.fg, fontFamily: FONT.bodySemi, fontSize: 13.5, lineHeight: 19 }}>{children}</Text>
    </View>
  );
}

export function LoginScreen({
  onDone,
  initialMode = "sign-in",
}: {
  /** Called when the user finishes here — signed in, or chose to continue. */
  onDone: () => void;
  initialMode?: Mode;
}): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const { isConfigured, signIn, signUp } = useAuth();

  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [sentTo, setSentTo] = useState<string | undefined>();

  const isSignUp = mode === "sign-up";
  const headline = isSignUp ? "Create your account" : "Sign in to Otto";
  const sub = isSignUp
    ? "Sync your day and unlock Otto Pro across devices."
    : "Welcome back — pick up right where you left off.";

  const handleSubmit = async (): Promise<void> => {
    const problem = validateCredentials(email, password);
    if (problem) {
      setError(problem);
      return;
    }
    setError(undefined);
    setBusy(true);
    const result = isSignUp ? await signUp(email.trim(), password) : await signIn(email.trim(), password);
    setBusy(false);
    if (!result.ok) {
      setError(result.message ?? "Something went wrong. Please try again.");
      return;
    }
    if (isSignUp && result.needsConfirmation) {
      setSentTo(email.trim()); // show "check your email" instead of closing
      return;
    }
    onDone(); // signed in (or autoconfirm on)
  };

  // ── Confirmation-sent state ───────────────────────────────────────────────
  if (sentTo) {
    return (
      <View style={{ flex: 1, backgroundColor: OC.paper, paddingTop: insets.top + 8, paddingHorizontal: 22 }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: insets.bottom + 40 }}>
          <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: OC.mist, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <Icon name="bell" size={34} color={OC.green} />
          </View>
          <Display style={{ fontSize: 24, textAlign: "center" }}>Check your email</Display>
          <Text style={{ fontFamily: FONT.body, fontSize: 14.5, color: OC.ink500, textAlign: "center", lineHeight: 21, marginTop: 10, maxWidth: 320 }}>
            We sent a confirmation link to <Text style={{ fontFamily: FONT.bodyBold, color: OC.ink }}>{sentTo}</Text>. Tap it, then come back and sign in.
          </Text>
          <PrimaryButton
            label="Back to sign in"
            onPress={() => {
              setSentTo(undefined);
              setMode("sign-in");
              setPassword("");
            }}
            style={{ marginTop: 22, paddingHorizontal: 26 }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: OC.paper, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", paddingHorizontal: 18, paddingTop: 8, paddingBottom: 6 }}>
        <Pressable
          onPress={() => onDone()}
          accessibilityRole="button"
          accessibilityLabel="Close"
          style={({ pressed }) => [{ width: 38, height: 38, borderRadius: RADIUS.inner, borderWidth: 1, borderColor: OC.line, backgroundColor: OC.surface, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 }]}
        >
          <Icon name="x" size={20} color={OC.ink700} />
        </Pressable>
      </View>

      <View style={{ flex: 1, paddingHorizontal: 22, paddingBottom: insets.bottom + 18 }}>
        {/* Hero */}
        <View style={{ marginTop: 24, alignItems: "center" }}>
          <View style={[{ width: 72, height: 72, borderRadius: 22, backgroundColor: OC.dark, alignItems: "center", justifyContent: "center", overflow: "hidden" }, shadow("md")]}>
            <Image source={CLAM_ASSET} style={{ width: 54, height: 54, resizeMode: "contain" }} />
          </View>
          <Display style={{ fontSize: 26, lineHeight: 30, textAlign: "center", marginTop: 16 }}>{headline}</Display>
          <Text style={{ fontFamily: FONT.body, fontSize: 14, color: OC.ink500, textAlign: "center", lineHeight: 21, marginTop: 8, maxWidth: 320 }}>{sub}</Text>
        </View>

        {!isConfigured ? (
          <View style={{ marginTop: 24 }}>
            <Notice tone="info">
              Sign-in isn&apos;t set up in this build yet — Otto is running fully on your device. You can keep using everything for free.
            </Notice>
            <GhostButton label="Continue without signing in" onPress={() => onDone()} />
          </View>
        ) : (
          <View style={{ marginTop: 28 }}>
            {error ? <Notice tone="error">{error}</Notice> : null}
            <Field label="Email">
              <TextField value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
            </Field>
            <Field label="Password">
              <TextField value={password} onChangeText={setPassword} placeholder="Your password" secure autoCapitalize="none" autoComplete="password" />
            </Field>
            <PrimaryButton
              label={busy ? "One moment…" : isSignUp ? "Create account" : "Sign in"}
              onPress={() => void handleSubmit()}
              disabled={busy}
              style={{ marginTop: 4 }}
            />
            <Pressable
              onPress={() => {
                setMode(isSignUp ? "sign-in" : "sign-up");
                setError(undefined);
              }}
              disabled={busy}
              accessibilityRole="button"
              style={{ marginTop: 16, alignItems: "center", paddingVertical: 8 }}
            >
              <Text style={{ fontFamily: FONT.bodySemi, fontSize: 13.5, color: OC.green }}>
                {isSignUp ? "Have an account? Sign in" : "New here? Create an account"}
              </Text>
            </Pressable>
          </View>
        )}

        <View style={{ marginTop: "auto", alignItems: "center", paddingTop: 16 }}>
          <Pressable onPress={() => onDone()} accessibilityRole="button" accessibilityLabel="Maybe later" style={{ paddingVertical: 8 }}>
            <Text style={{ fontFamily: FONT.bodyBold, fontSize: 13, color: OC.ink400 }}>Maybe later</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
