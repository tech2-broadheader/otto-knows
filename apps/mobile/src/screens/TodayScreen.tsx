// Today (story 4.2 + 5.x). Composes the briefing (composeBriefing) and shows the
// unified day list (whatsOnToday); surfaces payday-vs-bill nudges gently.
//
// Pro layer (FR-B1/FR-L3): when entitled and the backend is configured, useToday
// swaps in the LLM-reasoned briefing and surfaces its write-back PROPOSALS as
// confirmable ProposalCards. Accepting one applies it locally (apply-proposal)
// and reloads the day; dismissing drops it. Free tier keeps the template brief
// and shows no proposals. Presentational — data logic lives in useToday.
import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import type { ContextItem, Nudge, Proposal } from "@otto/schemas";
import { useRepositoryDeps } from "../hooks/useRepositoryDeps";
import { useToday } from "../hooks/useToday";
import { AsyncBoundary, EmptyState, ScreenScroll } from "../components/AsyncBoundary";
import { Banner, Card } from "../components/ui";
import { ProposalCard } from "../components/ProposalCard";
import { applyProposal, type ApplyContext } from "../lib/apply-proposal";
import { newUuid } from "../lib/id";
import { timeLabel, nowIso } from "../lib/datetime";

const KIND_ICON: Record<ContextItem["kind"], string> = {
  anchor: "◆",
  medication: "✚",
  bill: "₱",
  event: "📅",
  reminder: "🔔",
  insight: "💡",
};

function DayItem({ item }: { item: ContextItem }): React.JSX.Element {
  const when = timeLabel(item.at);
  return (
    <View
      className="flex-row items-center border-b border-slate-100 py-2.5"
      accessibilityLabel={`${when} ${item.title}, ${item.kind}`}
    >
      <Text className="w-14 text-sm font-medium text-slate-400">{when || "—"}</Text>
      <Text className="mr-2 text-base">{KIND_ICON[item.kind]}</Text>
      <Text className="flex-1 text-base text-slate-900">{item.title}</Text>
    </View>
  );
}

export function TodayScreen(): React.JSX.Element {
  const deps = useRepositoryDeps();
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

  return (
    <ScreenScroll>
      <Text className="mb-4 text-2xl font-bold text-slate-900">Today</Text>

      <AsyncBoundary state={state} error={error} onRetry={reload} loadingLabel="Building your day">
        <Card title={briefingFromLlm ? "Your brief · Otto" : "Your brief"}>
          <Text className="text-base leading-6 text-slate-700">
            {briefing?.summary ?? "Nothing to summarize yet."}
          </Text>
        </Card>

        {nudges.map((nudge: Nudge) => (
          <Banner key={nudge.id} message={nudge.message} tone="warning" />
        ))}

        {visibleProposals.length > 0 ? (
          <View>
            <Text className="mb-2 text-sm font-medium text-slate-600">
              Otto suggests — accept the ones you want.
            </Text>
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

        <Card title="What's on">
          {items.length === 0 ? (
            <EmptyState
              title="An open day"
              hint="Add anchors, reminders or bills and they'll show up here."
            />
          ) : (
            items.map((item) => <DayItem key={item.id} item={item} />)
          )}
        </Card>
      </AsyncBoundary>
    </ScreenScroll>
  );
}
