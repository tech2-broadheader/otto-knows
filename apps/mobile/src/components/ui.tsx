// OTTO design-system base primitives (Claude Design pass). NativeWind classes use
// the tokens in tailwind.config.js; `OC` exposes the same palette for places a
// className can't reach (icon/SVG colors). No data/business logic here.
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, Switch, Text, TextInput, View } from "react-native";
import type { ComponentProps, ReactNode } from "react";

/** Palette token values, for icon/SVG color props. */
export const OC = {
  forest: "#004D00",
  green: "#007A33",
  emerald: "#10A074",
  sage: "#66B3A1",
  mint: "#B2E0D4",
  mist: "#E0F7F1",
  paper: "#F4FAF7",
  surface: "#FFFFFF",
  dark: "#06281A",
  dark2: "#0B3826",
  ink: "#08241A",
  ink700: "#234A3B",
  ink500: "#57756A",
  ink400: "#7E978C",
  ink300: "#A8BDB3",
  line: "#E0EDE7",
  lineStrong: "#CCE0D8",
  amber: "#E0992B",
  amberBg: "#FBF1DD",
  amberInk: "#9A6410",
  coral: "#DC5A48",
  coralBg: "#FBE6E2",
  coralInk: "#A83323",
  sky: "#3E91C9",
  skyBg: "#E2F0F8",
  skyInk: "#1F6896",
} as const;

export type OttoTone = "green" | "emerald" | "amber" | "coral" | "sky" | "mint";

/** Accent color for a tone. */
export function toneColor(tone: OttoTone): string {
  return {
    green: OC.green,
    emerald: OC.emerald,
    amber: OC.amber,
    coral: OC.coral,
    sky: OC.sky,
    mint: OC.green,
  }[tone];
}

// ---------- Icon (maps design icon names to @expo/vector-icons) ----------
export type IconName =
  | "sun"
  | "bell"
  | "plus"
  | "wallet"
  | "heart"
  | "pill"
  | "gear"
  | "check"
  | "chevR"
  | "chevL"
  | "x"
  | "sparkle"
  | "cal"
  | "clock"
  | "moon"
  | "coffee"
  | "peso"
  | "refresh"
  | "user"
  | "shield"
  | "lock"
  | "arrowR"
  | "dumbbell"
  | "trend";

const FEATHER: Partial<Record<IconName, ComponentProps<typeof Feather>["name"]>> = {
  sun: "sun",
  bell: "bell",
  plus: "plus",
  heart: "heart",
  gear: "settings",
  check: "check",
  chevR: "chevron-right",
  chevL: "chevron-left",
  x: "x",
  sparkle: "star",
  cal: "calendar",
  clock: "clock",
  moon: "moon",
  coffee: "coffee",
  refresh: "refresh-cw",
  user: "user",
  shield: "shield",
  lock: "lock",
  arrowR: "arrow-right",
  trend: "trending-up",
};
const MCI: Partial<Record<IconName, ComponentProps<typeof MaterialCommunityIcons>["name"]>> = {
  pill: "pill",
  peso: "currency-php",
  dumbbell: "dumbbell",
  wallet: "wallet-outline",
};

export function Icon({
  name,
  size = 22,
  color = OC.ink,
}: {
  name: IconName;
  size?: number;
  color?: string;
}): React.JSX.Element {
  const mci = MCI[name];
  if (mci) return <MaterialCommunityIcons name={mci} size={size} color={color} />;
  return <Feather name={FEATHER[name] ?? "circle"} size={size} color={color} />;
}

// ---------- Pill ----------
type PillTone = "pro" | "free" | "mint" | "amber" | "coral" | "sky" | "green";
const PILL: Record<PillTone, string> = {
  pro: "bg-forest",
  free: "bg-mist",
  mint: "bg-mist",
  amber: "bg-amber-bg",
  coral: "bg-coral-bg",
  sky: "bg-sky-bg",
  green: "bg-green",
};
const PILL_TEXT: Record<PillTone, string> = {
  pro: "text-mint",
  free: "text-green",
  mint: "text-forest",
  amber: "text-amber-ink",
  coral: "text-coral-ink",
  sky: "text-sky-ink",
  green: "text-white",
};

export function Pill({
  tone = "mint",
  children,
}: {
  tone?: PillTone;
  children: ReactNode;
}): React.JSX.Element {
  return (
    <View className={`flex-row items-center rounded-pill px-2.5 py-1 ${PILL[tone]}`}>
      <Text className={`font-body-bold text-[11.5px] ${PILL_TEXT[tone]}`}>{children}</Text>
    </View>
  );
}

// ---------- Card ----------
export function Card({
  children,
  className = "",
  pad = "p-[18px]",
  title,
}: {
  children: ReactNode;
  className?: string;
  pad?: string;
  /** Optional in-card heading (legacy convenience; prefer SectionLabel above the card). */
  title?: string;
}): React.JSX.Element {
  return (
    <View className={`rounded-card border border-line bg-surface shadow-sm ${pad} ${className}`}>
      {title ? <Text className="mb-2 font-display text-[15px] text-ink">{title}</Text> : null}
      {children}
    </View>
  );
}

// ---------- Section label (mono eyebrow) ----------
export function SectionLabel({
  children,
  right,
}: {
  children: ReactNode;
  right?: ReactNode;
}): React.JSX.Element {
  return (
    <View className="mx-0.5 mb-2.5 mt-1 flex-row items-center justify-between">
      <Text className="font-mono-bold text-[11.5px] uppercase tracking-[1.4px] text-ink-400">
        {children}
      </Text>
      {right}
    </View>
  );
}

// ---------- Button ----------
type ButtonVariant = "primary" | "dark" | "ghost" | "mint" | "danger" | "secondary";
const BTN_BG: Record<ButtonVariant, string> = {
  primary: "bg-green",
  dark: "bg-dark",
  ghost: "bg-transparent border-[1.5px] border-line-strong",
  mint: "bg-mint",
  danger: "bg-coral",
  secondary: "bg-transparent border-[1.5px] border-line-strong",
};
const BTN_TEXT: Record<ButtonVariant, string> = {
  primary: "text-white",
  dark: "text-mint",
  ghost: "text-ink-700",
  mint: "text-forest",
  danger: "text-white",
  secondary: "text-ink-700",
};

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  icon,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  icon?: IconName;
}): React.JSX.Element {
  return (
    <Pressable
      className={`flex-row items-center justify-center gap-2 rounded-btn px-[22px] py-[13px] ${BTN_BG[variant]} ${disabled ? "opacity-40" : "active:opacity-90"}`}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
    >
      {icon ? (
        <Icon
          name={icon}
          size={17}
          color={variant === "primary" || variant === "danger" ? "#fff" : OC.green}
        />
      ) : null}
      <Text className={`font-body-bold text-[15px] ${BTN_TEXT[variant]}`}>{label}</Text>
    </Pressable>
  );
}

// ---------- Labeled text input ----------
export function LabeledInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric" | "decimal-pad";
  multiline?: boolean;
}): React.JSX.Element {
  return (
    <View className="mb-3">
      <Text className="mb-1 font-body-medium text-sm text-ink-500">{label}</Text>
      <TextInput
        className="rounded-inner border border-line bg-surface px-3.5 py-2.5 font-body text-[15px] text-ink"
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={OC.ink400}
        keyboardType={keyboardType}
        multiline={multiline}
        accessibilityLabel={label}
      />
    </View>
  );
}

// ---------- Toggle row (consent etc.) ----------
export function ToggleRow({
  label,
  description,
  value,
  onValueChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
}): React.JSX.Element {
  return (
    <View className="mb-3 flex-row items-center justify-between">
      <View className="mr-3 flex-1">
        <Text className="font-body-bold text-base text-ink">{label}</Text>
        {description ? (
          <Text className="mt-0.5 font-body text-sm text-ink-500">{description}</Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: OC.lineStrong, true: OC.green }}
        thumbColor="#fff"
        accessibilityLabel={label}
        accessibilityRole="switch"
        accessibilityState={{ checked: value }}
      />
    </View>
  );
}

// ---------- Inline banner ----------
export function Banner({
  message,
  tone = "info",
}: {
  message: string;
  tone?: "info" | "warning" | "critical";
}): React.JSX.Element {
  const box =
    tone === "warning" ? "bg-amber-bg" : tone === "critical" ? "bg-coral-bg" : "bg-sky-bg";
  const text =
    tone === "warning" ? "text-amber-ink" : tone === "critical" ? "text-coral-ink" : "text-sky-ink";
  return (
    <View className={`mb-3 rounded-inner p-3 ${box}`} accessibilityRole="text">
      <Text className={`font-body-medium text-sm ${text}`}>{message}</Text>
    </View>
  );
}
