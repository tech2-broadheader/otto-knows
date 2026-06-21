// Reminders. List, add, mark done; "Remind me" schedules a local notification
// and degrades gracefully if permission is denied. Logic lives in useReminders.
//
// Visual: OTTO Reminders design (otto/app-screens.jsx RemindersScreen + app-extra
// EmptyState), ported to RN inline styles via the design kit. Today / Upcoming
// groups of CheckRows, an EmptyState when caught up, and a dashed "Add a reminder"
// button that reveals the add form inline. Marking a CheckRow done calls markDone;
// each pending reminder still offers "Remind me". Data logic is unchanged.
import { useMemo, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import type { Reminder } from "@otto/schemas";
import { useReminders } from "../hooks/useReminders";
import { useRepositoryDeps } from "../hooks/useRepositoryDeps";
import { useAuth } from "../auth/AuthProvider";
import { useUpgradeNavigation } from "../hooks/useUpgradeNavigation";
import { useSettingsNavigation } from "../hooks/useSettingsNavigation";
import { AsyncBoundary } from "../components/AsyncBoundary";
import {
  Screen,
  AppHeader,
  Card,
  SectionLabel,
  CheckRow,
  Pill,
  EmptyState,
  AddButton,
  Field,
  TextField,
  SaveBar,
} from "../design/kit";
import { OC, FONT } from "../design/theme";
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
  const { isPro } = useAuth();
  const goToUpgrade = useUpgradeNavigation();
  const goToSettings = useSettingsNavigation();
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
    <View
      key={reminder.id}
      style={isLast ? undefined : { borderBottomWidth: 1, borderBottomColor: OC.line }}
    >
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
    <Screen>
      <AppHeader title="Reminders" sub={`${openCount} open`} isPro={isPro} onUpgrade={goToUpgrade} onSettings={goToSettings} />

      <View style={{ paddingHorizontal: 18 }}>
        <AsyncBoundary state={state} error={error} onRetry={reload} loadingLabel="Loading reminders">
          {today.length === 0 && upcoming.length === 0 && !showForm ? (
            <EmptyState
              icon="check"
              title="You're all caught up"
              body="Nothing on your list right now. Add a reminder below and it'll land at the right moment."
              action="Add a reminder"
              onAction={() => setShowForm(true)}
            />
          ) : (
            <>
              <View style={{ marginTop: 14 }}>
                <SectionLabel>Today</SectionLabel>
                <Card pad={0} style={{ paddingHorizontal: 14 }}>
                  {today.length === 0 ? (
                    <View style={{ paddingVertical: 14 }}>
                      <Text style={{ fontFamily: FONT.bodyBold, fontSize: 14.5, color: OC.ink }}>
                        Nothing for today
                      </Text>
                      <Text
                        style={{ marginTop: 4, fontFamily: FONT.body, fontSize: 12.5, color: OC.ink500 }}
                      >
                        Add a reminder below.
                      </Text>
                    </View>
                  ) : (
                    today.map((r, i) => renderRow(r, i === today.length - 1))
                  )}
                </Card>
              </View>

              {upcoming.length > 0 ? (
                <View style={{ marginTop: 20 }}>
                  <SectionLabel>Upcoming</SectionLabel>
                  <Card pad={0} style={{ paddingHorizontal: 14 }}>
                    {upcoming.map((r, i) => renderRow(r, i === upcoming.length - 1))}
                  </Card>
                </View>
              ) : null}
            </>
          )}

          {showForm ? (
            <View style={{ marginTop: 16 }}>
              <Card>
                {formError ? (
                  <View
                    style={{
                      marginBottom: 14,
                      backgroundColor: OC.amberBg,
                      borderRadius: 12,
                      paddingHorizontal: 13,
                      paddingVertical: 11,
                    }}
                  >
                    <Text style={{ fontFamily: FONT.bodySemi, fontSize: 13, color: OC.amberInk }}>
                      {formError}
                    </Text>
                  </View>
                ) : null}
                <Field label="Title">
                  <TextField
                    value={title}
                    onChangeText={setTitle}
                    placeholder="e.g. Pay rent"
                  />
                </Field>
                <Field label="Notes" hint="optional">
                  <TextField
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Anything to remember"
                    multiline
                  />
                </Field>
                <SaveBar
                  label="Add reminder"
                  onCancel={() => {
                    setShowForm(false);
                    setFormError(undefined);
                  }}
                  onSave={handleAdd}
                />
              </Card>
            </View>
          ) : (
            <AddButton label="Add a reminder" onPress={() => setShowForm(true)} />
          )}
        </AsyncBoundary>
      </View>
    </Screen>
  );
}
