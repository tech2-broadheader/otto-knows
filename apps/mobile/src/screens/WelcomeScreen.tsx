// First-run welcome — one warm screen that says what Otto is before we ask for
// any consent. Sets the calm, non-nagging tone (spec §2, §6.2). Presentational;
// the only action is "Get started", which advances onboarding to Consent.
//
// Visual: OTTO onboarding welcome — the hero mascot, the "Hi, I'm Otto." headline
// and the warm intro, with the step dots + CTA supplied by the onboarding shell.
import { Text, View } from "react-native";
import { OttoMascot } from "../components/otto-ui";

export function WelcomeScreen(): React.JSX.Element {
  return (
    <View className="items-center pt-3.5">
      <OttoMascot width={300} />
      <Text className="mt-1.5 text-center font-display text-[32px] leading-[34px] text-ink">
        Hi, I&apos;m Otto.
      </Text>
      <Text className="mt-3 max-w-[30ch] text-center font-body text-[15.5px] leading-[24px] text-ink-500">
        I&apos;ll hold your day together — calendar, bills, meds and your routine — and tell you
        what actually matters. Calmly. No nagging.
      </Text>
    </View>
  );
}
