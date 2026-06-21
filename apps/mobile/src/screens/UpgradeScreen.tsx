// Upgrade / Pro paywall (spec §8–§9). Presented modally from the root stack, so
// any tab or Settings screen can reach it via navigation.navigate("Upgrade").
// Dark hero with the Otto mascot, a headline, radio-select plan cards, the
// "Start Pro" CTA and the no-ads trust line. Ported to the inline-style design
// kit (reliable on SDK 54, unlike the prior NativeWind pass) — visual presentation
// only; every hook, state, navigation and purchase call is unchanged.
//
// Billing is NOT wired yet: the CTA shows a calm "coming soon" message instead of
// charging. Plan data + display strings live in lib/pricing (pure, tested).
// TODO(E9 monetization): wire CTAs to real billing (RevenueCat / store products),
// resolve entitlement from a verified receipt, and replace the display prices.
import { useState } from "react";
import { Alert, Image, Pressable, Text, View } from "react-native";
import { OverlayScreen, MASCOT } from "../design/kit";
import { Icon } from "../design/Icon";
import { OC, FONT, RADIUS, shadow } from "../design/theme";
import { useAuth } from "../auth/AuthProvider";
import { FREE_VS_PAID_TAGLINE, TRUST_LINE, paidPlans, type Plan } from "../lib/pricing";

type UpgradeNavigation = { goBack: () => void; navigate: (screen: "Login") => void };

/** Calm "billing isn't connected" notice; replaces the real purchase flow. */
const BILLING_COMING_SOON =
  "Subscriptions aren't connected yet — this is coming soon. Nothing was charged.";

export function UpgradeScreen({
  navigation,
}: {
  navigation: UpgradeNavigation;
}): React.JSX.Element {
  const { status, isConfigured } = useAuth();
  const plans = paidPlans();
  // Default-select the badged "best value" plan when present, else the first.
  const [selected, setSelected] = useState<Plan["id"]>(
    plans.find((p) => p.badge)?.id ?? plans[0]!.id,
  );

  const handleStart = (): void => {
    // Pro is tied to a signed-in account. An anonymous user signs in first (when
    // auth is configured); billing is still stubbed afterward.
    if (isConfigured && status !== "signed-in") {
      navigation.navigate("Login");
      return;
    }
    Alert.alert("Start Otto Pro", BILLING_COMING_SOON);
  };

  return (
    <OverlayScreen onBack={() => navigation.goBack()} dark>
      {/* Hero */}
      <View style={{ alignItems: "center", paddingHorizontal: 2 }}>
        <Image source={MASCOT} style={{ width: 200, height: 200, resizeMode: "contain", marginBottom: -6 }} />
        <Text style={{ fontFamily: FONT.display, fontSize: 30, lineHeight: 32, color: "#fff", letterSpacing: -0.6, textAlign: "center" }}>
          Let Otto think{"\n"}for you.
        </Text>
        <Text style={{ marginTop: 10, maxWidth: 300, textAlign: "center", fontFamily: FONT.body, fontSize: 14.5, lineHeight: 22, color: OC.sage }}>
          {FREE_VS_PAID_TAGLINE} Proactive nudges, the optimizer, adaptive routine, forecasts —
          the whole brain.
        </Text>
      </View>

      {/* Plans */}
      <View style={{ marginTop: 22, gap: 10 }}>
        {plans.map((plan) => {
          const on = plan.id === selected;
          // The design splits the price: big display amount + small sage suffix.
          const attached = plan.priceSuffix.startsWith("/");
          const suffix = plan.priceSuffix
            ? attached
              ? plan.priceSuffix
              : ` ${plan.priceSuffix}`
            : "";
          return (
            <Pressable
              key={plan.id}
              onPress={() => setSelected(plan.id)}
              accessibilityRole="radio"
              accessibilityLabel={`${plan.name}, ${plan.price}${suffix}`}
              accessibilityState={{ selected: on }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                borderRadius: 16,
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderWidth: 1.5,
                borderColor: on ? OC.emerald : "rgba(255,255,255,0.12)",
                backgroundColor: on ? "rgba(16,160,116,0.14)" : "rgba(255,255,255,0.04)",
              }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 99,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 2,
                  borderColor: on ? OC.emerald : "rgba(255,255,255,0.3)",
                  backgroundColor: on ? OC.emerald : "transparent",
                }}
              >
                {on ? <Icon name="check" size={13} color={OC.dark} stroke={3} /> : null}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: FONT.bodyX, fontSize: 15.5, color: "#fff" }}>{plan.name}</Text>
                <Text style={{ marginTop: 1, fontFamily: FONT.body, fontSize: 12.5, color: OC.sage }}>{plan.tagline}</Text>
              </View>
              <Text style={{ fontFamily: FONT.display, fontSize: 22, color: "#fff" }}>
                {plan.price}
                {suffix ? <Text style={{ fontFamily: FONT.body, fontSize: 13, color: OC.sage }}>{suffix}</Text> : null}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* CTA */}
      <Pressable
        onPress={handleStart}
        accessibilityRole="button"
        accessibilityLabel="Start Otto Pro"
        style={({ pressed }) => [
          { marginTop: 18, backgroundColor: OC.emerald, borderRadius: RADIUS.inner, paddingVertical: 15, alignItems: "center", opacity: pressed ? 0.9 : 1 },
          shadow("md"),
        ]}
      >
        <Text style={{ fontFamily: FONT.bodyX, fontSize: 16, color: "#fff" }}>Start Pro</Text>
      </Pressable>

      <Text style={{ marginTop: 12, textAlign: "center", fontFamily: FONT.body, fontSize: 12, lineHeight: 18, color: OC.sage }}>
        {TRUST_LINE}
      </Text>

      <Pressable
        onPress={() => navigation.goBack()}
        accessibilityRole="button"
        accessibilityLabel="Maybe later"
        style={({ pressed }) => [{ marginTop: 12, alignItems: "center", paddingVertical: 8, opacity: pressed ? 0.6 : 1 }]}
      >
        <Text style={{ fontFamily: FONT.bodyBold, fontSize: 13, color: OC.sage }}>Maybe later</Text>
      </Pressable>
    </OverlayScreen>
  );
}
