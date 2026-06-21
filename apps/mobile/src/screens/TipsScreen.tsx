// Tips (story 6.x / FR-T1, FR-T2). Gentle, general, non-prescriptive finance &
// health tips fetched from the LLM proxy. Read-only — tips never write back. A
// segmented filter switches domain. The supportive, non-medical tone is the
// safety design (spec §6.2); guardrails live server-side in the prompt.
//
// Pro-gated: when not Pro (or the backend is unconfigured / 401 / 403) a calm
// ProGate / banner shows instead of the list. Nothing ever crashes.
//
// Visual: OTTO inline-style design kit (reliable on SDK 54). An overlay/stack
// screen reached from Settings — back header, Otto's voice intro, an
// All / Money / Health segmented filter, then the tips as kit TipCards.
import { useState } from "react";
import { View, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { TipDomain } from "@otto/schemas";
import { useTips } from "../hooks/useTips";
import {
  OverlayScreen,
  ProGate,
  OttoVoice,
  Segmented,
  TipCard,
  Card,
  Display,
  EmptyState,
  type Option,
} from "../design/kit";
import { Icon } from "../design/Icon";
import { OC, FONT } from "../design/theme";
import { getApiBaseUrl } from "../lib/api-client";
import { useAuth } from "../auth/AuthProvider";
import { proErrorBanner } from "../lib/pro-feature";

type TipsNavigation = { goBack: () => void; navigate: (screen: "Upgrade") => void };

// Segmented filter. The existing hook fetches one domain at a time, so "All" and
// "Money" both load finance, "Health" loads health — preserving the original
// per-domain fetch while matching the design's three-way control.
const FILTERS: Option[] = [
  { k: "all", l: "All" },
  { k: "finance", l: "Money" },
  { k: "health", l: "Health" },
];

const ICON_FOR: Record<TipDomain, "wallet" | "heart"> = {
  finance: "wallet",
  health: "heart",
};

const TONE_FOR: Record<TipDomain, string> = {
  finance: "amber",
  health: "coral",
};

/** Calm, non-crashing banner for error / not-configured states. */
function InfoBanner({ tone, text }: { tone: "info" | "warning"; text: string }): React.JSX.Element {
  const accent = tone === "warning" ? OC.amber : OC.green;
  return (
    <Card pad={14} style={{ marginTop: 4 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 11 }}>
        <Icon name="shield" size={18} color={accent} />
        <Text style={{ flex: 1, fontFamily: FONT.body, fontSize: 13.5, lineHeight: 20, color: OC.ink700 }}>{text}</Text>
      </View>
    </Card>
  );
}

export function TipsScreen(): React.JSX.Element {
  const navigation = useNavigation() as unknown as TipsNavigation;
  const { isPro } = useAuth();
  const { status, domain, tips, error, errorCode, load } = useTips("finance");
  const [filter, setFilter] = useState<string>("all");
  const [hasLoaded, setHasLoaded] = useState(false);

  const configured = getApiBaseUrl() !== null;

  const handleFilter = (next: string): void => {
    setFilter(next);
    const nextDomain: TipDomain = next === "health" ? "health" : "finance";
    setHasLoaded(true);
    void load(nextDomain);
  };

  // Not Pro → the calm Pro gate. Configured-but-not-Pro never reaches the list.
  if (!isPro) {
    return (
      <OverlayScreen title="Tips" onBack={() => navigation.goBack()}>
        <View style={{ paddingHorizontal: 4, paddingVertical: 8 }}>
          <ProGate onUpgrade={() => navigation.navigate("Upgrade")}>
            <Display style={{ fontSize: 19, color: "#fff", lineHeight: 23 }}>Gentle tips are a Pro touch</Display>
            <Text style={{ fontSize: 13.5, color: OC.sage, marginTop: 6, lineHeight: 20, fontFamily: FONT.body }}>
              Otto notices patterns across your spending and routine and offers a kind nudge — never a scold, never a
              streak to break.
            </Text>
          </ProGate>
        </View>
      </OverlayScreen>
    );
  }

  // Pro but the cloud backend isn't wired up in this build → friendly banner.
  if (!configured) {
    return (
      <OverlayScreen title="Tips" onBack={() => navigation.goBack()}>
        <InfoBanner {...proErrorBanner("NOT_CONFIGURED", "")} />
      </OverlayScreen>
    );
  }

  return (
    <OverlayScreen title="Tips" onBack={() => navigation.goBack()}>
      <View style={{ marginBottom: 14 }}>
        <OttoVoice tone="light">
          A few quiet patterns I noticed this week. Take what&apos;s useful, leave the rest — none of this is a rule.
        </OttoVoice>
      </View>

      <View style={{ marginBottom: 16 }}>
        <Segmented options={FILTERS} value={filter} onChange={handleFilter} />
      </View>

      {!hasLoaded ? (
        <EmptyState
          icon="sparkle"
          title="Pick a topic"
          body="Choose All, Money or Health to see a few gentle tips from Otto."
        />
      ) : null}

      {status === "loading" ? (
        <View style={{ marginTop: 4, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 }}>
          <View style={{ width: 10, height: 10, borderRadius: 99, backgroundColor: OC.emerald }} />
          <Text style={{ fontFamily: FONT.bodySemi, fontSize: 14, color: OC.ink500 }}>Gathering tips…</Text>
        </View>
      ) : null}

      {status === "error" && error ? <InfoBanner {...proErrorBanner(errorCode, error)} /> : null}

      {status === "ready" && tips.length === 0 ? (
        <EmptyState
          icon="check"
          title="No tips right now"
          body="Try the other topic or check back later — Otto only nudges when there's something worth noticing."
        />
      ) : null}

      {status === "ready" && tips.length > 0
        ? tips.map((tip, index) => (
            <TipCard
              key={`tip-${index}`}
              icon={ICON_FOR[domain]}
              tone={TONE_FOR[domain]}
              domain={domain}
              title={domain === "health" ? "A gentle health note" : "A gentle money note"}
              body={tip}
            />
          ))
        : null}
    </OverlayScreen>
  );
}
