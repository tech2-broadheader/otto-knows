// OTTO shared UI kit — RN inline-style port of otto/app-ui.jsx (+ a few screen
// primitives). Pixel-faithful to the approved design; no NativeWind. Everything
// styles via RN style objects so it renders reliably on SDK 54 / New Arch.
import { useState, type ReactNode } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  TextInput as RNTextInput,
  type ViewStyle,
  type TextStyle,
  type StyleProp,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle } from "react-native-svg";
import { Icon, type IconName } from "./Icon";
import { OC, FONT, RADIUS, shadow, toneColor, tint, eyebrow, bodyFont } from "./theme";

/* eslint-disable @typescript-eslint/no-require-imports -- RN static assets */
const CLAM = require("../../assets/otto-clam.png");
export const MASCOT = require("../../assets/otto-mascot.png");
export const CLAM_ASSET = CLAM;
/* eslint-enable @typescript-eslint/no-require-imports */

// ─────────── Screen scroll container ───────────
// Paper background, top safe-area inset, and bottom padding clearing the tab bar.
export function Screen({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: OC.paper }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[{ paddingTop: insets.top + 6, paddingBottom: 120 }, style]}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </View>
  );
}

// ─────────── Pill ───────────
const PILL_MAP: Record<string, { bg: string; c: string }> = {
  pro: { bg: OC.forest, c: OC.mint },
  free: { bg: OC.mist, c: OC.green },
  mint: { bg: OC.mist, c: OC.forest },
  amber: { bg: OC.amberBg, c: OC.amberInk },
  coral: { bg: OC.coralBg, c: OC.coralInk },
  sky: { bg: OC.skyBg, c: OC.skyInk },
  green: { bg: OC.green, c: "#fff" },
};
export function Pill({
  tone = "mint",
  children,
  style,
}: {
  tone?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const m = PILL_MAP[tone] ?? PILL_MAP.mint;
  return (
    <View
      style={[
        { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: m.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.pill, alignSelf: "flex-start" },
        style,
      ]}
    >
      {typeof children === "string" ? (
        <Text style={{ color: m.c, fontFamily: FONT.bodyBold, fontSize: 11.5 }}>{children}</Text>
      ) : (
        children
      )}
    </View>
  );
}

// ─────────── Card ───────────
export function Card({
  children,
  style,
  pad = 18,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  pad?: number;
}) {
  return (
    <View
      style={[
        { backgroundColor: OC.surface, borderRadius: RADIUS.card, borderWidth: 1, borderColor: OC.line, padding: pad },
        shadow("md"),
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ─────────── Text helpers ───────────
export function Display({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[{ fontFamily: FONT.display, color: OC.ink, letterSpacing: -0.5 }, style]}>{children}</Text>;
}
export function Body({
  children,
  weight = 400,
  style,
}: {
  children: ReactNode;
  weight?: 400 | 500 | 600 | 700 | 800;
  style?: StyleProp<TextStyle>;
}) {
  return <Text style={[{ fontFamily: bodyFont(weight), color: OC.ink700 }, style]}>{children}</Text>;
}

export function SectionLabel({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginHorizontal: 2, marginTop: 4, marginBottom: 10 }}>
      <Text style={eyebrow}>{children}</Text>
      {right}
    </View>
  );
}

// ─────────── Buttons ───────────
export function PrimaryButton({
  label,
  onPress,
  icon,
  disabled,
  style,
}: {
  label: string;
  onPress?: () => void;
  icon?: IconName;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        { backgroundColor: disabled ? OC.line : OC.green, borderRadius: RADIUS.btn, paddingVertical: 14, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, opacity: pressed ? 0.9 : 1 },
        style,
      ]}
    >
      <Text style={{ color: "#fff", fontFamily: FONT.bodyX, fontSize: 15.5 }}>{label}</Text>
      {icon && <Icon name={icon} size={17} color="#fff" />}
    </Pressable>
  );
}
export function GhostButton({ label, onPress, style }: { label: string; onPress?: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        { borderWidth: 1.5, borderColor: OC.lineStrong, borderRadius: RADIUS.btn, paddingVertical: 13, paddingHorizontal: 18, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 },
        style,
      ]}
    >
      <Text style={{ color: OC.ink700, fontFamily: FONT.bodyBold, fontSize: 14.5 }}>{label}</Text>
    </Pressable>
  );
}

// ─────────── Otto's voice (the brief) ───────────
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
}) {
  const dark = tone === "dark";
  return (
    <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
      <View style={[{ width: 44, height: 44, borderRadius: 14, backgroundColor: dark ? OC.dark : OC.mist, alignItems: "center", justifyContent: "center", overflow: "hidden" }, dark && shadow("md")]}>
        <Image source={CLAM} style={{ width: 34, height: 34, resizeMode: "contain" }} />
      </View>
      <View
        style={[
          { flex: 1, backgroundColor: dark ? OC.dark : OC.surface, borderTopLeftRadius: 6, borderTopRightRadius: 18, borderBottomLeftRadius: 18, borderBottomRightRadius: 18, paddingVertical: 15, paddingHorizontal: 17 },
          !dark && { borderWidth: 1, borderColor: OC.line },
          shadow(dark ? "lg" : "md"),
        ]}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 7 }}>
          <Text style={{ fontFamily: FONT.display, fontSize: 15, color: dark ? "#fff" : OC.ink }}>{title}</Text>
          <View style={{ width: 6, height: 6, borderRadius: 99, backgroundColor: OC.emerald }} />
          {time ? <Text style={{ marginLeft: "auto", fontSize: 11.5, color: dark ? OC.sage : OC.ink400, fontFamily: FONT.bodySemi }}>{time}</Text> : null}
        </View>
        <Text style={{ fontSize: 14.5, lineHeight: 22, color: dark ? "rgba(255,255,255,.9)" : OC.ink700, fontFamily: FONT.body }}>{children}</Text>
      </View>
    </View>
  );
}

// ─────────── Proposal (propose-and-confirm) ───────────
export function ProposalCard({
  icon = "cal",
  tone = "green",
  title,
  detail,
  onAccept,
  onDismiss,
  state,
}: {
  icon?: IconName;
  tone?: string;
  title: string;
  detail?: string;
  onAccept?: () => void;
  onDismiss?: () => void;
  state?: "accepted" | "dismissed";
}) {
  const accent = toneColor(tone);
  if (state === "accepted")
    return (
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: OC.mist, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16 }}>
        <Icon name="check" size={18} color={OC.green} />
        <Text style={{ color: OC.green, fontFamily: FONT.bodyBold, fontSize: 14 }}>Added to your day.</Text>
      </View>
    );
  if (state === "dismissed")
    return (
      <View style={{ backgroundColor: OC.paper, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, borderWidth: 1, borderColor: OC.lineStrong, borderStyle: "dashed" }}>
        <Text style={{ color: OC.ink400, fontFamily: FONT.bodySemi, fontSize: 14 }}>Dismissed — no changes made.</Text>
      </View>
    );
  return (
    <View style={[{ backgroundColor: OC.surface, borderWidth: 1.5, borderColor: OC.lineStrong, borderRadius: 18, overflow: "hidden" }, shadow("md")]}>
      <View style={{ flexDirection: "row", gap: 12, paddingTop: 15, paddingHorizontal: 16, paddingBottom: 13 }}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: tint(accent), alignItems: "center", justifyContent: "center" }}>
          <Icon name={icon} size={20} color={accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[eyebrow, { fontSize: 10.5, marginBottom: 3 }]}>Otto proposes</Text>
          <Display style={{ fontSize: 16.5, lineHeight: 20 }}>{title}</Display>
          {detail ? <Text style={{ fontSize: 13, color: OC.ink500, marginTop: 4, lineHeight: 19, fontFamily: FONT.body }}>{detail}</Text> : null}
        </View>
      </View>
      <View style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: OC.line }}>
        <Pressable onPress={onDismiss} style={({ pressed }) => [{ flex: 1, paddingVertical: 13, alignItems: "center", borderRightWidth: 1, borderRightColor: OC.line, opacity: pressed ? 0.6 : 1 }]}>
          <Text style={{ color: OC.ink500, fontFamily: FONT.bodyBold, fontSize: 14 }}>Not now</Text>
        </Pressable>
        <Pressable onPress={onAccept} style={({ pressed }) => [{ flex: 1.4, paddingVertical: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, opacity: pressed ? 0.6 : 1 }]}>
          <Icon name="check" size={17} color={OC.green} />
          <Text style={{ color: OC.green, fontFamily: FONT.bodyX, fontSize: 14 }}>Yes, do it</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─────────── Check row ───────────
export function CheckRow({
  checked,
  onToggle,
  icon,
  tone = "green",
  title,
  sub,
  right,
}: {
  checked?: boolean;
  onToggle?: () => void;
  icon?: IconName;
  tone?: string;
  title: string;
  sub?: string;
  right?: ReactNode;
}) {
  const accent = toneColor(tone);
  return (
    <Pressable onPress={onToggle} style={{ flexDirection: "row", alignItems: "center", gap: 13, paddingVertical: 13, paddingHorizontal: 4 }}>
      <View style={{ width: 24, height: 24, borderRadius: 8, borderWidth: checked ? 0 : 2, borderColor: OC.lineStrong, backgroundColor: checked ? OC.green : "transparent", alignItems: "center", justifyContent: "center" }}>
        {checked && <Icon name="check" size={15} color="#fff" stroke={3} />}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {icon && <Icon name={icon} size={16} color={accent} />}
          <Text style={{ fontSize: 15, fontFamily: FONT.bodyBold, color: checked ? OC.ink400 : OC.ink, textDecorationLine: checked ? "line-through" : "none", flexShrink: 1 }}>{title}</Text>
        </View>
        {sub ? <Text style={{ fontSize: 12.5, color: OC.ink500, marginTop: 2, marginLeft: icon ? 24 : 0, fontFamily: FONT.body }}>{sub}</Text> : null}
      </View>
      {right}
    </Pressable>
  );
}

// ─────────── Budget ring ───────────
export function Ring({ pct, size = 128, stroke = 13, color = OC.green, track = OC.mist, label, value }: { pct: number; size?: number; stroke?: number; color?: string; track?: string; label?: string; value: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.min(pct, 1));
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} />
      </Svg>
      <View style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center" }}>
        <Display style={{ fontSize: 23, lineHeight: 24 }}>{value}</Display>
        {label ? <Text style={{ fontSize: 11, color: OC.ink500, marginTop: 3, fontFamily: FONT.bodySemi }}>{label}</Text> : null}
      </View>
    </View>
  );
}

// ─────────── Timeline row ───────────
export function TLRow({
  time,
  icon,
  tone = "green",
  title,
  sub,
  done,
  last,
  faded,
}: {
  time: string;
  icon: IconName;
  tone?: string;
  title: string;
  sub?: string;
  done?: boolean;
  last?: boolean;
  faded?: boolean;
}) {
  const accent = toneColor(tone);
  return (
    <View style={{ flexDirection: "row", gap: 13, opacity: faded ? 0.5 : 1 }}>
      <Text style={{ width: 52, textAlign: "right", fontSize: 12.5, fontFamily: FONT.bodyBold, color: OC.ink500, paddingTop: 13 }}>{time}</Text>
      <View style={{ alignItems: "center" }}>
        <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: done ? OC.green : tint(accent), alignItems: "center", justifyContent: "center", marginTop: 8 }}>
          {done ? <Icon name="check" size={17} color="#fff" stroke={3} /> : <Icon name={icon} size={17} color={accent} />}
        </View>
        {!last && <View style={{ width: 2, flex: 1, backgroundColor: OC.line, marginVertical: 4 }} />}
      </View>
      <View style={{ flex: 1, paddingBottom: last ? 0 : 16, paddingTop: 10 }}>
        <Text style={{ fontSize: 14.5, fontFamily: FONT.bodyBold, color: done ? OC.ink400 : OC.ink, textDecorationLine: done ? "line-through" : "none" }}>{title}</Text>
        {sub ? <Text style={{ fontSize: 12.5, color: OC.ink500, marginTop: 2, fontFamily: FONT.body }}>{sub}</Text> : null}
      </View>
    </View>
  );
}

// ─────────── Per-screen header ───────────
export function AppHeader({
  title,
  sub,
  isPro,
  onUpgrade,
  onSettings,
}: {
  title: string;
  sub?: string;
  isPro?: boolean;
  onUpgrade?: () => void;
  onSettings?: () => void;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", paddingHorizontal: 18, paddingTop: 8, paddingBottom: 6 }}>
      <View style={{ flex: 1, paddingRight: 10 }}>
        <Display style={{ fontSize: 25, lineHeight: 27 }}>{title}</Display>
        {sub ? <Text style={{ fontSize: 13, color: OC.ink500, marginTop: 3, fontFamily: FONT.bodySemi }}>{sub}</Text> : null}
      </View>
      <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
        {isPro ? (
          <Pill tone="pro">PRO</Pill>
        ) : (
          <Pressable onPress={onUpgrade} style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: OC.forest, borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 6, opacity: pressed ? 0.85 : 1 }]}>
            <Icon name="sparkle" size={13} color={OC.emerald} />
            <Text style={{ color: OC.mint, fontFamily: FONT.bodyX, fontSize: 12 }}>Upgrade</Text>
          </Pressable>
        )}
        <Pressable onPress={onSettings} style={({ pressed }) => [{ width: 38, height: 38, borderRadius: 12, backgroundColor: OC.surface, borderWidth: 1, borderColor: OC.line, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 }]}>
          <Icon name="gear" size={19} color={OC.ink700} />
        </Pressable>
      </View>
    </View>
  );
}

// ─────────── Pro gate banner ───────────
export function ProGate({ onUpgrade, children }: { onUpgrade?: () => void; children: ReactNode }) {
  return (
    <LinearGradient colors={[OC.dark, OC.dark2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: RADIUS.card, padding: 18, overflow: "hidden" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <Pill tone="pro">PRO</Pill>
        <Icon name="sparkle" size={16} color={OC.emerald} />
      </View>
      {children}
      <Pressable onPress={onUpgrade} style={({ pressed }) => [{ marginTop: 14, paddingVertical: 12, borderRadius: 12, backgroundColor: OC.emerald, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, opacity: pressed ? 0.9 : 1 }]}>
        <Text style={{ color: "#fff", fontFamily: FONT.bodyX, fontSize: 14.5 }}>Unlock with Pro</Text>
        <Icon name="arrowR" size={17} color="#fff" />
      </Pressable>
    </LinearGradient>
  );
}

// ─────────── Dark gradient card (Health hero, Settings profile) ───────────
export function GradientCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <LinearGradient colors={[OC.dark, OC.dark2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[{ borderRadius: RADIUS.card, padding: 18, overflow: "hidden" }, style]}>
      {children}
    </LinearGradient>
  );
}

// ─────────── Bottom tab bar (Today · Reminders · + · Money · Health) ───────────
const TAB_META: Record<string, { icon: IconName; label: string }> = {
  Today: { icon: "sun", label: "Today" },
  Reminders: { icon: "bell", label: "Reminders" },
  Add: { icon: "plus", label: "" },
  Finance: { icon: "peso", label: "Money" },
  Health: { icon: "pill", label: "Health" },
};
export function OttoTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-around", backgroundColor: "rgba(255,255,255,0.96)", borderTopWidth: 1, borderTopColor: OC.line, paddingTop: 9, paddingHorizontal: 10, paddingBottom: Math.max(insets.bottom, 8) }, shadow("lg")]}>
      {state.routes.map((route, i) => {
        const meta = TAB_META[route.name] ?? { icon: "sun", label: route.name };
        const focused = state.index === i;
        const onPress = () => {
          const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };
        if (route.name === "Add") {
          return (
            <Pressable key={route.key} onPress={onPress} style={{ transform: [{ translateY: -12 }], width: 58, height: 58, borderRadius: 20, backgroundColor: OC.green, borderWidth: 4, borderColor: OC.paper, alignItems: "center", justifyContent: "center" }}>
              <Icon name="plus" size={26} color="#fff" stroke={2.6} />
            </Pressable>
          );
        }
        return (
          <Pressable key={route.key} onPress={onPress} style={{ alignItems: "center", gap: 4, width: 62, paddingVertical: 2 }}>
            <Icon name={meta.icon} size={23} color={focused ? OC.green : OC.ink400} stroke={focused ? 2.4 : 2} />
            <Text style={{ fontSize: 10.5, fontFamily: focused ? FONT.bodyX : FONT.bodySemi, color: focused ? OC.green : OC.ink400 }}>{meta.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─────────── Overlay/stack screen (back header + scroll), e.g. Settings, Tips ───────────
export function OverlayScreen({
  title,
  onBack,
  children,
  dark,
  footer,
}: {
  title?: string;
  onBack: () => void;
  children: ReactNode;
  dark?: boolean;
  footer?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: dark ? OC.dark : OC.paper }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingTop: insets.top + 4, paddingBottom: 8 }}>
        <Pressable onPress={onBack} style={({ pressed }) => [{ width: 38, height: 38, borderRadius: 12, backgroundColor: dark ? "rgba(255,255,255,0.08)" : OC.surface, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 }, !dark && { borderWidth: 1, borderColor: OC.line }]}>
          <Icon name="chevL" size={20} color={dark ? "#fff" : OC.ink700} />
        </Pressable>
        {title ? <Display style={{ fontSize: 19, color: dark ? "#fff" : OC.ink }}>{title}</Display> : null}
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 8, paddingBottom: footer ? 18 : insets.bottom + 30 }} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
      {footer ? <View style={{ paddingHorizontal: 18, paddingTop: 12, paddingBottom: insets.bottom + 12, borderTopWidth: 1, borderTopColor: OC.line, backgroundColor: OC.surface }}>{footer}</View> : null}
    </View>
  );
}

// ─────────── Empty state ───────────
export function EmptyState({ icon = "check", title, body, action, onAction, tone = "green" }: { icon?: IconName; title: string; body: string; action?: string; onAction?: () => void; tone?: string }) {
  const accent = toneColor(tone);
  return (
    <View style={{ alignItems: "center", paddingVertical: 30, paddingHorizontal: 18 }}>
      <View style={{ width: 74, height: 74, borderRadius: 22, backgroundColor: accent + "14", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
        <Icon name={icon} size={34} color={accent} />
      </View>
      <Display style={{ fontSize: 21, textAlign: "center" }}>{title}</Display>
      <Text style={{ fontSize: 14, color: OC.ink500, marginTop: 8, lineHeight: 21, textAlign: "center", maxWidth: 300, fontFamily: FONT.body }}>{body}</Text>
      {action ? (
        <Pressable onPress={onAction} style={({ pressed }) => [{ marginTop: 18, backgroundColor: OC.surface, borderWidth: 1.5, borderColor: OC.lineStrong, borderRadius: RADIUS.btn, paddingVertical: 11, paddingHorizontal: 20, opacity: pressed ? 0.7 : 1 }]}>
          <Text style={{ color: OC.green, fontFamily: FONT.bodyX, fontSize: 14 }}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// ─────────── Dashed "Add …" button ───────────
export function AddButton({ label, onPress }: { label: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ marginTop: 16, backgroundColor: OC.surface, borderWidth: 1.5, borderColor: OC.lineStrong, borderStyle: "dashed", borderRadius: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, opacity: pressed ? 0.7 : 1 }]}>
      <Icon name="plus" size={18} color={OC.green} />
      <Text style={{ color: OC.green, fontFamily: FONT.bodyX, fontSize: 14.5 }}>{label}</Text>
    </Pressable>
  );
}

// ─────────── Toggle switch ───────────
export function OToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <Pressable onPress={onToggle} style={{ width: 46, height: 28, borderRadius: 99, backgroundColor: on ? OC.green : OC.lineStrong, justifyContent: "center" }}>
      <View style={[{ width: 22, height: 22, borderRadius: 99, backgroundColor: "#fff", marginLeft: on ? 21 : 3 }, shadow("sm")]} />
    </Pressable>
  );
}

export function ToggleRow({ icon, tone = "green", title, sub, on, onToggle, last }: { icon?: IconName; tone?: string; title: string; sub?: string; on: boolean; onToggle: () => void; last?: boolean }) {
  const accent = toneColor(tone);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 13, paddingVertical: 13, borderBottomWidth: last ? 0 : 1, borderBottomColor: OC.line }}>
      {icon ? (
        <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: tint(accent), alignItems: "center", justifyContent: "center" }}>
          <Icon name={icon} size={18} color={accent} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14.5, fontFamily: FONT.bodyBold, color: OC.ink }}>{title}</Text>
        {sub ? <Text style={{ fontSize: 12, color: OC.ink500, marginTop: 1, lineHeight: 17, fontFamily: FONT.body }}>{sub}</Text> : null}
      </View>
      <OToggle on={on} onToggle={onToggle} />
    </View>
  );
}

// ─────────── Form primitives ───────────
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: 7 }}>
        <Text style={{ fontSize: 13, fontFamily: FONT.bodyX, color: OC.ink700 }}>{label}</Text>
        {hint ? <Text style={{ fontSize: 11.5, color: OC.ink400, fontFamily: FONT.bodySemi }}>{hint}</Text> : null}
      </View>
      {children}
    </View>
  );
}

export function TextField({
  value,
  onChangeText,
  placeholder,
  prefix,
  big,
  multiline,
  secure,
  keyboardType,
  autoCapitalize,
  autoComplete,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  prefix?: string;
  big?: boolean;
  multiline?: boolean;
  secure?: boolean;
  keyboardType?: "default" | "email-address" | "numeric" | "decimal-pad" | "number-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  autoComplete?: "email" | "password" | "off";
}) {
  const [foc, setFoc] = useState(false);
  return (
    <View style={{ flexDirection: "row", alignItems: multiline ? "flex-start" : "center", gap: 8, backgroundColor: OC.surface, borderWidth: 2, borderColor: foc ? OC.emerald : OC.line, borderRadius: 14, paddingHorizontal: big ? 15 : 14, paddingVertical: big ? 13 : 11 }}>
      {prefix ? <Text style={{ fontFamily: FONT.display, fontSize: big ? 22 : 17, color: OC.ink400 }}>{prefix}</Text> : null}
      <RNTextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={OC.ink400}
        onFocus={() => setFoc(true)}
        onBlur={() => setFoc(false)}
        multiline={multiline}
        secureTextEntry={secure}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        style={{ flex: 1, fontFamily: big ? FONT.bodyBold : FONT.bodySemi, fontSize: big ? 17 : 15.5, color: OC.ink, padding: 0, minHeight: multiline ? 44 : undefined }}
      />
    </View>
  );
}

export type Option = { k: string; l: string; tone?: string; icon?: IconName };

export function Segmented({ options, value, onChange }: { options: Option[]; value: string; onChange: (k: string) => void }) {
  return (
    <View style={{ flexDirection: "row", backgroundColor: OC.surface, borderWidth: 1, borderColor: OC.line, borderRadius: RADIUS.btn, padding: 4, gap: 4 }}>
      {options.map((o) => {
        const on = value === o.k;
        return (
          <Pressable key={o.k} onPress={() => onChange(o.k)} style={{ flex: 1, backgroundColor: on ? OC.forest : "transparent", paddingVertical: 9, borderRadius: 9, alignItems: "center" }}>
            <Text style={{ color: on ? OC.mint : OC.ink500, fontFamily: FONT.bodyX, fontSize: 12.5 }}>{o.l}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ChoicePills({ options, value, onChange }: { options: Option[]; value: string; onChange: (k: string) => void }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {options.map((o) => {
        const on = value === o.k;
        const accent = toneColor(o.tone);
        return (
          <Pressable key={o.k} onPress={() => onChange(o.k)} style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: on ? accent : OC.surface, borderWidth: 1.5, borderColor: on ? accent : OC.line, borderRadius: RADIUS.pill, paddingHorizontal: 14, paddingVertical: 8 }}>
            {o.icon ? <Icon name={o.icon} size={14} color={on ? "#fff" : accent} /> : null}
            <Text style={{ color: on ? "#fff" : OC.ink700, fontFamily: FONT.bodyBold, fontSize: 13 }}>{o.l}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SaveBar({ onCancel, onSave, label = "Save", disabled }: { onCancel: () => void; onSave: () => void; label?: string; disabled?: boolean }) {
  return (
    <View style={{ flexDirection: "row", gap: 10 }}>
      <GhostButton label="Cancel" onPress={onCancel} style={{ flex: 1 }} />
      <PrimaryButton label={label} icon="check" onPress={onSave} disabled={disabled} style={{ flex: 1.6 }} />
    </View>
  );
}

export function FormSaved({ icon = "check", title, sub, onDone, doneLabel = "Done" }: { icon?: IconName; title: string; sub: string; onDone: () => void; doneLabel?: string }) {
  return (
    <View style={{ alignItems: "center", paddingVertical: 34, paddingHorizontal: 8 }}>
      <View style={{ width: 66, height: 66, borderRadius: 20, backgroundColor: OC.mist, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
        <Icon name={icon} size={32} color={OC.green} stroke={2.6} />
      </View>
      <Display style={{ fontSize: 22, textAlign: "center" }}>{title}</Display>
      <Text style={{ fontSize: 14, color: OC.ink500, marginTop: 7, lineHeight: 21, textAlign: "center", maxWidth: 300, fontFamily: FONT.body }}>{sub}</Text>
      <PrimaryButton label={doneLabel} onPress={onDone} style={{ marginTop: 20, paddingHorizontal: 26 }} />
    </View>
  );
}

// ─────────── Tip card (Pro tips) ───────────
export function TipCard({ icon, tone = "green", domain, title, body }: { icon: IconName; tone?: string; domain: "finance" | "health"; title: string; body: string }) {
  const accent = toneColor(tone);
  return (
    <Card pad={16} style={{ marginBottom: 11 }}>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: tint(accent), alignItems: "center", justifyContent: "center" }}>
          <Icon name={icon} size={20} color={accent} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ marginBottom: 5 }}>
            <Pill tone={domain === "health" ? "coral" : "mint"}>{domain === "health" ? "Health" : "Money"}</Pill>
          </View>
          <Display style={{ fontSize: 16, lineHeight: 20 }}>{title}</Display>
          <Text style={{ fontSize: 13.5, color: OC.ink700, lineHeight: 20, marginTop: 5, fontFamily: FONT.body }}>{body}</Text>
        </View>
      </View>
      <View style={{ marginTop: 11, paddingTop: 10, borderTopWidth: 1, borderTopColor: OC.line, flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Icon name="shield" size={13} color={OC.ink400} />
        <Text style={{ fontSize: 11.5, color: OC.ink400, fontFamily: FONT.body }}>{domain === "health" ? "A gentle nudge — not medical advice." : "General guidance, not financial advice."}</Text>
      </View>
    </Card>
  );
}
