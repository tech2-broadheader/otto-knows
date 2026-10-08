// A small, reusable "Upgrade to Pro" button that opens the modal paywall. Used
// next to every Pro gate (free caps, quota, not-pro banners) so the prompt is
// consistent and always offers a way forward. Presentational — navigation logic
// lives in useUpgradeNavigation.
import { PrimaryButton } from "../design/kit";
import { useUpgradeNavigation } from "../hooks/useUpgradeNavigation";
import { t } from "../i18n";

export function UpgradeButton({
  label = t("account.upgrade.button"),
}: {
  label?: string;
}): React.JSX.Element {
  const goToUpgrade = useUpgradeNavigation();
  return (
    <PrimaryButton label={label} icon="sparkle" onPress={goToUpgrade} style={{ marginTop: 8 }} />
  );
}
