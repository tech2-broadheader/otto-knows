/** @type {import('tailwindcss').Config} */
// OTTO design system tokens (from Claude Design / otto-ds.css). "Otto knows."
module.exports = {
  presets: [require("nativewind/preset")],
  content: ["./App.tsx", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand greens
        forest: "#004D00",
        green: "#007A33", // PRIMARY
        emerald: "#10A074",
        sage: "#66B3A1",
        mint: "#B2E0D4",
        mist: "#E0F7F1",
        // Surfaces
        paper: "#F4FAF7",
        "paper-2": "#EAF4EF",
        surface: "#FFFFFF",
        dark: "#06281A",
        "dark-2": "#0B3826",
        // Ink (green-tinted neutrals)
        ink: "#08241A",
        "ink-700": "#234A3B",
        "ink-500": "#57756A",
        "ink-400": "#7E978C",
        "ink-300": "#A8BDB3",
        line: "#E0EDE7",
        "line-strong": "#CCE0D8",
        // Functional accents
        amber: "#E0992B",
        "amber-bg": "#FBF1DD",
        "amber-ink": "#9A6410",
        coral: "#DC5A48",
        "coral-bg": "#FBE6E2",
        "coral-ink": "#A83323",
        sky: "#3E91C9",
        "sky-bg": "#E2F0F8",
        "sky-ink": "#1F6896",
      },
      fontFamily: {
        // Bricolage Grotesque — display
        display: ["BricolageGrotesque_700Bold"],
        "display-extra": ["BricolageGrotesque_800ExtraBold"],
        // Plus Jakarta Sans — body
        body: ["PlusJakartaSans_400Regular"],
        "body-medium": ["PlusJakartaSans_500Medium"],
        "body-semibold": ["PlusJakartaSans_600SemiBold"],
        "body-bold": ["PlusJakartaSans_700Bold"],
        "body-extra": ["PlusJakartaSans_800ExtraBold"],
        // Space Mono — mono (eyebrows, tabular)
        mono: ["SpaceMono_400Regular"],
        "mono-bold": ["SpaceMono_700Bold"],
      },
      borderRadius: {
        pill: "999px",
        card: "22px",
        inner: "14px",
        btn: "13px",
        sm: "9px",
      },
    },
  },
  plugins: [],
};
