// A small, reusable "Upgrade to Pro" button that opens the modal paywall. Used
// next to every Pro gate (free caps, quota, not-pro banners) so the prompt is
// consistent and always offers a way forward. Presentational — navigation logic
// lives in useUpgradeNavigation.
import { View } from "react-native";
import { Button } from "./ui";
import { useUpgradeNavigation } from "../hooks/useUpgradeNavigation";

export function UpgradeButton({ label = "Upgrade to Pro" }: { label?: string }): React.JSX.Element {
  const goToUpgrade = useUpgradeNavigation();
  return (
    <View className="mt-2">
      <Button label={label} onPress={goToUpgrade} />
    </View>
  );
}
