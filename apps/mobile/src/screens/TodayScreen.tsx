// Today — OTTO app design (otto/app-screens.jsx TodayScreen), ported to RN inline
// styles via the design kit. Greeting header, Otto's voice brief, confirmable
// proposals, the day as a timeline, Otto's deeper read (Pro insight / ProGate),
// and the Optimizer CTA. Data logic is unchanged (useToday); only the look is the
// inline-style design kit (reliable on SDK 54, unlike the prior NativeWind pass).
import { useCallback, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { ContextItem, Money, Nudge, Proposal, ProposalAction } from "@otto/schemas";
import { formatMoney } from "@otto/core";
import { useRepositoryDeps } from "../hooks/useRepositoryDeps";
import { useToday } from "../hooks/useToday";
import { AsyncBoundary } from "../components/AsyncBoundary";
import {
  Screen,
  AppHeader,
  OttoVoice,
  ProposalCard,
  Card,
  SectionLabel,
  TLRow,
  ProGate,
  Display,
} from "../design/kit";
import { Icon, type IconName } from "../design/Icon";
import { OC, FONT, RADIUS } from "../design/theme";
import { applyProposal, type ApplyContext } from "../lib/apply-proposal";
import { useAuth } from "../auth/AuthProvider";
import { newUuid } from "../lib/id";
import { useSettings } from "../lib/settings-context";
import { greetingForHour, longDateLabel, nowIso, timeLabel } from "../lib/datetime";
import { t } from "../i18n";

/** Icon + accent tone for each context-item kind (matches the design timeline). */
const KIND_STYLE: Record<ContextItem["kind"], { icon: IconName; tone: string }> = {
  anchor: { icon: "sun", tone: "green" },
  medication: { icon: "pill", tone: "green" },
  bill: { icon: "bell", tone: "amber" },
  event: { icon: "cal", tone: "sky" },
  reminder: { icon: "bell", tone: "green" },
  insight: { icon: "sparkle", tone: "green" },
};

/** Map a write-back proposal to the design's ProposalCard props. */
function proposalDisplay(
  a: ProposalAction,
  locale: string,
): { icon: IconName; tone: string; title: string; detail?: string } {
  const money = (m: Money): string => formatMoney(m, locale);
  switch (a.type) {
    case "add_bill":
      return { icon: "wallet", tone: "amber", title: t("assistant.today.proposal.addBill", { name: a.bill.name, amount: money(a.bill.amount) }), detail: t("assistant.today.proposal.due", { date: a.bill.dueDate }) };
    case "add_medication":
      return { icon: "pill", tone: "green", title: t("assistant.today.proposal.addMedication", { name: a.medication.name }), detail: a.medication.times.join(", ") };
    case "create_reminder":
      return { icon: "bell", tone: "green", title: a.reminder.title, detail: a.reminder.dueAt ? timeLabel(a.reminder.dueAt) || undefined : undefined };
    case "log_expense":
      return { icon: "wallet", tone: "amber", title: t("assistant.today.proposal.logExpense", { amount: money(a.expense.amount) }), detail: a.expense.description };
    case "block_time":
      return { icon: "cal", tone: "sky", title: a.block.title, detail: timeLabel(a.block.startAt) || undefined };
    case "add_routine_anchor":
      return { icon: "dumbbell", tone: "green", title: t("assistant.today.proposal.addRoutine", { label: a.anchor.label }), detail: a.anchor.time };
    case "create_event":
      return { icon: "cal", tone: "sky", title: a.event.title, detail: timeLabel(a.event.startAt) || undefined };
    case "add_note":
      return { icon: "note", tone: "sky", title: t("assistant.today.proposal.saveNote", { title: a.note.title ?? a.note.body.split("\n")[0] ?? "" }) };
  }
}

type Nav = { navigate: (s: "Optimizer" | "Upgrade" | "Settings") => void };

export function TodayScreen(): React.JSX.Element {
  const deps = useRepositoryDeps();
  const navigation = useNavigation() as unknown as Nav;
  const { isPro } = useAuth();
  const { currency, locale } = useSettings();
  const { state, error, briefing, items, nudges, proposals, briefingFromLlm, reload } = useToday(deps);

  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [applyingId, setApplyingId] = useState<string | undefined>();
  const visibleProposals = proposals.filter((p) => !dismissedIds.includes(p.id));

  const handleAccept = useCallback(
    async (proposal: Proposal) => {
      setApplyingId(proposal.id);
      try {
        const ctx: ApplyContext = { newId: newUuid, now: nowIso(), currency };
        await applyProposal(proposal.action, deps, ctx);
        setDismissedIds((current) => [...current, proposal.id]);
        await reload();
      } catch {
        // keep card visible to retry
      } finally {
        setApplyingId(undefined);
      }
    },
    [deps, reload, currency],
  );

  const handleDismiss = useCallback((id: string) => setDismissedIds((c) => [...c, id]), []);

  return (
    <Screen>
      <AppHeader
        title={greetingForHour(new Date().getHours())}
        sub={longDateLabel(new Date(), locale)}
        isPro={isPro}
        onUpgrade={() => navigation.navigate("Upgrade")}
        onSettings={() => navigation.navigate("Settings")}
      />

      <View style={{ paddingHorizontal: 18 }}>
        <AsyncBoundary state={state} error={error} onRetry={reload} loadingLabel={t("assistant.today.loading")}>
          <View style={{ marginTop: 10 }}>
            <OttoVoice time={timeLabel(nowIso()) || undefined}>
              {briefing?.summary ?? t("assistant.today.emptySummary")}
            </OttoVoice>
          </View>

          {visibleProposals.length > 0 ? (
            <View style={{ marginTop: 13, gap: 12 }}>
              {visibleProposals.map((p) => {
                const d = proposalDisplay(p.action, locale);
                return (
                  <ProposalCard
                    key={p.id}
                    icon={d.icon}
                    tone={d.tone}
                    title={d.title}
                    detail={d.detail}
                    onAccept={applyingId ? undefined : () => void handleAccept(p)}
                    onDismiss={() => handleDismiss(p.id)}
                  />
                );
              })}
            </View>
          ) : null}

          <View style={{ marginTop: 26 }}>
            <SectionLabel
              right={
                <Text style={{ fontFamily: FONT.bodySemi, fontSize: 11.5, color: OC.ink400 }}>
                  {t("assistant.today.itemCount", { count: items.length })}
                </Text>
              }
            >
              {t("assistant.today.rhythm")}
            </SectionLabel>
            <Card pad={16}>
              {items.length === 0 ? (
                <View style={{ paddingVertical: 4 }}>
                  <Text style={{ fontFamily: FONT.bodyBold, fontSize: 14.5, color: OC.ink }}>{t("assistant.today.openDay.title")}</Text>
                  <Text style={{ marginTop: 4, fontFamily: FONT.body, fontSize: 12.5, color: OC.ink500 }}>
                    {t("assistant.today.openDay.body")}
                  </Text>
                </View>
              ) : (
                items.map((item, index) => {
                  const s = KIND_STYLE[item.kind];
                  const done = item.meta?.done === true;
                  return (
                    <TLRow
                      key={item.id}
                      time={timeLabel(item.at) || "—"}
                      icon={s.icon}
                      tone={s.tone}
                      title={item.title}
                      done={done}
                      faded={item.kind === "bill" && !done}
                      last={index === items.length - 1}
                    />
                  );
                })
              )}
            </Card>
          </View>

          {nudges.map((nudge: Nudge) => (
            <View key={nudge.id} style={{ marginTop: 14, flexDirection: "row", alignItems: "flex-start", gap: 11, borderRadius: RADIUS.inner, backgroundColor: OC.amberBg, paddingHorizontal: 15, paddingVertical: 13 }}>
              <View style={{ marginTop: 1 }}>
                <Icon name="trend" size={20} color={OC.amber} />
              </View>
              <Text style={{ flex: 1, fontFamily: FONT.bodySemi, fontSize: 13, lineHeight: 19, color: OC.amberInk }}>{nudge.message}</Text>
            </View>
          ))}

          <View style={{ marginTop: 22 }}>
            <SectionLabel>{t("assistant.today.deeperRead.label")}</SectionLabel>
            {isPro ? (
              <Card>
                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 11 }}>
                  <View style={{ width: 38, height: 38, borderRadius: RADIUS.inner, backgroundColor: OC.green, alignItems: "center", justifyContent: "center" }}>
                    <Icon name="trend" size={20} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Display style={{ fontSize: 16 }}>
                      {briefingFromLlm ? t("assistant.today.deeperRead.llmTitle") : t("assistant.today.deeperRead.title")}
                    </Display>
                    <Text style={{ marginTop: 4, fontFamily: FONT.body, fontSize: 13.5, lineHeight: 20, color: OC.ink700 }}>
                      {t("assistant.today.deeperRead.body")}
                    </Text>
                  </View>
                </View>
              </Card>
            ) : (
              <ProGate onUpgrade={() => navigation.navigate("Upgrade")}>
                <Display style={{ fontSize: 18, color: "#fff", lineHeight: 22 }}>{t("assistant.today.proGate.title")}</Display>
                <Text style={{ fontSize: 13.5, color: OC.sage, marginTop: 6, lineHeight: 20, fontFamily: FONT.body }}>
                  {t("assistant.today.proGate.body")}
                </Text>
              </ProGate>
            )}
          </View>

          <Pressable
            onPress={() => navigation.navigate("Optimizer")}
            style={({ pressed }) => [
              { marginTop: 22, flexDirection: "row", alignItems: "center", gap: 13, borderRadius: RADIUS.card, borderWidth: 1, borderColor: OC.line, backgroundColor: OC.surface, paddingHorizontal: 16, paddingVertical: 15, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <View style={{ width: 40, height: 40, borderRadius: RADIUS.inner, backgroundColor: OC.mist, alignItems: "center", justifyContent: "center" }}>
              <Icon name="dumbbell" size={20} color={OC.green} />
            </View>
            <View style={{ flex: 1 }}>
              <Display style={{ fontSize: 15.5 }}>{t("assistant.today.optimizerCta.title")}</Display>
              <Text style={{ marginTop: 2, fontFamily: FONT.body, fontSize: 12.5, color: OC.ink500 }}>{t("assistant.today.optimizerCta.sub")}</Text>
            </View>
            <Icon name="chevR" size={20} color={OC.ink400} />
          </Pressable>
        </AsyncBoundary>
      </View>
    </Screen>
  );
}
