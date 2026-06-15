// Tips (story 6.x / FR-T1, FR-T2). Gentle, general, non-prescriptive finance &
// health tips fetched from the LLM proxy. Read-only — tips never write back. A
// Finance / Health toggle switches domain. The supportive, non-medical tone is
// the safety design (spec §6.2); guardrails live server-side in the prompt.
//
// Pro-gated: when not Pro (or the backend is unconfigured / 401 / 403) a calm
// ProGate / banner shows instead of the list. Nothing ever crashes.
//
// Visual: OTTO design — a back header, Finance / Health pill toggle, the loading
// pulse, and tips in a clean card. A root-stack screen reached from Settings.
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { TipDomain } from "@otto/schemas";
import { useTips } from "../hooks/useTips";
import { EmptyState } from "../components/AsyncBoundary";
import { Banner, Card, Icon, OC } from "../components/ui";
import { ProGate, ScreenContainer } from "../components/otto-ui";
import { getApiBaseUrl } from "../lib/api-client";
import { IS_PRO } from "../lib/constants";
import { proErrorBanner } from "../lib/pro-feature";

const DOMAINS: ReadonlyArray<{ value: TipDomain; label: string }> = [
  { value: "finance", label: "Finance" },
  { value: "health", label: "Health" },
];

type TipsNavigation = { goBack: () => void; navigate: (screen: "Upgrade") => void };

function DomainToggle({
  value,
  onSelect,
  disabled,
}: {
  value: TipDomain;
  onSelect: (domain: TipDomain) => void;
  disabled: boolean;
}): React.JSX.Element {
  return (
    <View className="mb-4 mt-3 flex-row gap-2">
      {DOMAINS.map((domain) => {
        const active = domain.value === value;
        return (
          <Pressable
            key={domain.value}
            onPress={() => onSelect(domain.value)}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={`${domain.label} tips`}
            accessibilityState={{ selected: active, disabled }}
            className={`flex-1 items-center rounded-inner px-4 py-3 ${active ? "bg-green" : "bg-mist"} ${disabled ? "opacity-40" : ""}`}
          >
            <Text className={`font-body-bold ${active ? "text-white" : "text-forest"}`}>
              {domain.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function TipsScreen(): React.JSX.Element {
  const navigation = useNavigation() as unknown as TipsNavigation;
  const { status, domain, tips, error, errorCode, load } = useTips("finance");
  const [hasLoaded, setHasLoaded] = useState(false);

  const configured = getApiBaseUrl() !== null;

  const handleSelect = (next: TipDomain): void => {
    setHasLoaded(true);
    void load(next);
  };

  const BackHeader = (
    <View className="flex-row items-center gap-2 px-[18px] pb-1.5 pt-2">
      <Pressable
        onPress={() => navigation.goBack()}
        accessibilityRole="button"
        accessibilityLabel="Back"
        className="h-[38px] w-[38px] items-center justify-center rounded-inner border border-line bg-surface"
      >
        <Icon name="chevL" size={20} color={OC.ink700} />
      </Pressable>
      <Text className="font-display text-[19px] text-ink">Tips</Text>
    </View>
  );

  if (!IS_PRO || !configured) {
    return (
      <ScreenContainer>
        {BackHeader}
        <Text className="mt-3 font-body text-[13.5px] leading-5 text-ink-500">
          Gentle, general ideas for money and wellbeing — never personalised advice.
        </Text>
        <View className="mt-4">
          {!IS_PRO ? (
            <ProGate
              title="Tips is a Pro feature"
              body="Gentle, general finance & health ideas from Otto — supportive, never prescriptive."
              onUpgrade={() => navigation.navigate("Upgrade")}
            />
          ) : (
            <Banner tone="info" message={proErrorBanner("NOT_CONFIGURED", "").text} />
          )}
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      {BackHeader}
      <Text className="mt-3 font-body text-[13.5px] leading-5 text-ink-500">
        Gentle, general ideas for money and wellbeing — never personalised advice.
      </Text>

      <DomainToggle value={domain} onSelect={handleSelect} disabled={status === "loading"} />

      {!hasLoaded ? (
        <EmptyState title="Pick a topic" hint="Choose Finance or Health to see a few tips." />
      ) : null}

      {status === "loading" ? (
        <View className="mt-2 flex-row items-center justify-center gap-2.5">
          <View className="h-2.5 w-2.5 rounded-full bg-emerald" />
          <Text className="font-body-semibold text-[14px] text-ink-500">Gathering tips…</Text>
        </View>
      ) : null}

      {status === "error" && error ? (
        <Banner
          tone={proErrorBanner(errorCode, error).tone}
          message={proErrorBanner(errorCode, error).text}
        />
      ) : null}

      {status === "ready" && tips.length === 0 ? (
        <EmptyState title="No tips right now" hint="Try the other topic or check back later." />
      ) : null}

      {status === "ready" && tips.length > 0 ? (
        <Card>
          {tips.map((tip, index) => (
            <View key={`tip-${index}`} className={`flex-row ${index > 0 ? "mt-3" : ""}`}>
              <Text className="mr-2 font-body text-[15px] text-emerald" accessibilityElementsHidden>
                •
              </Text>
              <Text className="flex-1 font-body text-[14.5px] leading-[22px] text-ink-700">
                {tip}
              </Text>
            </View>
          ))}
        </Card>
      ) : null}
    </ScreenContainer>
  );
}
