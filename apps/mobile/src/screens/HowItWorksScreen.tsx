// "How Otto works" — the replayable tour, reached from Settings. Same teaching
// cards as first-run onboarding (components/teaching), minus the consent/routine
// setup. A small stepped flow: Welcome → 3 teaching cards, with a close button,
// progress dots, and a Next / Got it button that closes on the last step.
import { useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PrimaryButton } from "../design/kit";
import { Icon } from "../design/Icon";
import { OC, FONT } from "../design/theme";
import { t } from "../i18n";
import { WelcomeStep, TeachStep, TEACH } from "../components/teaching";

type Nav = { goBack: () => void };

const STEP_COUNT = 1 + TEACH.length; // welcome + teaching cards
const CTA_LABELS = [
  t("onboarding.cta.showMeHow"),
  t("onboarding.cta.next"),
  t("onboarding.cta.next"),
  t("onboarding.cta.gotIt"),
] as const;

export function HowItWorksScreen({ navigation }: { navigation: Nav }): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);

  const next = (): void => {
    if (step < STEP_COUNT - 1) setStep((s) => s + 1);
    else navigation.goBack();
  };

  const teach = step >= 1 ? TEACH[step - 1] : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: OC.paper }}>
      {/* Top: close · progress dots */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 18, paddingTop: insets.top + 6, paddingBottom: 6 }}>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel={t("common.close")}
          style={({ pressed }) => ({ width: 36, height: 36, borderRadius: 11, backgroundColor: OC.surface, borderWidth: 1, borderColor: OC.line, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 })}
        >
          <Icon name="x" size={19} color={OC.ink700} />
        </Pressable>
        <View style={{ flex: 1, flexDirection: "row", gap: 6, justifyContent: "center" }}>
          {Array.from({ length: STEP_COUNT }, (_, i) => (
            <View key={i} style={{ width: i === step ? 22 : 7, height: 7, borderRadius: 99, backgroundColor: i === step ? OC.green : OC.lineStrong }} />
          ))}
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 8, paddingHorizontal: 22, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
        {step === 0 ? <WelcomeStep /> : teach ? <TeachStep title={teach.title} body={teach.body} art={teach.art} /> : null}
      </ScrollView>

      <View style={{ paddingHorizontal: 22, paddingTop: 12, paddingBottom: insets.bottom + 16 }}>
        <PrimaryButton label={CTA_LABELS[step] ?? t("onboarding.cta.next")} onPress={next} />
        {step === 0 ? (
          <Pressable onPress={() => navigation.goBack()} style={{ alignItems: "center", paddingVertical: 10, marginTop: 2 }}>
            <Text style={{ fontFamily: FONT.bodyBold, fontSize: 13, color: OC.ink400 }}>{t("common.close")}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
