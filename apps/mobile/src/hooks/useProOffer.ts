// Paces the one-time Pro offer. Counts each session that reaches the main app;
// once a free user has opened the app PRO_OFFER_AFTER_LAUNCHES times (and we
// haven't offered before, and auth has settled so we don't pester Pro users),
// opens the Upgrade paywall once. Calm, not naggy: it only ever fires once.
import { useEffect, useRef, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../auth/AuthProvider";
import {
  PRO_OFFER_AFTER_LAUNCHES,
  recordLaunch,
  proOfferShown,
  markProOfferShown,
} from "../lib/usage";

type UpgradeNavigator = { navigate: (screen: "Upgrade") => void };

export function useProOffer(): void {
  const { isPro, status } = useAuth();
  const navigation = useNavigation();
  const offered = useRef(false);
  const [launchCount, setLaunchCount] = useState<number | null>(null);

  // Count this session once on mount.
  useEffect(() => {
    void recordLaunch().then(setLaunchCount);
  }, []);

  // Offer once conditions are met (auth settled, free, past the threshold).
  useEffect(() => {
    if (offered.current || launchCount === null) return;
    if (status === "loading") return; // wait until we know free vs Pro
    if (isPro) return;
    if (launchCount < PRO_OFFER_AFTER_LAUNCHES) return;
    offered.current = true;
    void (async () => {
      if (await proOfferShown()) return;
      await markProOfferShown();
      // Let the app settle before the modal slides up.
      setTimeout(() => (navigation as unknown as UpgradeNavigator).navigate("Upgrade"), 1100);
    })();
  }, [launchCount, status, isPro, navigation]);
}
