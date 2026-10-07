// New appointment (story 12.4) — approved design "New appointment": what,
// date, start time, length, where, "remind me", and where to save it. Only
// Otto (this phone) is enabled until the phone-calendar and Google
// destinations are approved; they are shown, disabled, with why.
import { useState } from "react";
import { Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useRepositoryDeps } from "../hooks/useRepositoryDeps";
import { useAppointments } from "../hooks/useAppointments";
import { FormError } from "../components/money-ui";
import { Card, ChoicePills, Field, OverlayScreen, SaveBar, TextField } from "../design/kit";
import { FONT, OC } from "../design/theme";
import { localUtcOffset, todayDate } from "../lib/datetime";
import { dateForChoice, validateAppointmentForm } from "../lib/forms";
import { addMinutesToIso } from "@otto/core";

const DURATIONS = [
  { k: "15", l: "15 min" },
  { k: "30", l: "30 min" },
  { k: "60", l: "1 hour" },
  { k: "120", l: "2 hours" },
];
const REMINDERS = [
  { k: "none", l: "No" },
  { k: "15", l: "15 min before" },
  { k: "60", l: "1 hour before" },
  { k: "1440", l: "1 day before" },
];
const DESTINATIONS = [
  { title: "Otto", sub: "On this phone, private", enabled: true },
  { title: "Phone calendar", sub: "Coming soon — needs calendar access", enabled: false },
  { title: "Google Calendar", sub: "Coming soon — connect Google in Settings", enabled: false },
];

export function AppointmentFormScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const deps = useRepositoryDeps();
  const appointments = useAppointments(deps);
  const today = todayDate();

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("09:00");
  const [duration, setDuration] = useState("60");
  const [location, setLocation] = useState("");
  const [remind, setRemind] = useState("60");
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const dateOptions = [
    { k: dateForChoice("today", today), l: "Today" },
    { k: dateForChoice("tomorrow", today), l: "Tomorrow" },
  ];
  const endsAt = /^\d{2}:\d{2}$/.test(time)
    ? addMinutesToIso(`${date}T${time}:00+00:00`, Number(duration)).slice(11, 16)
    : undefined;

  const save = async (): Promise<void> => {
    const result = validateAppointmentForm(
      {
        title,
        date,
        time,
        durationMinutes: Number(duration),
        location,
        remindMinutesBefore: remind === "none" ? undefined : Number(remind),
      },
      localUtcOffset(),
    );
    if (!result.ok) return setError(result.error);
    setError(undefined);
    setSaving(true);
    try {
      await appointments.create(result.value);
      navigation.goBack();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn't save the appointment.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <OverlayScreen
      title="New appointment"
      onBack={() => navigation.goBack()}
      footer={
        <SaveBar
          label={saving ? "Saving…" : "Save appointment"}
          disabled={saving}
          onCancel={() => navigation.goBack()}
          onSave={() => void save()}
        />
      }
    >
      <FormError message={error} />
      <Field label="What">
        <TextField value={title} onChangeText={setTitle} placeholder="e.g. Dentist" />
      </Field>
      <Field label="Date">
        <ChoicePills options={dateOptions} value={date} onChange={setDate} />
        <View style={{ marginTop: 8 }}>
          <TextField value={date} onChangeText={setDate} placeholder="2026-10-13" />
        </View>
      </Field>
      <Field label="Starts" hint="24-hour, e.g. 15:00">
        <TextField value={time} onChangeText={setTime} placeholder="15:00" />
      </Field>
      <Field label="How long" hint={endsAt ? `Ends ${endsAt}` : undefined}>
        <ChoicePills options={DURATIONS} value={duration} onChange={setDuration} />
      </Field>
      <Field label="Where" hint="optional">
        <TextField value={location} onChangeText={setLocation} placeholder="Address or place" />
      </Field>
      <Field label="Remind me">
        <ChoicePills options={REMINDERS} value={remind} onChange={setRemind} />
      </Field>
      <Field label="Save to">
        <Card pad={0}>
          {DESTINATIONS.map((d, index) => (
            <View
              key={d.title}
              accessibilityRole="radio"
              accessibilityState={{ selected: d.enabled, disabled: !d.enabled }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingVertical: 12,
                paddingHorizontal: 14,
                borderBottomWidth: index < DESTINATIONS.length - 1 ? 1 : 0,
                borderBottomColor: OC.line,
                opacity: d.enabled ? 1 : 0.55,
              }}
            >
              <View
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  borderWidth: 2,
                  borderColor: d.enabled ? OC.green : OC.ink300,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {d.enabled ? (
                  <View
                    style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: OC.green }}
                  />
                ) : null}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: FONT.bodyBold, fontSize: 14, color: OC.ink }}>
                  {d.title}
                </Text>
                <Text style={{ fontFamily: FONT.body, fontSize: 12, color: OC.ink500 }}>
                  {d.sub}
                </Text>
              </View>
            </View>
          ))}
        </Card>
      </Field>
    </OverlayScreen>
  );
}
