// Settings. Manage consent (the same granular, revocable toggles), reach the Pro
// surfaces (Optimizer, Tips), and show app/version info. Reuses ConsentScreen
// with an app-info footer; the Pro entries navigate within the Settings stack.
import { Pressable, Text, View } from "react-native";
import { ConsentScreen } from "./ConsentScreen";
import { Card } from "../components/ui";
import { GoogleCalendarCard } from "../components/GoogleCalendarCard";
import { CONSENT_POLICY_VERSION } from "../lib/constants";
// Read app metadata from the Expo manifest (no extra native dep). expo-constants
// would expose this at runtime, but it isn't a dependency, so we read app.json
// directly — it's the same source Expo bundles from.
// TODO: if expo-constants is added later, prefer Constants.expoConfig for parity
// with the running build.
import appConfig from "../../app.json";

const APP_NAME = appConfig.expo.name;
const APP_VERSION = appConfig.expo.version;

/** One tappable row that navigates to a Pro surface. */
function NavRow({
  title,
  subtitle,
  onPress,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      className="mb-2 flex-row items-center justify-between rounded-xl bg-slate-100 px-3 py-3"
    >
      <View className="mr-3 flex-1">
        <Text className="text-base font-medium text-slate-900">{title}</Text>
        <Text className="mt-0.5 text-sm text-slate-500">{subtitle}</Text>
      </View>
      <Text className="text-lg text-slate-400" accessibilityElementsHidden>
        ›
      </Text>
    </Pressable>
  );
}

/** Minimal nav shape we need — keeps this screen decoupled from the param list. */
type SettingsNavigation = { navigate: (screen: string) => void };

export function SettingsScreen({
  navigation,
}: {
  navigation: SettingsNavigation;
}): React.JSX.Element {
  return (
    <ConsentScreen
      footer={
        <>
          <Card title="Otto Pro">
            <NavRow
              title="Upgrade to Otto Pro"
              subtitle="See plans — unlock the assistant that thinks and adjusts."
              onPress={() => navigation.navigate("Upgrade")}
            />
            <NavRow
              title="Optimize your day"
              subtitle="Reshape your routine for a new habit — you confirm."
              onPress={() => navigation.navigate("Optimizer")}
            />
            <NavRow
              title="Tips"
              subtitle="Gentle, general finance & health ideas."
              onPress={() => navigation.navigate("Tips")}
            />
          </Card>
          <GoogleCalendarCard />
          <Card title="About Otto">
            <Text className="text-base font-medium text-slate-900">{APP_NAME}</Text>
            <Text className="mt-0.5 text-sm italic text-slate-500">Otto knows.</Text>
            <Text className="mt-2 text-sm text-slate-400">Version {APP_VERSION}</Text>
            <Text className="mt-1 text-sm text-slate-400">
              Privacy policy version {CONSENT_POLICY_VERSION}
            </Text>
            <Text className="mt-2 text-xs text-slate-400">
              Free tier runs entirely on your device. Your data stays local.
            </Text>
          </Card>
        </>
      }
    />
  );
}
