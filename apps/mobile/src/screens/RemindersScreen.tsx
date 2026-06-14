// Reminders. List, add, mark done; "Remind me" schedules a local notification
// and degrades gracefully if permission is denied. Logic lives in useReminders.
import { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import type { Reminder } from "@otto/schemas";
import { useReminders } from "../hooks/useReminders";
import { useRepositoryDeps } from "../hooks/useRepositoryDeps";
import { AsyncBoundary, EmptyState, ScreenScroll } from "../components/AsyncBoundary";
import { Button, Card, LabeledInput } from "../components/ui";
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

export function RemindersScreen(): React.JSX.Element {
  const deps = useRepositoryDeps();
  const { state, error, reminders, addReminder, markDone, remindMe, reload } = useReminders(deps);
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
  };

  const handleRemindMe = async (reminder: Reminder): Promise<void> => {
    const result = await remindMe(reminder);
    Alert.alert("Remind me", describeScheduleResult(result));
  };

  const pending = reminders.filter((r) => r.status !== "done" && r.status !== "dismissed");
  const done = reminders.filter((r) => r.status === "done");

  return (
    <ScreenScroll>
      <Text className="mb-4 text-2xl font-bold text-slate-900">Reminders</Text>

      <AsyncBoundary state={state} error={error} onRetry={reload} loadingLabel="Loading reminders">
        <Card title="Add a reminder">
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
          {formError ? <Text className="mb-2 text-sm text-red-600">{formError}</Text> : null}
          <Button label="Add reminder" onPress={handleAdd} />
        </Card>

        <Text className="mb-2 text-base font-semibold text-slate-900">
          To do ({pending.length})
        </Text>
        {pending.length === 0 ? (
          <EmptyState title="Nothing pending" hint="Add a reminder above." />
        ) : (
          pending.map((reminder) => (
            <Card key={reminder.id}>
              <Text className="text-base font-medium text-slate-900">{reminder.title}</Text>
              {reminder.notes ? (
                <Text className="mt-0.5 text-sm text-slate-500">{reminder.notes}</Text>
              ) : null}
              <View className="mt-3 flex-row gap-2">
                <View className="flex-1">
                  <Button
                    label="Mark done"
                    variant="secondary"
                    onPress={() => void markDone(reminder)}
                  />
                </View>
                <View className="flex-1">
                  <Button label="Remind me" onPress={() => void handleRemindMe(reminder)} />
                </View>
              </View>
            </Card>
          ))
        )}

        {done.length > 0 ? (
          <>
            <Text className="mb-2 mt-2 text-base font-semibold text-slate-900">
              Done ({done.length})
            </Text>
            {done.map((reminder) => (
              <Pressable key={reminder.id} accessibilityLabel={`Done: ${reminder.title}`}>
                <Card>
                  <Text className="text-base text-slate-400 line-through">{reminder.title}</Text>
                </Card>
              </Pressable>
            ))}
          </>
        ) : null}
      </AsyncBoundary>
    </ScreenScroll>
  );
}
