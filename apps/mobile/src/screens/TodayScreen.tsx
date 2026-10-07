// Today — OTTO app design (otto/app-screens.jsx TodayScreen), ported to RN inline
// styles via the design kit. Greeting header, Otto's voice brief, confirmable
// proposals, the day as a timeline, Otto's deeper read (Pro insight / ProGate),
// and the Optimizer CTA. Data logic is unchanged (useToday); only the look is the
// inline-style design kit (reliable on SDK 54, unlike the prior NativeWind pass).
import { useCallback, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { ContextItem, Nudge, Proposal, ProposalAction } from "@otto/schemas";
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
import { greetingForHour, longDateLabel, nowIso, timeLabel } from "../lib/datetime";

/** Icon + accent tone for each context-item kind (matches the design timeline). */
const KIND_STYLE: Record<ContextItem["kind"], { icon: IconName; tone: string }> = {
  anchor: { icon: "sun", tone: "green" },
  medication: { icon: "pill", tone: "green" },
  bill: { icon: "bell", tone: "amber" },
  event: { icon: "cal", tone: "sky" },
  reminder: { icon: "bell", tone: "green" },
  insight: { icon: "sparkle", tone: "green" },
};

function money(m: { amountMinor: number; currency: string }): string {
  const v = (m.amountMinor / 100).toLocaleString("en-PH");
  return (m.currency === "PHP" ? "₱" : m.currency + " ") + v;
}

/** Map a write-back proposal to the design's ProposalCard props. */
function proposalDisplay(a: ProposalAction): { icon: IconName; tone: string; title: string; detail?: string } {
  switch (a.type) {
    case "add_bill":
      return { icon: "wallet", tone: "amber", title: `Add bill — ${a.bill.name} ${money(a.bill.amount)}`, detail: `Due ${a.bill.dueDate}` };
    case "add_medication":
      return { icon: "pill", tone: "green", title: `Add medication — ${a.medication.name}`, detail: a.medication.times.join(", ") };
    case "create_reminder":
      return { icon: "bell", tone: "green", title: a.reminder.title, detail: a.reminder.dueAt ? timeLabel(a.reminder.dueAt) || undefined : undefined };
    case "log_expense":
      return { icon: "wallet", tone: "amber", title: `Log expense — ${money(a.expense.amount)}`, detail: a.expense.description };
    case "block_time":
      return { icon: "cal", tone: "sky", title: a.block.title, detail: timeLabel(a.block.startAt) || undefined };
    case "add_routine_anchor":
      return { icon: "dumbbell", tone: "green", title: `Add routine — ${a.anchor.label}`, detail: a.anchor.time };
    case "create_event":
      return { icon: "cal", tone: "sky", title: a.event.title, detail: timeLabel(a.event.startAt) || undefined };
    case "add_note":
      return { icon: "sparkle", tone: "sky", title: `Save note — ${a.note.title ?? a.note.body.split("\n")[0] ?? ""}` };
  }
}

type Nav = { navigate: (s: "Optimizer" | "Upgrade" | "Settings") => void };

export function TodayScreen(): React.JSX.Element {
  const deps = useRepositoryDeps();
  const navigation = useNavigation() as unknown as Nav;
  const { isPro } = useAuth();
  const { state, error, briefing, items, nudges, proposals, briefingFromLlm, reload } = useToday(deps);

  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [applyingId, setApplyingId] = useState<string | undefined>();
  const visibleProposals = proposals.filter((p) => !dismissedIds.includes(p.id));

  const handleAccept = useCallback(
    async (proposal: Proposal) => {
      setApplyingId(proposal.id);
      try {
        const ctx: ApplyContext = { newId: newUuid, now: nowIso() };
        await applyProposal(proposal.action, deps, ctx);
        setDismissedIds((current) => [...current, proposal.id]);
        await reload();
      } catch {
        // keep card visible to retry
      } finally {
        setApplyingId(undefined);
      }
    },
    [deps, reload],
  );

  const handleDismiss = useCallback((id: string) => setDismissedIds((c) => [...c, id]), []);

  return (
    <Screen>
      <AppHeader
        title={greetingForHour(new Date().getHours())}
        sub={longDateLabel()}
        isPro={isPro}
        onUpgrade={() => navigation.navigate("Upgrade")}
        onSettings={() => navigation.navigate("Settings")}
      />

      <View style={{ paddingHorizontal: 18 }}>
        <AsyncBoundary state={state} error={error} onRetry={reload} loadingLabel="Building your day">
          <View style={{ marginTop: 10 }}>
            <OttoVoice time={timeLabel(nowIso()) || undefined}>
              {briefing?.summary ?? "Nothing to summarize yet."}
            </OttoVoice>
          </View>

          {visibleProposals.length > 0 ? (
            <View style={{ marginTop: 13, gap: 12 }}>
              {visibleProposals.map((p) => {
                const d = proposalDisplay(p.action);
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
                  {items.length} {items.length === 1 ? "item" : "items"} today
                </Text>
              }
            >
              Today&apos;s rhythm
            </SectionLabel>
            <Card pad={16}>
              {items.length === 0 ? (
                <View style={{ paddingVertical: 4 }}>
                  <Text style={{ fontFamily: FONT.bodyBold, fontSize: 14.5, color: OC.ink }}>An open day</Text>
                  <Text style={{ marginTop: 4, fontFamily: FONT.body, fontSize: 12.5, color: OC.ink500 }}>
                    Add anchors, reminders or bills and they&apos;ll show up here.
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
            <SectionLabel>Otto&apos;s deeper read</SectionLabel>
            {isPro ? (
              <Card>
                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 11 }}>
                  <View style={{ width: 38, height: 38, borderRadius: RADIUS.inner, backgroundColor: OC.green, alignItems: "center", justifyContent: "center" }}>
                    <Icon name="trend" size={20} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Display style={{ fontSize: 16 }}>
                      {briefingFromLlm ? "Otto read across your day" : "Spending is running a touch warm"}
                    </Display>
                    <Text style={{ marginTop: 4, fontFamily: FONT.body, fontSize: 13.5, lineHeight: 20, color: OC.ink700 }}>
                      Otto looks across your calendar, money and meds together — not just listing them — so the heads-ups land before things become a problem.
                    </Text>
                  </View>
                </View>
              </Card>
            ) : (
              <ProGate onUpgrade={() => navigation.navigate("Upgrade")}>
                <Display style={{ fontSize: 18, color: "#fff", lineHeight: 22 }}>See the week before it happens</Display>
                <Text style={{ fontSize: 13.5, color: OC.sage, marginTop: 6, lineHeight: 20, fontFamily: FONT.body }}>
                  Overspend forecasts, refill warnings and payday-vs-bill heads-ups — Otto thinking across all your data, not just listing it.
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
              <Display style={{ fontSize: 15.5 }}>Make room for something new</Display>
              <Text style={{ marginTop: 2, fontFamily: FONT.body, fontSize: 12.5, color: OC.ink500 }}>Let Otto reshape your day around it</Text>
            </View>
            <Icon name="chevR" size={20} color={OC.ink400} />
          </Pressable>
        </AsyncBoundary>
      </View>
    </Screen>
  );
}
