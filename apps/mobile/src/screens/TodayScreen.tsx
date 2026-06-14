// Today (story 4.2). Composes the briefing (composeBriefing) and shows the
// unified day list (whatsOnToday); surfaces payday-vs-bill nudges gently.
// Presentational; all logic lives in useToday.
import { Text, View } from "react-native";
import type { ContextItem, Nudge } from "@otto/schemas";
import { useRepositoryDeps } from "../hooks/useRepositoryDeps";
import { useToday } from "../hooks/useToday";
import { AsyncBoundary, EmptyState, ScreenScroll } from "../components/AsyncBoundary";
import { Banner, Card } from "../components/ui";
import { timeLabel } from "../lib/datetime";

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
  const { state, error, briefing, items, nudges, reload } = useToday(deps);

  return (
    <ScreenScroll>
      <Text className="mb-4 text-2xl font-bold text-slate-900">Today</Text>

      <AsyncBoundary state={state} error={error} onRetry={reload} loadingLabel="Building your day">
        <Card title="Your brief">
          <Text className="text-base leading-6 text-slate-700">
            {briefing?.summary ?? "Nothing to summarize yet."}
          </Text>
        </Card>

        {nudges.map((nudge: Nudge) => (
          <Banner key={nudge.id} message={nudge.message} tone="warning" />
        ))}

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
