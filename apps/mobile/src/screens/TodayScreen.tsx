// Today (story 4.2 + 5.x). Composes the briefing (composeBriefing) and shows the
// unified day list (whatsOnToday); surfaces payday-vs-bill nudges gently.
//
// Pro layer (FR-B1/FR-L3): when entitled and the backend is configured, useToday
// swaps in the LLM-reasoned briefing and surfaces its write-back PROPOSALS as
// confirmable ProposalCards. Accepting one applies it locally (apply-proposal)
// and reloads the day; dismissing drops it. Free tier keeps the template brief
// and shows no proposals. Presentational — data logic lives in useToday.
//
// Visual: OTTO Today design — greeting header, Otto's voice brief, the day as a
// timeline card, Otto's deeper read (Pro insight or ProGate), and a button into
// the Optimizer. Behaviour is unchanged; only the look is the design.
import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { ContextItem, Nudge, Proposal } from "@otto/schemas";
import { useRepositoryDeps } from "../hooks/useRepositoryDeps";
import { useToday } from "../hooks/useToday";
import { AsyncBoundary } from "../components/AsyncBoundary";
import { Card, Icon, OC, SectionLabel, type IconName, type OttoTone } from "../components/ui";
import {
  OttoVoice,
  ProGate,
  ScreenContainer,
  ScreenHeader,
  TimelineRow,
} from "../components/otto-ui";
import { ProposalCard } from "../components/ProposalCard";
import { applyProposal, type ApplyContext } from "../lib/apply-proposal";
import { IS_PRO } from "../lib/constants";
import { newUuid } from "../lib/id";
import { greetingForHour, longDateLabel, nowIso, timeLabel } from "../lib/datetime";

/** Icon + accent tone for each context-item kind (matches the design timeline). */
const KIND_STYLE: Record<ContextItem["kind"], { icon: IconName; tone: OttoTone }> = {
  anchor: { icon: "sun", tone: "green" },
  medication: { icon: "pill", tone: "green" },
  bill: { icon: "bell", tone: "amber" },
  event: { icon: "cal", tone: "sky" },
  reminder: { icon: "bell", tone: "green" },
  insight: { icon: "sparkle", tone: "green" },
};

/** Minimal nav shape — opening the root-stack Optimizer by name at runtime. */
type TodayNavigation = { navigate: (screen: "Optimizer") => void };

export function TodayScreen(): React.JSX.Element {
  const deps = useRepositoryDeps();
  const navigation = useNavigation();
  const { state, error, briefing, items, nudges, proposals, briefingFromLlm, reload } =
    useToday(deps);

  // Locally tracked dismissals + the proposal currently being applied. The
  // proposal list itself comes from useToday and is refreshed on reload().
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
        // Keep the card visible so the user can retry; the day still renders.
      } finally {
        setApplyingId(undefined);
      }
    },
    [deps, reload],
  );

  const handleDismiss = useCallback((proposal: Proposal) => {
    setDismissedIds((current) => [...current, proposal.id]);
  }, []);

  const openOptimizer = (): void => {
    (navigation as unknown as TodayNavigation).navigate("Optimizer");
  };

  return (
    <ScreenContainer>
      <ScreenHeader title={greetingForHour(new Date().getHours())} sub={longDateLabel()} />

      <AsyncBoundary state={state} error={error} onRetry={reload} loadingLabel="Building your day">
        <View className="mt-2.5">
          <OttoVoice title="Otto" time={timeLabel(nowIso()) || undefined}>
            {briefing?.summary ?? "Nothing to summarize yet."}
          </OttoVoice>
        </View>

        {visibleProposals.length > 0 ? (
          <View className="mt-3 gap-3">
            {visibleProposals.map((proposal) => (
              <ProposalCard
                key={proposal.id}
                proposal={proposal}
                onAccept={(p) => void handleAccept(p)}
                onDismiss={handleDismiss}
                busy={applyingId === proposal.id}
              />
            ))}
          </View>
        ) : null}

        <View className="mt-6">
          <SectionLabel
            right={
              <Text className="font-body-semibold text-[11.5px] text-ink-400">
                {items.length} {items.length === 1 ? "item" : "items"} today
              </Text>
            }
          >
            Today&apos;s rhythm
          </SectionLabel>
          <Card pad="px-4 py-3.5">
            {items.length === 0 ? (
              <View className="py-4">
                <Text className="font-body-bold text-[14.5px] text-ink">An open day</Text>
                <Text className="mt-1 font-body text-[12.5px] text-ink-500">
                  Add anchors, reminders or bills and they&apos;ll show up here.
                </Text>
              </View>
            ) : (
              items.map((item, index) => {
                const style = KIND_STYLE[item.kind];
                const done = item.meta?.done === true;
                return (
                  <TimelineRow
                    key={item.id}
                    time={timeLabel(item.at) || "—"}
                    icon={style.icon}
                    tone={style.tone}
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
          <View
            key={nudge.id}
            className="mt-3.5 flex-row items-start gap-3 rounded-inner bg-amber-bg px-4 py-3"
          >
            <View className="mt-0.5">
              <Icon name="trend" size={20} color={OC.amber} />
            </View>
            <Text className="flex-1 font-body-semibold text-[13px] leading-[19px] text-amber-ink">
              {nudge.message}
            </Text>
          </View>
        ))}

        <View className="mt-6">
          <SectionLabel>Otto&apos;s deeper read</SectionLabel>
          {IS_PRO ? (
            <Card>
              <View className="flex-row items-start gap-3">
                <View className="h-[38px] w-[38px] items-center justify-center rounded-inner bg-green">
                  <Icon name="trend" size={20} color="#fff" />
                </View>
                <View className="flex-1">
                  <Text className="font-display text-[16px] text-ink">
                    {briefingFromLlm
                      ? "Otto read across your day"
                      : "Spending is running a touch warm"}
                  </Text>
                  <Text className="mt-1 font-body text-[13.5px] leading-5 text-ink-700">
                    Otto looks across your calendar, money and meds together — not just listing them
                    — so the heads-ups land before things become a problem.
                  </Text>
                </View>
              </View>
            </Card>
          ) : (
            <ProGate
              title="See the week before it happens"
              body="Overspend forecasts, refill warnings and payday-vs-bill heads-ups — Otto thinking across all your data, not just listing it."
              onUpgrade={() =>
                (navigation as unknown as { navigate: (s: "Upgrade") => void }).navigate("Upgrade")
              }
            />
          )}
        </View>

        <Pressable
          onPress={openOptimizer}
          accessibilityRole="button"
          accessibilityLabel="Make room for something new"
          className="mt-6 flex-row items-center gap-3 rounded-card border border-line bg-surface px-4 py-[15px]"
        >
          <View className="h-10 w-10 items-center justify-center rounded-inner bg-mist">
            <Icon name="dumbbell" size={20} color={OC.green} />
          </View>
          <View className="flex-1">
            <Text className="font-display text-[15.5px] text-ink">Make room for something new</Text>
            <Text className="mt-0.5 font-body text-[12.5px] text-ink-500">
              Let Otto reshape your day around it
            </Text>
          </View>
          <Icon name="chevR" size={20} color={OC.ink400} />
        </Pressable>
      </AsyncBoundary>
    </ScreenContainer>
  );
}
