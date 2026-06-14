// Upgrade / Pro paywall (spec §8–§9). Presented modally from the root stack, so
// any tab or Settings screen can reach it via navigation.navigate("Upgrade").
// Renders the plans as cards with the no-ads trust line; each paid plan has a
// purchase CTA and "Maybe later" dismisses the modal.
//
// Billing is NOT wired yet: a CTA shows a calm "coming soon" message instead of
// charging. Plan data + display strings live in lib/pricing (pure, tested).
// TODO(E9 monetization): wire CTAs to real billing (RevenueCat / store products),
// resolve entitlement from a verified receipt, and replace the display prices.
import { useState } from "react";
import { Alert, Text, View } from "react-native";
import { ScreenScroll } from "../components/AsyncBoundary";
import { Banner, Button, Card } from "../components/ui";
import {
  FREE_VS_PAID_TAGLINE,
  PLANS,
  TRUST_LINE,
  ctaLabel,
  priceLabel,
  type Plan,
} from "../lib/pricing";

/** Minimal nav shape — keeps this screen decoupled from the param list. */
type UpgradeNavigation = { goBack: () => void };

/** Calm "billing isn't connected" notice; replaces the real purchase flow. */
const BILLING_COMING_SOON =
  "Subscriptions aren't connected yet — this is coming soon. Nothing was charged.";

function PlanCard({ plan, onChoose }: { plan: Plan; onChoose: (plan: Plan) => void }) {
  return (
    <Card title={plan.name}>
      <View className="mb-1 flex-row items-baseline justify-between">
        <Text className="text-2xl font-bold text-slate-900">{priceLabel(plan)}</Text>
        {plan.badge ? (
          <Text className="rounded-full bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white">
            {plan.badge}
          </Text>
        ) : null}
      </View>
      <Text className="mb-3 text-sm text-slate-500">{plan.tagline}</Text>

      <View className="mb-3">
        {plan.benefits.map((benefit, index) => (
          <View key={`${plan.id}-benefit-${index}`} className="mb-1 flex-row">
            <Text className="mr-2 text-base text-slate-400" accessibilityElementsHidden>
              ✓
            </Text>
            <Text className="flex-1 text-sm leading-5 text-slate-700">{benefit}</Text>
          </View>
        ))}
      </View>

      {plan.isPaid ? (
        <Button label={ctaLabel(plan)} onPress={() => onChoose(plan)} />
      ) : (
        <Text className="text-xs text-slate-400">You're on this plan.</Text>
      )}
    </Card>
  );
}

export function UpgradeScreen({
  navigation,
}: {
  navigation: UpgradeNavigation;
}): React.JSX.Element {
  // Shown after a CTA tap so the "coming soon" notice is visible inline too
  // (in addition to the alert), for screen-reader users.
  const [noticeVisible, setNoticeVisible] = useState(false);

  const handleChoose = (plan: Plan): void => {
    setNoticeVisible(true);
    Alert.alert(`Choose ${plan.name}`, BILLING_COMING_SOON);
  };

  return (
    <ScreenScroll>
      <Text className="mb-1 text-2xl font-bold text-slate-900">Upgrade to Otto Pro</Text>
      <Text className="mb-4 text-sm text-slate-500">{FREE_VS_PAID_TAGLINE}</Text>

      <Banner tone="info" message={TRUST_LINE} />

      {noticeVisible ? <Banner tone="info" message={BILLING_COMING_SOON} /> : null}

      {PLANS.map((plan) => (
        <PlanCard key={plan.id} plan={plan} onChoose={handleChoose} />
      ))}

      <View className="mt-1">
        <Button label="Maybe later" variant="secondary" onPress={() => navigation.goBack()} />
      </View>
    </ScreenScroll>
  );
}
