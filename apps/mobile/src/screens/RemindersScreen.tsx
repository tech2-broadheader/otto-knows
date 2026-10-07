// Reminders. List, add, mark done; "Remind me" schedules a local notification
// and degrades gracefully if permission is denied. Logic lives in useReminders.
//
// Visual: OTTO Reminders design (otto/app-screens.jsx RemindersScreen + app-extra
// EmptyState), ported to RN inline styles via the design kit. Today / Upcoming
// groups of CheckRows, an EmptyState when caught up, and a dashed "Add a reminder"
// button that reveals the add form inline. Marking a CheckRow done calls markDone;
// each pending reminder still offers "Remind me". Data logic is unchanged.
//
// Approved design (2026-10-08): the tab also holds Notes (story 12.1) and
// Appointments (story 12.4) behind a Reminders / Notes / Appointments switch,
// and Alarms (story 12.3) as a fourth segment ("Appointments" shortened to "Appts").
import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { Reminder } from "@otto/schemas";
import { useNotes } from "../hooks/useNotes";
import { useAppointments } from "../hooks/useAppointments";
import { useAlarms } from "../hooks/useAlarms";
import { AlarmsSection } from "../components/AlarmsSection";
import { IconTile } from "../components/money-ui";
import { Icon } from "../design/Icon";
import { useMoney } from "../lib/settings-context";
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
  Segmented,
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
  const navigation = useNavigation() as unknown as {
    navigate: (s: string, p?: Record<string, string>) => void;
  };
  const noteList = useNotes();
  const appointments = useAppointments(deps);
  const money = useMoney();
  const alarms = useAlarms();
  const [view, setView] = useState<"reminders" | "notes" | "alarms" | "appointments">(
    "reminders",
  );
  const reloadNotes = noteList.reload;
  const reloadAppointments = appointments.reload;
  const reloadAlarms = alarms.reload;
  // The note and appointment editors are pushed on top; refresh when coming back.
  useFocusEffect(
    useCallback(() => {
      void reload();
      void reloadNotes();
      void reloadAppointments();
      void reloadAlarms();
    }, [reload, reloadNotes, reloadAppointments, reloadAlarms]),
  );
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
      <AppHeader
        title="Reminders"
        sub={
          view === "notes"
            ? `${noteList.notes.length} note${noteList.notes.length === 1 ? "" : "s"}`
            : view === "appointments"
              ? `${appointments.upcoming.length} upcoming`
              : view === "alarms"
                ? `${alarms.alarms.filter((a) => a.enabled).length} on`
                : `${openCount} open`
        }
        isPro={isPro}
        onUpgrade={goToUpgrade}
        onSettings={goToSettings}
      />

      <View style={{ paddingHorizontal: 18, marginTop: 10 }}>
        <Segmented
          options={[
            { k: "reminders", l: "Reminders" },
            { k: "notes", l: "Notes" },
            { k: "alarms", l: "Alarms" },
            { k: "appointments", l: "Appts" },
          ]}
          value={view}
          onChange={(k) => setView(k as typeof view)}
        />
      </View>

      {view === "notes" ? (
        <View style={{ paddingHorizontal: 18, marginTop: 14 }}>
          <AsyncBoundary
            state={noteList.state}
            error={noteList.error}
            onRetry={noteList.reload}
            loadingLabel="Loading notes"
          >
            <View style={{ marginBottom: 14 }}>
              <TextField value={noteList.query} onChangeText={noteList.setQuery} placeholder="Search notes" />
            </View>
            {noteList.visible.length === 0 ? (
              <EmptyState
                icon="note"
                tone="sky"
                title={noteList.query ? "No matching notes" : "No notes yet"}
                body={
                  noteList.query
                    ? "Try another word."
                    : "Jot down anything — gift ideas, a Wi-Fi password, a grocery list."
                }
                action="New note"
                onAction={() => navigation.navigate("NoteEditor")}
              />
            ) : (
              noteList.visible.map((note) => (
                <Pressable
                  key={note.id}
                  onPress={() => navigation.navigate("NoteEditor", { noteId: note.id })}
                  accessibilityRole="button"
                  accessibilityLabel={`${note.pinned ? "Pinned. " : ""}${note.title ?? note.body.split("\n")[0]}`}
                  style={({ pressed }) => [
                    {
                      backgroundColor: OC.surface,
                      borderWidth: 1,
                      borderColor: OC.line,
                      borderRadius: 18,
                      padding: 14,
                      marginBottom: 10,
                      opacity: pressed ? 0.75 : 1,
                    },
                  ]}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    {note.pinned ? (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                          backgroundColor: OC.mist,
                          borderRadius: 999,
                          paddingHorizontal: 9,
                          paddingVertical: 3,
                        }}
                      >
                        <Icon name="pin" size={11} color={OC.forest} stroke={2.4} />
                        <Text style={{ fontFamily: FONT.bodyX, fontSize: 11, color: OC.forest }}>
                          Pinned
                        </Text>
                      </View>
                    ) : null}
                    <Text
                      style={{ flex: 1, fontFamily: FONT.bodyBold, fontSize: 14.5, color: OC.ink }}
                      numberOfLines={1}
                    >
                      {note.title ?? note.body.split("\n")[0]}
                    </Text>
                    <Text style={{ fontFamily: FONT.bodySemi, fontSize: 11.5, color: OC.ink400 }}>
                      {money.shortDate(note.updatedAt.slice(0, 10))}
                    </Text>
                  </View>
                  <Text
                    style={{
                      marginTop: 4,
                      fontFamily: FONT.body,
                      fontSize: 13.5,
                      lineHeight: 20,
                      color: OC.ink500,
                    }}
                    numberOfLines={2}
                  >
                    {note.body}
                  </Text>
                </Pressable>
              ))
            )}
            <AddButton label="New note" onPress={() => navigation.navigate("NoteEditor")} />
          </AsyncBoundary>
        </View>
      ) : null}

      {view === "alarms" ? (
        <View style={{ paddingHorizontal: 18, marginTop: 14 }}>
          <AlarmsSection
            alarms={alarms}
            onOpen={(alarmId) =>
              navigation.navigate("AlarmForm", alarmId ? { alarmId } : undefined)
            }
          />
        </View>
      ) : null}

      {view === "appointments" ? (
        <View style={{ paddingHorizontal: 18, marginTop: 14 }}>
          <AsyncBoundary
            state={appointments.state}
            error={appointments.error}
            onRetry={appointments.reload}
            loadingLabel="Loading appointments"
          >
            {appointments.upcoming.length === 0 ? (
              <EmptyState
                icon="cal"
                tone="sky"
                title="Nothing booked"
                body="Add an appointment and it shows on your day, with a heads-up before it if you want one."
                action="New appointment"
                onAction={() => navigation.navigate("AppointmentForm")}
              />
            ) : (
              <Card pad={16} style={{ paddingTop: 4, paddingBottom: 4 }}>
                {appointments.upcoming.map((appt, index) => (
                  <View
                    key={appt.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      paddingVertical: 12,
                      borderBottomWidth: index < appointments.upcoming.length - 1 ? 1 : 0,
                      borderBottomColor: OC.line,
                    }}
                  >
                    <IconTile icon="cal" color={OC.sky} size={36} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: FONT.bodyBold, fontSize: 14.5, color: OC.ink }}>
                        {appt.title}
                      </Text>
                      <Text style={{ fontFamily: FONT.body, fontSize: 12, color: OC.ink500 }}>
                        {[
                          `${money.shortDate(appt.startAt.slice(0, 10))} · ${timeLabel(appt.startAt)}–${timeLabel(appt.endAt)}`,
                          appt.location,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() =>
                        Alert.alert("Delete this appointment?", appt.title, [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "Delete",
                            style: "destructive",
                            onPress: () => void appointments.remove(appt.id),
                          },
                        ])
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ${appt.title}`}
                      hitSlop={8}
                    >
                      <Icon name="trash" size={17} color={OC.ink400} />
                    </Pressable>
                  </View>
                ))}
              </Card>
            )}
            <AddButton
              label="New appointment"
              onPress={() => navigation.navigate("AppointmentForm")}
            />
          </AsyncBoundary>
        </View>
      ) : null}

      {view === "reminders" ? (
        <View style={{ paddingHorizontal: 18 }}>
          <AsyncBoundary
            state={state}
            error={error}
            onRetry={reload}
            loadingLabel="Loading reminders"
          >
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
                          style={{
                            marginTop: 4,
                            fontFamily: FONT.body,
                            fontSize: 12.5,
                            color: OC.ink500,
                          }}
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
                    <TextField value={title} onChangeText={setTitle} placeholder="e.g. Pay rent" />
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
      ) : null}
    </Screen>
  );
}
