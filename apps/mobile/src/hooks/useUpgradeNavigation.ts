// Navigate to the modal Upgrade paywall from any screen, however deep it sits in
// the navigators. The "Upgrade" screen is registered on the ROOT stack (App.tsx)
// as a sibling of "Main", so a navigate() by name bubbles up to it.
import { useNavigation } from "@react-navigation/native";

/** Minimal navigation surface we need to open the paywall. */
type UpgradeNavigator = { navigate: (screen: "Upgrade") => void };

/** Returns a callback that opens the root-stack Upgrade modal. */
export function useUpgradeNavigation(): () => void {
  const navigation = useNavigation();
  // reason: screens here aren't typed against the root param list; navigating to
  // the root-stack "Upgrade" screen by name is valid at runtime (navigation
  // bubbles to the parent navigator) but the local NavigationProp doesn't know it.
  const navigate = (navigation as unknown as UpgradeNavigator).navigate;
  return () => navigate("Upgrade");
}
