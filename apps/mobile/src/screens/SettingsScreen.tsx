// Settings. Manage consent (the same granular, revocable toggles) and show
// app/version info. Reuses ConsentScreen with an app-info footer.
import { Text } from "react-native";
import { ConsentScreen } from "./ConsentScreen";
import { Card } from "../components/ui";
import { GoogleCalendarCard } from "../components/GoogleCalendarCard";
import { CONSENT_POLICY_VERSION } from "../lib/constants";
// Read app metadata from the Expo manifest (no extra native dep).
import appConfig from "../../app.json";

const APP_NAME = appConfig.expo.name;
const APP_VERSION = appConfig.expo.version;

export function SettingsScreen(): React.JSX.Element {
  return (
    <ConsentScreen
      footer={
        <>
          <GoogleCalendarCard />
          <Card title="About">
            <Text className="text-sm text-slate-600">{APP_NAME}</Text>
            <Text className="mt-1 text-sm text-slate-400">Version {APP_VERSION}</Text>
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
