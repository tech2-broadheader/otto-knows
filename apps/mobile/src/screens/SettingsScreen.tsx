// Settings. Manage consent (the same granular, revocable toggles), reach the Pro
// surfaces (Optimizer, Tips), connect Google Calendar, and show app/version info.
// A root-stack screen reached from each main screen's header gear; its rows
// navigate to the sibling Optimizer / Tips / Upgrade screens. Consent logic lives
// in useConsents; nothing reads a source without granted consent.
//
// Visual: OTTO Settings design — a dark profile card, Connections, Consent
// toggles with the encryption note, Pro tools rows, and the About footer.
import { Pressable, Switch, Text, View } from "react-native";
import type { DataSource } from "@otto/schemas";
import { useConsents } from "../hooks/useConsents";
import { AsyncBoundary } from "../components/AsyncBoundary";
import { Card, Icon, OC, Pill, SectionLabel, type IconName } from "../components/ui";
import { OttoAvatar, ScreenContainer } from "../components/otto-ui";
import { GoogleCalendarCard } from "../components/GoogleCalendarCard";
import { CONSENT_POLICY_VERSION, IS_PRO } from "../lib/constants";
import appConfig from "../../app.json";

const APP_NAME = appConfig.expo.name;
const APP_VERSION = appConfig.expo.version;

/** The consent sources, with plain-language what & why (kept from the spine). */
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
    description: "Most sensitive · off unless you say so",
    purpose: "Store and read medications to time dose reminders",
    icon: "heart",
    tone: OC.coral,
  },
];

/** A tappable row that navigates to a Pro surface (or shows a PRO pill). */
function NavRow({
  icon,
  title,
  subtitle,
  onPress,
  locked = false,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  onPress: () => void;
  locked?: boolean;
}): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      className="flex-row items-center gap-3 py-3.5"
    >
      <View
        className="h-[38px] w-[38px] items-center justify-center rounded-inner"
        style={{ backgroundColor: `${OC.green}1a` }}
      >
        <Icon name={icon} size={18} color={OC.green} />
      </View>
      <View className="flex-1">
        <Text className="font-body-bold text-[14.5px] text-ink">{title}</Text>
        <Text className="mt-px font-body text-[12px] text-ink-500">{subtitle}</Text>
      </View>
      {locked ? <Pill tone="pro">PRO</Pill> : <Icon name="chevR" size={18} color={OC.ink400} />}
    </Pressable>
  );
}

type SettingsNavigation = { navigate: (screen: string) => void; goBack: () => void };

export function SettingsScreen({
  navigation,
}: {
  navigation: SettingsNavigation;
}): React.JSX.Element {
  const { state, error, isGranted, setConsent, reload } = useConsents();

  return (
    <ScreenContainer>
      {/* Back header */}
      <View className="flex-row items-center gap-2 px-[18px] pb-1.5 pt-2">
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          className="h-[38px] w-[38px] items-center justify-center rounded-inner border border-line bg-surface"
        >
          <Icon name="chevL" size={20} color={OC.ink700} />
        </Pressable>
        <Text className="font-display text-[19px] text-ink">Settings</Text>
      </View>

      {/* Profile card */}
      <View className="mt-3 flex-row items-center gap-3 rounded-card bg-dark p-4">
        <OttoAvatar dark={false} size={46} />
        <View className="flex-1">
          <Text className="font-display text-[18px] text-white">Your Otto</Text>
          <Text className="mt-px font-body text-[12.5px] text-sage">
            {IS_PRO ? "Otto Pro" : "Free plan"}
          </Text>
        </View>
        {IS_PRO ? (
          <Pill tone="pro">PRO</Pill>
        ) : (
          <Pressable
            onPress={() => navigation.navigate("Upgrade")}
            accessibilityRole="button"
            accessibilityLabel="Upgrade to Pro"
            className="rounded-pill bg-emerald px-3.5 py-2"
          >
            <Text className="font-body-extra text-[12.5px] text-white">Upgrade</Text>
          </Pressable>
        )}
      </View>

      <AsyncBoundary state={state} error={error} onRetry={reload} loadingLabel="Loading settings">
        {/* Connections */}
        <View className="mt-5">
          <SectionLabel>Connections</SectionLabel>
          <GoogleCalendarCard />
        </View>

        {/* Consent */}
        <View className="mt-5">
          <SectionLabel>Consent</SectionLabel>
          <Card pad="px-4 py-1">
            {SOURCES.map((s, index) => (
              <View
                key={s.source}
                className={`flex-row items-center gap-3 py-3 ${index < SOURCES.length - 1 ? "border-b border-line" : ""}`}
              >
                <View
                  className="h-[38px] w-[38px] items-center justify-center rounded-inner"
                  style={{ backgroundColor: `${s.tone}1a` }}
                >
                  <Icon name={s.icon} size={18} color={s.tone} />
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
          </Card>
          <View className="mt-3 flex-row items-start gap-2.5 rounded-inner bg-mist px-3.5 py-3">
            <View className="mt-px">
              <Icon name="lock" size={17} color={OC.green} />
            </View>
            <Text className="flex-1 font-body text-[12.5px] leading-[19px] text-forest">
              Encrypted on your device, DPA-compliant, and never sold. Every access to health and
              finance data is logged for your records.
            </Text>
          </View>
        </View>

        {/* Pro tools */}
        <View className="mt-5">
          <SectionLabel>Pro tools</SectionLabel>
          <Card pad="px-4 py-1">
            <View className="border-b border-line">
              <NavRow
                icon="dumbbell"
                title="Routine optimizer"
                subtitle="Reshape your day — you confirm"
                onPress={() => navigation.navigate("Optimizer")}
              />
            </View>
            <NavRow
              icon="sparkle"
              title="Tips"
              subtitle="Gentle finance & health"
              onPress={() => navigation.navigate("Tips")}
              locked={!IS_PRO}
            />
          </Card>
        </View>

        {/* About */}
        <View className="mt-5">
          <SectionLabel>About</SectionLabel>
          <Card>
            <Text className="font-body-bold text-[15px] text-ink">{APP_NAME}</Text>
            <Text className="mt-px font-body italic text-[13px] text-ink-500">Otto knows.</Text>
            <Text className="mt-2 font-body text-[13px] text-ink-400">Version {APP_VERSION}</Text>
            <Text className="mt-px font-body text-[13px] text-ink-400">
              Privacy policy version {CONSENT_POLICY_VERSION}
            </Text>
            <Text className="mt-2 font-body text-[12px] text-ink-400">
              Free tier runs entirely on your device. Your data stays local.
            </Text>
          </Card>
        </View>
      </AsyncBoundary>
    </ScreenContainer>
  );
}
