// "How Otto works" teaching cards — shared by first-run onboarding and the
// replayable tour reachable from Settings. Each card teaches by example, showing
// a real design-kit component (the brief bubble, a proposal card). Pure
// presentational; no data hooks.
import type { ReactNode } from "react";
import { View, Text, Image } from "react-native";
import { Display, OttoVoice, ProposalCard, MASCOT } from "../design/kit";
import { Icon, type IconName } from "../design/Icon";
import { OC, FONT, toneColor, tint } from "../design/theme";

/** The four data sources Otto unifies, as a tidy row of tiles. */
function SourceTiles(): React.JSX.Element {
  const tiles: { icon: IconName; tone: string; label: string }[] = [
    { icon: "cal", tone: "sky", label: "Calendar" },
    { icon: "peso", tone: "green", label: "Money" },
    { icon: "pill", tone: "coral", label: "Meds" },
    { icon: "sun", tone: "amber", label: "Routine" },
  ];
  return (
    <View style={{ flexDirection: "row", justifyContent: "center", gap: 14, flexWrap: "wrap" }}>
      {tiles.map((t) => {
        const a = toneColor(t.tone);
        return (
          <View key={t.label} style={{ alignItems: "center", gap: 6 }}>
            <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: tint(a), alignItems: "center", justifyContent: "center" }}>
              <Icon name={t.icon} size={28} color={a} />
            </View>
            <Text style={{ fontFamily: FONT.bodySemi, fontSize: 12, color: OC.ink500 }}>{t.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

/** Step 0 of any intro — the mascot welcome. */
export function WelcomeStep(): React.JSX.Element {
  return (
    <View style={{ alignItems: "center", paddingTop: 14 }}>
      <Image source={MASCOT} style={{ width: 300, height: 300, resizeMode: "contain" }} />
      <Display style={{ fontSize: 32, lineHeight: 34, textAlign: "center", marginTop: 6 }}>Hi, I&apos;m Otto.</Display>
      <Text style={{ marginTop: 12, maxWidth: 300, textAlign: "center", fontFamily: FONT.body, fontSize: 15.5, lineHeight: 24, color: OC.ink500 }}>
        I&apos;ll hold your day together — calendar, bills, meds and your routine — and tell you what actually matters. Calmly. No nagging.
      </Text>
    </View>
  );
}

/** The three "how Otto works" teaching cards (shown by example). */
export const TEACH: { title: string; body: string; art: ReactNode }[] = [
  {
    title: "Otto reads your whole day",
    body: "Calendar, bills, meds and your routine — Otto holds them in one place, so nothing slips through the cracks.",
    art: <SourceTiles />,
  },
  {
    title: "One calm brief — not a list",
    body: "Each morning, midday and evening, Otto tells you what actually matters in one warm message. No notification pile-up.",
    art: (
      <OttoVoice time="8:02 AM">
        A calm day ahead — payday&apos;s Friday, but Meralco (₱2,480) is due Saturday. Want a heads-up Thursday night?
      </OttoVoice>
    ),
  },
  {
    title: "Just tell Otto — you confirm",
    body: "Say it in plain words. Otto turns it into the right bill, reminder or plan — and never changes anything without your yes.",
    art: <ProposalCard icon="bell" tone="amber" title="Nudge me Thu 8 PM — pay Meralco" detail="₱2,480 · before payday clears Friday" />,
  },
];

export function TeachStep({ title, body, art }: { title: string; body: string; art: ReactNode }): React.JSX.Element {
  return (
    <View style={{ paddingTop: 8 }}>
      <View style={{ marginBottom: 24 }}>{art}</View>
      <Display style={{ fontSize: 27, lineHeight: 30, textAlign: "center" }}>{title}</Display>
      <Text style={{ marginTop: 10, alignSelf: "center", maxWidth: 330, textAlign: "center", fontFamily: FONT.body, fontSize: 15, lineHeight: 23, color: OC.ink500 }}>{body}</Text>
    </View>
  );
}
