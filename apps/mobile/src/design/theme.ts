// OTTO design tokens for React Native — the inline-style port of the approved
// app design (otto/app-ui.jsx OC palette + otto-ds.css). We style with RN style
// objects (not NativeWind) so the design renders reliably on SDK 54 / New Arch.
//
// Fonts map to the exact faces loaded by useFonts in App.tsx. Because custom RN
// fonts don't synthesize weight, pick the weight-named family directly rather
// than relying on fontWeight.
import type { TextStyle, ViewStyle } from "react-native";

export const OC = {
  green: "#007A33",
  forest: "#004D00",
  emerald: "#10A074",
  sage: "#66B3A1",
  mint: "#B2E0D4",
  mist: "#E0F7F1",
  paper: "#F4FAF7",
  paper2: "#EAF4EF",
  surface: "#FFFFFF",
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
  dark: "#06281A",
  dark2: "#0B3826",
} as const;

export type ToneKey = "green" | "emerald" | "amber" | "coral" | "sky" | "mint" | "forest";

/** Accent color for a tone name (falls back to green). */
export function toneColor(tone?: string): string {
  return (tone && (OC as Record<string, string>)[tone]) || OC.green;
}

/** A faint tinted background for an accent — mirrors the design's `${accent}1a` (10% alpha). */
export function tint(hex: string): string {
  return hex + "1a";
}

// Font families — the faces loaded in App.tsx (App gates render until ready).
export const FONT = {
  display: "BricolageGrotesque_700Bold",
  displayX: "BricolageGrotesque_800ExtraBold",
  body: "PlusJakartaSans_400Regular",
  bodyMed: "PlusJakartaSans_500Medium",
  bodySemi: "PlusJakartaSans_600SemiBold",
  bodyBold: "PlusJakartaSans_700Bold",
  bodyX: "PlusJakartaSans_800ExtraBold",
  mono: "SpaceMono_400Regular",
  monoBold: "SpaceMono_700Bold",
} as const;

/** Body font face for a numeric weight (so we never depend on RN weight synthesis). */
export function bodyFont(weight: 400 | 500 | 600 | 700 | 800 = 400): string {
  return weight >= 800
    ? FONT.bodyX
    : weight >= 700
      ? FONT.bodyBold
      : weight >= 600
        ? FONT.bodySemi
        : weight >= 500
          ? FONT.bodyMed
          : FONT.body;
}

export const RADIUS = { pill: 999, card: 20, inner: 14, btn: 13, sm: 9 } as const;

/** Soft, green-tinted elevation. Levels mirror the design's box-shadows. */
export function shadow(level: "sm" | "md" | "lg" = "md"): ViewStyle {
  const map = {
    sm: { radius: 6, opacity: 0.05, y: 2, elevation: 1 },
    md: { radius: 14, opacity: 0.05, y: 4, elevation: 3 },
    lg: { radius: 30, opacity: 0.12, y: 14, elevation: 10 },
  }[level];
  return {
    shadowColor: "#08241A",
    shadowOffset: { width: 0, height: map.y },
    shadowOpacity: map.opacity,
    shadowRadius: map.radius,
    elevation: map.elevation,
  };
}

/** The eyebrow/mono label style used across the design (SectionLabel etc.). */
export const eyebrow: TextStyle = {
  fontFamily: FONT.monoBold,
  fontSize: 11.5,
  letterSpacing: 1.4,
  textTransform: "uppercase",
  color: OC.ink400,
};
