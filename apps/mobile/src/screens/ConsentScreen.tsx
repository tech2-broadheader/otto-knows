// Onboarding / Consent (story 1.4). Explains each data source — what & why —
// with granular, revocable toggles. Persists via the consent repository. Nothing
// reads a source without granted consent. Body-only: the onboarding shell owns
// the step dots + CTA. Logic lives in useConsents.
//
// Visual: OTTO consent step — "What can I look at?" with per-source toggle rows
// and the encryption / no-ads note.
import { Switch, Text, View } from "react-native";
import type { DataSource } from "@otto/schemas";
import { useConsents } from "../hooks/useConsents";
import { AsyncBoundary } from "../components/AsyncBoundary";
import { Icon, OC, type IconName } from "../components/ui";

/** The free-tier sources we ask consent for, with plain-language what & why. */
const SOURCES: ReadonlyArray<{
  source: DataSource;
  title: string;
  description: string;
  purpose: string;
  icon: IconName;
  tone: string;
}> = [
  {
    source: "calendar",
    title: "Calendar & reminders",
    description: "Read your schedule to time things right",
    purpose: "Read calendar events to build your daily briefing",
    icon: "cal",
    tone: OC.sky,
  },
  {
    source: "finance",
    title: "Finance",
    description: "Bills, budget & income you enter",
    purpose: "Store and read your finances to track budget and bills",
    icon: "peso",
    tone: OC.green,
  },
  {
    source: "health",
    title: "Health data",
    description: "Most sensitive — off unless you say so",
    purpose: "Store and read medications to time dose reminders",
    icon: "heart",
    tone: OC.coral,
  },
];

export function ConsentScreen(): React.JSX.Element {
  const { state, error, isGranted, setConsent, reload } = useConsents();

  return (
    <View>
      <Text className="font-display text-[26px] text-ink">What can I look at?</Text>
      <Text className="mb-4 mt-2 font-body text-[14px] leading-[21px] text-ink-500">
        You choose, per source. Turn any of these off anytime — nothing is ever used for ads.
      </Text>

      <AsyncBoundary state={state} error={error} onRetry={reload} loadingLabel="Loading consent">
        {SOURCES.map((s, index) => (
          <View
            key={s.source}
            className={`flex-row items-center gap-3 py-3.5 ${index < SOURCES.length - 1 ? "border-b border-line" : ""}`}
          >
            <View
              className="h-10 w-10 items-center justify-center rounded-inner"
              style={{ backgroundColor: `${s.tone}1a` }}
            >
              <Icon name={s.icon} size={19} color={s.tone} />
            </View>
            <View className="flex-1">
              <Text className="font-body-bold text-[14.5px] text-ink">{s.title}</Text>
              <Text className="mt-px font-body text-[12px] text-ink-500">{s.description}</Text>
            </View>
            <Switch
              value={isGranted(s.source)}
              onValueChange={(next) => void setConsent(s.source, next, s.purpose)}
              trackColor={{ false: OC.lineStrong, true: OC.green }}
              thumbColor="#fff"
              accessibilityLabel={`Allow ${s.title}`}
              accessibilityRole="switch"
              accessibilityState={{ checked: isGranted(s.source) }}
            />
          </View>
        ))}

        <View className="mt-4 flex-row items-start gap-2.5 rounded-inner bg-mist px-3.5 py-3">
          <View className="mt-px">
            <Icon name="lock" size={17} color={OC.green} />
          </View>
          <Text className="flex-1 font-body text-[12.5px] leading-[19px] text-forest">
            Encrypted on your device, DPA-compliant, never sold. Every access to health and finance
            data is logged for your records.
          </Text>
        </View>
      </AsyncBoundary>
    </View>
  );
}
