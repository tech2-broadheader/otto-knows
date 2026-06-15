// Optional sign-in (ADR-002). Login is never required — the free tier runs local
// and anonymous — but signing in loads the user's entitlement and unlocks Pro.
// Presented modally from the root stack. Calm OTTO look: the clam avatar, a warm
// headline, email + password, one primary action, and a sign-in/up mode toggle.
//
// Credentials are validated lightly at the edge (auth-input) and NEVER logged.
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Banner, Button, Icon, LabeledInput, OC } from "../components/ui";
import { OttoAvatar } from "../components/otto-ui";
import { useAuth } from "../auth/AuthProvider";
import { validateCredentials } from "../lib/auth-input";

type LoginNavigation = { goBack: () => void };

type Mode = "sign-in" | "sign-up";

export function LoginScreen({ navigation }: { navigation: LoginNavigation }): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const { isConfigured, signIn, signUp } = useAuth();

  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const isSignUp = mode === "sign-up";
  const headline = isSignUp ? "Create your account" : "Sign in to Otto";
  const sub = isSignUp
    ? "Sync your day and unlock Otto Pro across devices."
    : "Welcome back — pick up right where you left off.";

  const handleSubmit = async (): Promise<void> => {
    // Edge validation: never log credentials, just shape-check before the call.
    const problem = validateCredentials(email, password);
    if (problem) {
      setError(problem);
      return;
    }
    setError(undefined);
    setBusy(true);
    const action = isSignUp ? signUp : signIn;
    const result = await action(email.trim(), password);
    setBusy(false);
    if (result.ok) {
      navigation.goBack();
      return;
    }
    setError(result.message ?? "Something went wrong. Please try again.");
  };

  return (
    <View className="flex-1 bg-paper" style={{ paddingTop: insets.top }}>
      {/* Close / Maybe later */}
      <View className="flex-row px-[18px] pb-1.5 pt-2">
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Maybe later"
          className="h-[38px] w-[38px] items-center justify-center rounded-inner border border-line bg-surface"
        >
          <Icon name="x" size={20} color={OC.ink700} />
        </Pressable>
      </View>

      <View className="flex-1 px-[22px]" style={{ paddingBottom: insets.bottom + 18 }}>
        {/* Hero */}
        <View className="mt-6 items-center">
          <OttoAvatar size={72} />
          <Text className="mt-4 text-center font-display text-[26px] leading-[30px] text-ink">
            {headline}
          </Text>
          <Text className="mt-2 max-w-[34ch] text-center font-body text-[14px] leading-[21px] text-ink-500">
            {sub}
          </Text>
        </View>

        {/* Not-configured: the screen still renders, calmly, with no form action. */}
        {!isConfigured ? (
          <View className="mt-6">
            <Banner
              tone="info"
              message="Sign-in isn't set up in this build yet — Otto is running fully on your device. You can keep using everything for free."
            />
            <View className="mt-3">
              <Button
                label="Continue without signing in"
                variant="mint"
                onPress={() => navigation.goBack()}
              />
            </View>
          </View>
        ) : (
          <View className="mt-7">
            {error ? <Banner tone="critical" message={error} /> : null}

            <LabeledInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
            />

            {/* Password — styled like LabeledInput but secureTextEntry (the shared
                primitive doesn't expose that prop, so we render it here). */}
            <View className="mb-3">
              <Text className="mb-1 font-body-medium text-sm text-ink-500">Password</Text>
              <TextInput
                className="rounded-inner border border-line bg-surface px-3.5 py-2.5 font-body text-[15px] text-ink"
                value={password}
                onChangeText={setPassword}
                placeholder="Your password"
                placeholderTextColor={OC.ink400}
                secureTextEntry
                autoCapitalize="none"
                accessibilityLabel="Password"
              />
            </View>

            <View className="mt-1">
              <Button
                label={busy ? "One moment…" : isSignUp ? "Create account" : "Sign in"}
                onPress={() => void handleSubmit()}
                disabled={busy}
              />
            </View>

            {/* Mode toggle */}
            <Pressable
              onPress={() => {
                setMode(isSignUp ? "sign-in" : "sign-up");
                setError(undefined);
              }}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={
                isSignUp ? "Have an account? Sign in" : "New here? Create an account"
              }
              className="mt-4 items-center py-2"
            >
              <Text className="font-body-semibold text-[13.5px] text-green">
                {isSignUp ? "Have an account? Sign in" : "New here? Create an account"}
              </Text>
            </Pressable>
          </View>
        )}

        {/* Maybe-later back affordance always present */}
        <View className="mt-auto items-center pt-4">
          <Pressable
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Maybe later"
            className="py-2"
          >
            <Text className="font-body-bold text-[13px] text-ink-400">Maybe later</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
