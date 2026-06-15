// Upgrade / Pro paywall (spec §8–§9). Presented modally from the root stack, so
// any tab or Settings screen can reach it via navigation.navigate("Upgrade").
// Dark hero with the Otto mascot, a headline, radio-select plan cards, the
// "Start Pro" CTA and the no-ads trust line.
//
// Billing is NOT wired yet: the CTA shows a calm "coming soon" message instead of
// charging. Plan data + display strings live in lib/pricing (pure, tested).
// TODO(E9 monetization): wire CTAs to real billing (RevenueCat / store products),
// resolve entitlement from a verified receipt, and replace the display prices.
import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, OC } from "../components/ui";
import { OttoMascot } from "../components/otto-ui";
import { useAuth } from "../auth/AuthProvider";
import { FREE_VS_PAID_TAGLINE, TRUST_LINE, paidPlans, priceLabel, type Plan } from "../lib/pricing";

type UpgradeNavigation = { goBack: () => void; navigate: (screen: "Login") => void };

/** Calm "billing isn't connected" notice; replaces the real purchase flow. */
const BILLING_COMING_SOON =
  "Subscriptions aren't connected yet — this is coming soon. Nothing was charged.";

export function UpgradeScreen({
  navigation,
}: {
  navigation: UpgradeNavigation;
}): React.JSX.Element {
  const insets = useSafeAreaInsets();
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
    <View className="flex-1 bg-dark">
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 28,
          paddingHorizontal: 22,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Close */}
        <View className="flex-row">
          <Pressable
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Close"
            className="h-[38px] w-[38px] items-center justify-center rounded-inner bg-white/10"
          >
            <Icon name="x" size={20} color="#fff" />
          </Pressable>
        </View>

        {/* Hero */}
        <View className="mt-2 items-center">
          <OttoMascot width={200} />
          <Text className="mt-1 text-center font-display text-[30px] leading-[32px] text-white">
            Let Otto think{"\n"}for you.
          </Text>
          <Text className="mt-2.5 max-w-[30ch] text-center font-body text-[14.5px] leading-[22px] text-sage">
            {FREE_VS_PAID_TAGLINE} Proactive nudges, the optimizer, adaptive routine, forecasts —
            the whole brain.
          </Text>
        </View>

        {/* Plans */}
        <View className="mt-6 gap-2.5">
          {plans.map((plan) => {
            const on = plan.id === selected;
            return (
              <Pressable
                key={plan.id}
                onPress={() => setSelected(plan.id)}
                accessibilityRole="radio"
                accessibilityLabel={`${plan.name}, ${priceLabel(plan)}`}
                accessibilityState={{ selected: on }}
                className="flex-row items-center gap-3 rounded-card px-4 py-3.5"
                style={{
                  borderWidth: 1.5,
                  borderColor: on ? OC.emerald : "rgba(255,255,255,0.12)",
                  backgroundColor: on ? "rgba(16,160,116,0.14)" : "rgba(255,255,255,0.04)",
                }}
              >
                <View
                  className="h-[22px] w-[22px] items-center justify-center rounded-full"
                  style={{
                    borderWidth: 2,
                    borderColor: on ? OC.emerald : "rgba(255,255,255,0.3)",
                    backgroundColor: on ? OC.emerald : "transparent",
                  }}
                >
                  {on ? <Icon name="check" size={13} color={OC.dark} /> : null}
                </View>
                <View className="flex-1">
                  <Text className="font-body-extra text-[15.5px] text-white">{plan.name}</Text>
                  <Text className="mt-px font-body text-[12.5px] text-sage">{plan.tagline}</Text>
                </View>
                <Text className="font-display text-[22px] text-white">{priceLabel(plan)}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* CTA */}
        <Pressable
          onPress={handleStart}
          accessibilityRole="button"
          accessibilityLabel="Start Otto Pro"
          className="mt-5 items-center rounded-inner bg-emerald py-4"
        >
          <Text className="font-body-extra text-[16px] text-white">Start Pro</Text>
        </Pressable>

        <Text className="mt-3 text-center font-body text-[12px] text-sage">{TRUST_LINE}</Text>

        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Maybe later"
          className="mt-3 items-center py-2"
        >
          <Text className="font-body-bold text-[13px] text-sage">Maybe later</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
