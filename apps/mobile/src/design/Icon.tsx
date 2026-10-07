// OTTO icon set — react-native-svg port of the design's Lucide-style icons
// (otto/app-ui.jsx). 2px stroke, round caps. Same `name` keys as the design.
import type { ReactNode } from "react";
import { Svg, Path, Circle, Rect } from "react-native-svg";

export type IconName =
  | "sun" | "bell" | "plus" | "wallet" | "heart" | "pill" | "gear" | "check"
  | "chevR" | "chevL" | "x" | "sparkle" | "cal" | "clock" | "moon" | "coffee"
  | "peso" | "refresh" | "user" | "shield" | "lock" | "arrowR" | "dumbbell" | "trend"
  | "note" | "pin" | "trash" | "search";

function paths(name: IconName): ReactNode {
  switch (name) {
    case "sun":
      return (
        <>
          <Path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          <Circle cx="12" cy="12" r="4" />
        </>
      );
    case "bell":
      return (
        <>
          <Path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <Path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </>
      );
    case "plus":
      return <Path d="M12 5v14M5 12h14" />;
    case "wallet":
      return (
        <>
          <Path d="M3 7a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v3" />
          <Rect x="3" y="6" width="18" height="13" rx="2" />
          <Path d="M16 12.5h.01" />
        </>
      );
    case "heart":
      return <Path d="M3 12h3l2-5 4 12 2-7h6" />;
    case "pill":
      return (
        <>
          <Path d="M8 2v4M16 2v4" />
          <Rect x="4" y="5" width="16" height="17" rx="2" />
          <Path d="M9 13h6M12 10v6" />
        </>
      );
    case "gear":
      return (
        <>
          <Circle cx="12" cy="12" r="3" />
          <Path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 0 1-4 0v-.1A1.6 1.6 0 0 0 6.6 19l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 4 12.6H3a2 2 0 0 1 0-4h.1A1.6 1.6 0 0 0 5 6.6l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 11 4.1V3a2 2 0 0 1 4 0v.1A1.6 1.6 0 0 0 17.4 5l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8" />
        </>
      );
    case "check":
      return <Path d="M20 6L9 17l-5-5" />;
    case "chevR":
      return <Path d="M9 18l6-6-6-6" />;
    case "chevL":
      return <Path d="M15 18l-6-6 6-6" />;
    case "x":
      return <Path d="M18 6L6 18M6 6l12 12" />;
    case "sparkle":
      return (
        <>
          <Path d="M12 3l1.6 4.6L18 9l-4.4 1.4L12 15l-1.6-4.6L6 9l4.4-1.4z" />
          <Path d="M19 14l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" />
        </>
      );
    case "cal":
      return (
        <>
          <Rect x="3" y="4" width="18" height="18" rx="2" />
          <Path d="M3 9h18M8 2v4M16 2v4" />
        </>
      );
    case "clock":
      return (
        <>
          <Circle cx="12" cy="12" r="9" />
          <Path d="M12 7v5l3 2" />
        </>
      );
    case "moon":
      return <Path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />;
    case "coffee":
      return (
        <>
          <Path d="M17 8h1a4 4 0 0 1 0 8h-1M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z" />
          <Path d="M6 1v3M10 1v3M14 1v3" />
        </>
      );
    case "peso":
      return <Path d="M6 4h6a4 4 0 0 1 0 8H6M4 8h10M4 11h9M6 4v16" />;
    case "refresh":
      return (
        <>
          <Path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5" />
          <Path d="M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" />
        </>
      );
    case "user":
      return (
        <>
          <Circle cx="12" cy="8" r="4" />
          <Path d="M4 21a8 8 0 0 1 16 0" />
        </>
      );
    case "shield":
      return <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />;
    case "lock":
      return (
        <>
          <Rect x="3" y="11" width="18" height="11" rx="2" />
          <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </>
      );
    case "arrowR":
      return <Path d="M5 12h14M13 6l6 6-6 6" />;
    case "dumbbell":
      return <Path d="M6.5 6.5l11 11M3 9l3-3 2 2-3 3zM16 18l3-3-2-2-3 3zM18 6l-1 1M6 18l1-1" />;
    case "note":
      return (
        <>
          <Path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
          <Path d="M14 3v6h6M8 13h8M8 17h5" />
        </>
      );
    case "pin":
      return <Path d="M12 17v5M9 3h6l-1 6 4 4H6l4-4z" />;
    case "trash":
      return <Path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15" />;
    case "search":
      return (
        <>
          <Circle cx="11" cy="11" r="7" />
          <Path d="M20 20l-3.5-3.5" />
        </>
      );
    case "trend":
      return (
        <>
          <Path d="M3 17l6-6 4 4 7-7" />
          <Path d="M17 8h4v4" />
        </>
      );
  }
}

export function Icon({
  name,
  size = 22,
  stroke = 2,
  color = "currentColor",
  fill = "none",
}: {
  name: IconName;
  size?: number;
  stroke?: number;
  color?: string;
  fill?: string;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke={color}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths(name)}
    </Svg>
  );
}
