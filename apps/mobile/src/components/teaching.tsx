// "How Otto works" teaching cards — shared by first-run onboarding and the
// replayable tour reachable from Settings. Each card teaches by example, showing
// a real design-kit component (the brief bubble, a proposal card). Presentational;
// the example amount is shown in the user's own currency (story 13.1).
import type { ReactNode } from "react";
import { View, Text, Image } from "react-native";
import { Display, OttoVoice, ProposalCard, MASCOT } from "../design/kit";
import { Icon, type IconName } from "../design/Icon";
import { OC, FONT, toneColor, tint } from "../design/theme";
import { t } from "../i18n";
import { currencyMinorUnits } from "@otto/schemas";
import { useMoney } from "../lib/settings-context";

/** The example bill in the tour: 2,480 in whatever currency the user has. */
function useExampleBill(): string {
  const money = useMoney();
  return money.format(2480 * 10 ** currencyMinorUnits(money.currency));
}

function ExampleBrief(): React.JSX.Element {
  const bill = useExampleBill();
  return <OttoVoice time="8:02">{t("onboarding.teach.exampleBrief", { bill })}</OttoVoice>;
}

function ExampleProposal(): React.JSX.Element {
  const bill = useExampleBill();
  return (
    <ProposalCard
      icon="bell"
      tone="amber"
      title={t("onboarding.teach.exampleProposal.title")}
      detail={t("onboarding.teach.exampleProposal.detail", { bill })}
    />
  );
}

/** The four data sources Otto unifies, as a tidy row of tiles. */
function SourceTiles(): React.JSX.Element {
  const tiles: { icon: IconName; tone: string; label: string }[] = [
    { icon: "cal", tone: "sky", label: t("onboarding.teach.sources.calendar") },
    { icon: "peso", tone: "green", label: t("onboarding.teach.sources.money") },
    { icon: "pill", tone: "coral", label: t("onboarding.teach.sources.meds") },
    { icon: "sun", tone: "amber", label: t("onboarding.teach.sources.routine") },
  ];
  return (
    <View style={{ flexDirection: "row", justifyContent: "center", gap: 14, flexWrap: "wrap" }}>
      {tiles.map((tile) => {
        const a = toneColor(tile.tone);
        return (
          <View key={tile.icon} style={{ alignItems: "center", gap: 6 }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 18,
                backgroundColor: tint(a),
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name={tile.icon} size={28} color={a} />
            </View>
            <Text style={{ fontFamily: FONT.bodySemi, fontSize: 12, color: OC.ink500 }}>
              {tile.label}
            </Text>
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
      <Display style={{ fontSize: 32, lineHeight: 34, textAlign: "center", marginTop: 6 }}>
        {t("onboarding.welcome.title")}
      </Display>
      <Text
        style={{
          marginTop: 12,
          maxWidth: 300,
          textAlign: "center",
          fontFamily: FONT.body,
          fontSize: 15.5,
          lineHeight: 24,
          color: OC.ink500,
        }}
      >
        {t("onboarding.welcome.body")}
      </Text>
    </View>
  );
}

/** The three "how Otto works" teaching cards (shown by example). */
export const TEACH: { title: string; body: string; art: ReactNode }[] = [
  {
    title: t("onboarding.teach.readsYourDay.title"),
    body: t("onboarding.teach.readsYourDay.body"),
    art: <SourceTiles />,
  },
  {
    title: t("onboarding.teach.oneBrief.title"),
    body: t("onboarding.teach.oneBrief.body"),
    art: <ExampleBrief />,
  },
  {
    title: t("onboarding.teach.youConfirm.title"),
    body: t("onboarding.teach.youConfirm.body"),
    art: <ExampleProposal />,
  },
];

export function TeachStep({
  title,
  body,
  art,
}: {
  title: string;
  body: string;
  art: ReactNode;
}): React.JSX.Element {
  return (
    <View style={{ paddingTop: 8 }}>
      <View style={{ marginBottom: 24 }}>{art}</View>
      <Display style={{ fontSize: 27, lineHeight: 30, textAlign: "center" }}>{title}</Display>
      <Text
        style={{
          marginTop: 10,
          alignSelf: "center",
          maxWidth: 330,
          textAlign: "center",
          fontFamily: FONT.body,
          fontSize: 15,
          lineHeight: 23,
          color: OC.ink500,
        }}
      >
        {body}
      </Text>
    </View>
  );
}
