// First-run welcome — one warm screen that says what Otto is before we ask for
// any consent. Sets the calm, non-nagging tone (spec §2, §6.2). Presentational;
// the only action is "Get started", which advances onboarding to Consent.
import { Text, View } from "react-native";
import { ScreenScroll } from "../components/AsyncBoundary";
import { Button, Card } from "../components/ui";

export function WelcomeScreen({ onGetStarted }: { onGetStarted: () => void }): React.JSX.Element {
  return (
    <ScreenScroll>
      <View className="mb-4 mt-6">
        <Text className="text-3xl font-bold text-slate-900">Meet Otto</Text>
        <Text className="mt-2 text-base leading-6 text-slate-600">
          A calm chief-of-staff that reads your day and tells you what matters — gently, never
          nagging.
        </Text>
      </View>

      <Card title="What Otto does">
        <Text className="text-sm leading-6 text-slate-600">
          Otto brings your calendar, reminders, bills and meds together and frames them around your
          routine, so the right things land at the right moment in your real day.
        </Text>
        <Text className="mt-3 text-sm leading-6 text-slate-600">
          It only ever suggests — nothing is added or changed until you say so. And it's yours: your
          data stays on your device, and you're never sold to advertisers.
        </Text>
      </Card>

      <View className="mt-2">
        <Button label="Get started" onPress={onGetStarted} />
      </View>
    </ScreenScroll>
  );
}
