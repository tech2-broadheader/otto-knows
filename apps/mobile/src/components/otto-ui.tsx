// OTTO composite primitives (Claude Design pass): Otto's voice, timeline,
// budget ring, check rows, Pro gate, app header, custom tab bar, screen shell.
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Svg, { Circle } from "react-native-svg";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import type { ReactNode } from "react";
import { Icon, OC, Pill, toneColor, type IconName, type OttoTone } from "./ui";
import { IS_PRO } from "../lib/constants";

// require() is the React Native idiom for static image assets (Metro resolves it).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const CLAM = require("../../assets/otto-clam.png");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const MASCOT = require("../../assets/otto-mascot.png");

/** Otto's clam avatar in a rounded tile (dark = the brief, light = inline). */
export function OttoAvatar({
  size = 44,
  dark = true,
}: {
  size?: number;
  dark?: boolean;
}): React.JSX.Element {
  return (
    <View
      className={`items-center justify-center overflow-hidden rounded-inner ${dark ? "bg-dark" : "bg-mist"}`}
      style={{ width: size, height: size }}
    >
      <Image
        source={CLAM}
        style={{ width: size * 0.77, height: size * 0.77 }}
        resizeMode="contain"
      />
    </View>
  );
}

/** The big hero otter (onboarding welcome, upgrade). */
export function OttoMascot({ width = 240 }: { width?: number }): React.JSX.Element {
  return <Image source={MASCOT} style={{ width, height: width * 0.7 }} resizeMode="contain" />;
}

// ---------- Otto's voice (the brief bubble) ----------
export function OttoVoice({
  children,
  title = "Otto",
  time,
  tone = "dark",
}: {
  children: ReactNode;
  title?: string;
  time?: string;
  tone?: "dark" | "light";
}): React.JSX.Element {
  const dark = tone === "dark";
  return (
    <View className="flex-row items-start gap-3">
      <OttoAvatar dark={dark} />
      <View
        className={`flex-1 rounded-[6px_18px_18px_18px] px-4 py-[15px] ${dark ? "bg-dark" : "border border-line bg-surface"}`}
      >
        <View className="mb-1.5 flex-row items-center gap-2">
          <Text className={`font-display text-[15px] ${dark ? "text-white" : "text-ink"}`}>
            {title}
          </Text>
          <View className="h-1.5 w-1.5 rounded-full bg-emerald" />
          {time ? (
            <Text
              className={`ml-auto font-body-semibold text-[11.5px] ${dark ? "text-sage" : "text-ink-400"}`}
            >
              {time}
            </Text>
          ) : null}
        </View>
        <Text
          className={`font-body text-[14.5px] leading-[22px] ${dark ? "text-white/90" : "text-ink-700"}`}
        >
          {children}
        </Text>
      </View>
    </View>
  );
}

// ---------- Check row (reminders / meds) ----------
export function CheckRow({
  checked,
  onToggle,
  icon,
  tone = "green",
  title,
  sub,
  right,
}: {
  checked: boolean;
  onToggle: () => void;
  icon?: IconName;
  tone?: OttoTone;
  title: string;
  sub?: string;
  right?: ReactNode;
}): React.JSX.Element {
  const accent = toneColor(tone);
  return (
    <Pressable
      onPress={onToggle}
      className="flex-row items-center gap-3 py-3"
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={title}
    >
      <View
        className={`h-6 w-6 items-center justify-center rounded-sm ${checked ? "bg-green" : "border-2 border-line-strong"}`}
      >
        {checked ? <Icon name="check" size={15} color="#fff" /> : null}
      </View>
      <View className="min-w-0 flex-1">
        <View className="flex-row items-center gap-2">
          {icon ? <Icon name={icon} size={16} color={accent} /> : null}
          <Text
            className={`font-body-bold text-[15px] ${checked ? "text-ink-400 line-through" : "text-ink"}`}
          >
            {title}
          </Text>
        </View>
        {sub ? <Text className="mt-0.5 font-body text-[12.5px] text-ink-500">{sub}</Text> : null}
      </View>
      {right}
    </Pressable>
  );
}

// ---------- Budget ring ----------
export function Ring({
  pct,
  value,
  label,
  size = 124,
  stroke = 13,
  color = OC.green,
}: {
  pct: number;
  value: string;
  label?: string;
  size?: number;
  stroke?: number;
  color?: string;
}): React.JSX.Element {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(Math.max(pct, 0), 1));
  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={OC.mist}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </Svg>
      <View className="absolute inset-0 items-center justify-center">
        <Text className="font-display text-[23px] text-ink">{value}</Text>
        {label ? (
          <Text className="mt-0.5 font-body-semibold text-[11px] text-ink-500">{label}</Text>
        ) : null}
      </View>
    </View>
  );
}

// ---------- Timeline row (today's rhythm / optimizer proposal) ----------
export function TimelineRow({
  time,
  icon,
  tone = "green",
  title,
  sub,
  done = false,
  last = false,
  faded = false,
}: {
  time: string;
  icon: IconName;
  tone?: OttoTone;
  title: string;
  sub?: string;
  done?: boolean;
  last?: boolean;
  faded?: boolean;
}): React.JSX.Element {
  const accent = toneColor(tone);
  return (
    <View className="flex-row gap-3" style={{ opacity: faded ? 0.5 : 1 }}>
      <Text className="w-[48px] pt-3 text-right font-body-bold text-[12.5px] text-ink-500">
        {time}
      </Text>
      <View className="items-center">
        <View
          className="mt-2 h-[34px] w-[34px] items-center justify-center rounded-inner"
          style={{ backgroundColor: done ? OC.green : `${accent}1a` }}
        >
          {done ? (
            <Icon name="check" size={17} color="#fff" />
          ) : (
            <Icon name={icon} size={17} color={accent} />
          )}
        </View>
        {!last ? <View className="my-1 w-0.5 flex-1 bg-line" /> : null}
      </View>
      <View className="flex-1 pt-2.5" style={{ paddingBottom: last ? 0 : 16 }}>
        <Text
          className={`font-body-bold text-[14.5px] ${done ? "text-ink-400 line-through" : "text-ink"}`}
        >
          {title}
        </Text>
        {sub ? <Text className="mt-0.5 font-body text-[12.5px] text-ink-500">{sub}</Text> : null}
      </View>
    </View>
  );
}

// ---------- Pro gate (dark forest upsell) ----------
export function ProGate({
  title,
  body,
  onUpgrade,
}: {
  title: string;
  body: string;
  onUpgrade: () => void;
}): React.JSX.Element {
  return (
    <View className="overflow-hidden rounded-card bg-dark p-[18px]">
      <View className="mb-2 flex-row items-center gap-2">
        <Pill tone="pro">PRO</Pill>
        <Icon name="sparkle" size={16} color={OC.emerald} />
      </View>
      <Text className="font-display text-[18px] leading-[22px] text-white">{title}</Text>
      <Text className="mt-1.5 font-body text-[13.5px] leading-5 text-sage">{body}</Text>
      <Pressable
        onPress={onUpgrade}
        className="mt-3.5 flex-row items-center justify-center gap-2 rounded-inner bg-emerald py-3"
        accessibilityRole="button"
        accessibilityLabel="Unlock with Pro"
      >
        <Text className="font-body-extra text-[14.5px] text-white">Unlock with Pro</Text>
        <Icon name="arrowR" size={17} color="#fff" />
      </Pressable>
    </View>
  );
}

// ---------- App header (per-screen title + upgrade + settings) ----------
export function AppHeader({
  title,
  sub,
  isPro,
  onUpgrade,
  onSettings,
}: {
  title: string;
  sub?: string;
  isPro: boolean;
  onUpgrade: () => void;
  onSettings: () => void;
}): React.JSX.Element {
  return (
    <View className="flex-row items-start justify-between px-[18px] pb-1.5 pt-2">
      <View className="flex-1 pr-3">
        <Text className="font-display text-[25px] leading-[26px] text-ink">{title}</Text>
        {sub ? (
          <Text className="mt-1 font-body-semibold text-[13px] text-ink-500">{sub}</Text>
        ) : null}
      </View>
      <View className="flex-row items-center gap-2">
        {isPro ? (
          <Pill tone="pro">PRO</Pill>
        ) : (
          <Pressable
            onPress={onUpgrade}
            className="flex-row items-center gap-1.5 rounded-pill bg-forest px-3 py-1.5"
            accessibilityRole="button"
            accessibilityLabel="Upgrade to Pro"
          >
            <Icon name="sparkle" size={13} color={OC.emerald} />
            <Text className="font-body-extra text-[12px] text-mint">Upgrade</Text>
          </Pressable>
        )}
        <Pressable
          onPress={onSettings}
          className="h-[38px] w-[38px] items-center justify-center rounded-inner border border-line bg-surface"
          accessibilityRole="button"
          accessibilityLabel="Settings"
        >
          <Icon name="gear" size={19} color={OC.ink700} />
        </Pressable>
      </View>
    </View>
  );
}

/**
 * AppHeader pre-wired to navigation + the local Pro flag. The gear opens the
 * root-stack Settings screen; the Upgrade pill opens the modal paywall. Screens
 * just supply title/sub so every main screen shares the exact same affordances.
 */
type HeaderNavigation = { navigate: (screen: "Settings" | "Upgrade") => void };

export function ScreenHeader({ title, sub }: { title: string; sub?: string }): React.JSX.Element {
  const navigation = useNavigation();
  // reason: main screens aren't typed against the root param list; navigating to
  // the root-stack "Settings"/"Upgrade" screens by name is valid at runtime
  // (navigation bubbles to the parent navigator).
  const nav = navigation as unknown as HeaderNavigation;
  return (
    <AppHeader
      title={title}
      sub={sub}
      isPro={IS_PRO}
      onUpgrade={() => nav.navigate("Upgrade")}
      onSettings={() => nav.navigate("Settings")}
    />
  );
}

// ---------- Screen shell (paper bg scroll, padded for the tab bar) ----------
export function ScreenContainer({ children }: { children: ReactNode }): React.JSX.Element {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-paper">
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 6,
          paddingBottom: 120,
          paddingHorizontal: 18,
        }}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </View>
  );
}

// ---------- Onboarding wizard shell (step dots + bottom CTA) ----------
export function OnboardingShell({
  step,
  stepCount,
  ctaLabel,
  onNext,
  onBack,
  onSkip,
  children,
}: {
  step: number;
  stepCount: number;
  ctaLabel: string;
  onNext: () => void;
  onBack?: () => void;
  onSkip?: () => void;
  children: ReactNode;
}): React.JSX.Element {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-paper" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center gap-2 px-[18px] py-1.5">
        {onBack && step > 0 ? (
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Back"
            className="h-9 w-9 items-center justify-center rounded-inner border border-line bg-surface"
          >
            <Icon name="chevL" size={19} color={OC.ink700} />
          </Pressable>
        ) : (
          <View className="w-9" />
        )}
        <View className="flex-1 flex-row justify-center gap-1.5">
          {Array.from({ length: stepCount }).map((_, i) => (
            <View
              key={i}
              className="h-[7px] rounded-full"
              style={{
                width: i === step ? 22 : 7,
                backgroundColor: i === step ? OC.green : OC.lineStrong,
              }}
            />
          ))}
        </View>
        {onSkip ? (
          <Pressable
            onPress={onSkip}
            accessibilityRole="button"
            accessibilityLabel="Skip"
            className="w-9 items-end"
          >
            <Text className="font-body-bold text-[12.5px] text-ink-400">Skip</Text>
          </Pressable>
        ) : (
          <View className="w-9" />
        )}
      </View>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 8, paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
      <View style={{ paddingHorizontal: 22, paddingBottom: insets.bottom + 18, paddingTop: 12 }}>
        <Pressable
          onPress={onNext}
          accessibilityRole="button"
          accessibilityLabel={ctaLabel}
          className="items-center rounded-inner bg-green py-4"
        >
          <Text className="font-body-extra text-[16px] text-white">{ctaLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ---------- Custom bottom tab bar (raised center +) ----------
const TAB_META: Record<string, { icon: IconName; label: string }> = {
  Today: { icon: "sun", label: "Today" },
  Reminders: { icon: "bell", label: "Reminders" },
  Add: { icon: "plus", label: "" },
  Finance: { icon: "peso", label: "Money" },
  Health: { icon: "pill", label: "Health" },
  Settings: { icon: "gear", label: "Settings" },
};

export function OttoTabBar({ state, navigation }: BottomTabBarProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="absolute bottom-0 left-0 right-0 flex-row items-end justify-around border-t border-line bg-surface px-2.5 pt-2.5"
      style={{ paddingBottom: Math.max(insets.bottom, 8) }}
    >
      {state.routes.map((route, index) => {
        const meta = TAB_META[route.name] ?? { icon: "sun" as IconName, label: route.name };
        const focused = state.index === index;
        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        if (route.name === "Add") {
          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              className="h-[58px] w-[58px] items-center justify-center rounded-card border-4 border-paper bg-green"
              style={{ transform: [{ translateY: -12 }] }}
              accessibilityRole="button"
              accessibilityLabel="Quick add"
            >
              <Icon name="plus" size={26} color="#fff" />
            </Pressable>
          );
        }
        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            className="w-[62px] items-center gap-1 py-0.5"
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={meta.label || route.name}
          >
            <Icon name={meta.icon} size={23} color={focused ? OC.green : OC.ink400} />
            {meta.label ? (
              <Text
                className={`text-[10.5px] ${focused ? "font-body-extra text-green" : "font-body-semibold text-ink-400"}`}
              >
                {meta.label}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
