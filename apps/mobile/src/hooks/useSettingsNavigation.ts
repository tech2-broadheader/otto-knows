// Navigate to the Settings screen from any tab. "Settings" is on the ROOT stack
// (App.tsx) as a sibling of "Main", so navigate() by name bubbles up to it.
// Mirrors useUpgradeNavigation so every screen's header gear behaves the same.
import { useNavigation } from "@react-navigation/native";

type SettingsNavigator = { navigate: (screen: "Settings") => void };

/** Returns a callback that opens the root-stack Settings screen. */
export function useSettingsNavigation(): () => void {
  const navigation = useNavigation();
  const navigate = (navigation as unknown as SettingsNavigator).navigate;
  return () => navigate("Settings");
}
