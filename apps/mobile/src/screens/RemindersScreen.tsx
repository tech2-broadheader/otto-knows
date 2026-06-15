// Reminders. List, add, mark done; "Remind me" schedules a local notification
// and degrades gracefully if permission is denied. Logic lives in useReminders.
//
// Visual: OTTO Reminders design — Today / Upcoming groups of CheckRows and a
// dashed "Add a reminder" button that reveals the add form inline. Marking a
// CheckRow done calls markDone; each pending reminder still offers "Remind me".
import { useMemo, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import type { Reminder } from "@otto/schemas";
import { useReminders } from "../hooks/useReminders";
import { useRepositoryDeps } from "../hooks/useRepositoryDeps";
import { AsyncBoundary, EmptyState } from "../components/AsyncBoundary";
import { Banner, Button, Card, Icon, LabeledInput, OC, Pill, SectionLabel } from "../components/ui";
import { CheckRow, ScreenContainer, ScreenHeader } from "../components/otto-ui";
import { timeLabel, todayDate } from "../lib/datetime";
import type { ScheduleResult } from "../notifications";

function describeScheduleResult(result: ScheduleResult): string {
  if (result.ok) return "You'll get a notification at the due time.";
  switch (result.reason) {
    case "permission-denied":
      return "Notifications are off. Enable them in your device settings to get reminded.";
    case "no-due-time":
      return "Add a due time to this reminder first.";
    case "in-past":
      return "That due time has already passed.";
    default:
      return "Could not schedule the reminder. Please try again.";
  }
}

/** A short, human "when" for a reminder (its due time today, else its notes). */
function reminderSub(reminder: Reminder): string | undefined {
  if (reminder.dueAt) {
    const time = timeLabel(reminder.dueAt);
    return time ? `Due ${time}` : reminder.notes;
  }
  return reminder.notes;
}

export function RemindersScreen(): React.JSX.Element {
  const deps = useRepositoryDeps();
  const { state, error, reminders, addReminder, markDone, remindMe, reload } = useReminders(deps);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | undefined>();

  const handleAdd = (): void => {
    if (title.trim().length === 0) {
      setFormError("Give the reminder a title.");
      return;
    }
    setFormError(undefined);
    void addReminder({ title: title.trim(), notes: notes.trim() });
    setTitle("");
    setNotes("");
    setShowForm(false);
  };

  const handleRemindMe = async (reminder: Reminder): Promise<void> => {
    const result = await remindMe(reminder);
    Alert.alert("Remind me", describeScheduleResult(result));
  };

  // Group the way the design does: things landing today vs everything else.
  const { today, upcoming, openCount } = useMemo(() => {
    const date = todayDate();
    const active = reminders.filter((r) => r.status !== "dismissed");
    const isToday = (r: Reminder): boolean =>
      r.status !== "done" && (!r.dueAt || r.dueAt.startsWith(date));
    return {
      today: active.filter(isToday),
      upcoming: active.filter((r) => !isToday(r)),
      openCount: reminders.filter((r) => r.status === "pending" || r.status === "snoozed").length,
    };
  }, [reminders]);

  const renderRow = (reminder: Reminder, isLast: boolean): React.JSX.Element => (
    <View key={reminder.id} className={isLast ? "" : "border-b border-line"}>
      <CheckRow
        checked={reminder.status === "done"}
        onToggle={() => void markDone(reminder)}
        icon="bell"
        tone="green"
        title={reminder.title}
        sub={reminderSub(reminder)}
        right={
          reminder.status !== "done" ? (
            <Pressable
              onPress={() => void handleRemindMe(reminder)}
              accessibilityRole="button"
              accessibilityLabel={`Remind me about ${reminder.title}`}
              hitSlop={8}
            >
              <Pill tone="mint">Remind me</Pill>
            </Pressable>
          ) : undefined
        }
      />
    </View>
  );

  return (
    <ScreenContainer>
      <ScreenHeader title="Reminders" sub={`${openCount} open`} />

      <AsyncBoundary state={state} error={error} onRetry={reload} loadingLabel="Loading reminders">
        <View className="mt-3.5">
          <SectionLabel>Today</SectionLabel>
          <Card pad="px-3.5 py-1">
            {today.length === 0 ? (
              <EmptyState title="Nothing for today" hint="Add a reminder below." />
            ) : (
              today.map((r, i) => renderRow(r, i === today.length - 1))
            )}
          </Card>
        </View>

        {upcoming.length > 0 ? (
          <View className="mt-5">
            <SectionLabel>Upcoming</SectionLabel>
            <Card pad="px-3.5 py-1">
              {upcoming.map((r, i) => renderRow(r, i === upcoming.length - 1))}
            </Card>
          </View>
        ) : null}

        {showForm ? (
          <View className="mt-4">
            <Card>
              {formError ? <Banner message={formError} tone="warning" /> : null}
              <LabeledInput
                label="Title"
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Pay rent"
              />
              <LabeledInput
                label="Notes (optional)"
                value={notes}
                onChangeText={setNotes}
                placeholder="Anything to remember"
                multiline
              />
              <Button label="Add reminder" onPress={handleAdd} />
            </Card>
          </View>
        ) : (
          <Pressable
            onPress={() => setShowForm(true)}
            accessibilityRole="button"
            accessibilityLabel="Add a reminder"
            className="mt-4 flex-row items-center justify-center gap-2 rounded-inner border-[1.5px] border-dashed border-line-strong bg-surface py-3.5"
          >
            <Icon name="plus" size={18} color={OC.green} />
            <Text className="font-body-extra text-[14.5px] text-green">Add a reminder</Text>
          </Pressable>
        )}
      </AsyncBoundary>
    </ScreenContainer>
  );
}
