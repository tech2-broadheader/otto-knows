// Tips (story 6.x / FR-T1, FR-T2). Gentle, general, non-prescriptive finance &
// health tips fetched from the LLM proxy. Read-only — tips never write back. A
// Finance / Health toggle switches domain. The supportive, non-medical tone is
// the safety design (spec §6.2); guardrails live server-side in the prompt.
//
// Pro-gated: when not Pro (or the backend is unconfigured / 401 / 403) a calm
// upgrade / sign-in banner shows instead of the list. Nothing ever crashes.
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { TipDomain } from "@otto/schemas";
import { useTips } from "../hooks/useTips";
import { EmptyState, LoadingState, ScreenScroll } from "../components/AsyncBoundary";
import { Banner, Card } from "../components/ui";
import { getApiBaseUrl } from "../lib/api-client";
import { IS_PRO } from "../lib/constants";
import { proErrorBanner, proGateBanner } from "../lib/pro-feature";

const DOMAINS: ReadonlyArray<{ value: TipDomain; label: string }> = [
  { value: "finance", label: "Finance" },
  { value: "health", label: "Health" },
];

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
    <View className="mb-4 flex-row gap-2">
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
            className={`flex-1 items-center rounded-xl px-4 py-3 ${
              active ? "bg-slate-900" : "bg-slate-200"
            } ${disabled ? "opacity-40" : ""}`}
          >
            <Text className={`font-semibold ${active ? "text-white" : "text-slate-700"}`}>
              {domain.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function TipsScreen(): React.JSX.Element {
  const { status, domain, tips, error, errorCode, load } = useTips("finance");
  const [hasLoaded, setHasLoaded] = useState(false);

  const configured = getApiBaseUrl() !== null;

  const handleSelect = (next: TipDomain): void => {
    setHasLoaded(true);
    void load(next);
  };

  if (!IS_PRO || !configured) {
    const banner = !IS_PRO ? proGateBanner("Tips") : proErrorBanner("NOT_CONFIGURED", "");
    return (
      <ScreenScroll>
        <Text className="mb-1 text-2xl font-bold text-slate-900">Tips</Text>
        <Text className="mb-4 text-sm text-slate-500">
          Gentle, general ideas for money and wellbeing — never personalised advice.
        </Text>
        <Banner tone={banner.tone} message={banner.text} />
      </ScreenScroll>
    );
  }

  return (
    <ScreenScroll>
      <Text className="mb-1 text-2xl font-bold text-slate-900">Tips</Text>
      <Text className="mb-4 text-sm text-slate-500">
        Gentle, general ideas for money and wellbeing — never personalised advice.
      </Text>

      <DomainToggle value={domain} onSelect={handleSelect} disabled={status === "loading"} />

      {!hasLoaded ? (
        <EmptyState title="Pick a topic" hint="Choose Finance or Health to see a few tips." />
      ) : null}

      {status === "loading" ? <LoadingState label="Gathering tips" /> : null}

      {status === "error" && error
        ? (() => {
            const banner = proErrorBanner(errorCode, error);
            return <Banner tone={banner.tone} message={banner.text} />;
          })()
        : null}

      {status === "ready" && tips.length === 0 ? (
        <EmptyState title="No tips right now" hint="Try the other topic or check back later." />
      ) : null}

      {status === "ready" && tips.length > 0 ? (
        <Card>
          {tips.map((tip, index) => (
            <View key={`tip-${index}`} className={`flex-row ${index > 0 ? "mt-3" : ""}`}>
              <Text className="mr-2 text-base text-slate-400" accessibilityElementsHidden>
                •
              </Text>
              <Text className="flex-1 text-base leading-6 text-slate-700">{tip}</Text>
            </View>
          ))}
        </Card>
      ) : null}
    </ScreenScroll>
  );
}
