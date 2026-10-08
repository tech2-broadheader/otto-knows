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
import { t } from "../i18n";

const DURATIONS = [
  { k: "15", l: t("tasks.appointmentForm.durations.min15") },
  { k: "30", l: t("tasks.appointmentForm.durations.min30") },
  { k: "60", l: t("tasks.appointmentForm.durations.hour1") },
  { k: "120", l: t("tasks.appointmentForm.durations.hours2") },
];
const REMINDERS = [
  { k: "none", l: t("tasks.appointmentForm.reminders.none") },
  { k: "15", l: t("tasks.appointmentForm.reminders.min15") },
  { k: "60", l: t("tasks.appointmentForm.reminders.hour1") },
  { k: "1440", l: t("tasks.appointmentForm.reminders.day1") },
];
const DESTINATIONS = [
  {
    title: t("tasks.appointmentForm.destinations.otto.title"),
    sub: t("tasks.appointmentForm.destinations.otto.sub"),
    enabled: true,
  },
  {
    title: t("tasks.appointmentForm.destinations.phone.title"),
    sub: t("tasks.appointmentForm.destinations.phone.sub"),
    enabled: false,
  },
  {
    title: t("tasks.appointmentForm.destinations.google.title"),
    sub: t("tasks.appointmentForm.destinations.google.sub"),
    enabled: false,
  },
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
    { k: dateForChoice("today", today), l: t("tasks.appointmentForm.today") },
    { k: dateForChoice("tomorrow", today), l: t("tasks.appointmentForm.tomorrow") },
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
      setError(caught instanceof Error ? caught.message : t("tasks.appointmentForm.saveError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <OverlayScreen
      title={t("tasks.appointmentForm.title")}
      onBack={() => navigation.goBack()}
      footer={
        <SaveBar
          label={saving ? t("tasks.saving") : t("tasks.appointmentForm.save")}
          disabled={saving}
          onCancel={() => navigation.goBack()}
          onSave={() => void save()}
        />
      }
    >
      <FormError message={error} />
      <Field label={t("tasks.appointmentForm.what")}>
        <TextField
          value={title}
          onChangeText={setTitle}
          placeholder={t("tasks.appointmentForm.whatPlaceholder")}
        />
      </Field>
      <Field label={t("tasks.appointmentForm.date")}>
        <ChoicePills options={dateOptions} value={date} onChange={setDate} />
        <View style={{ marginTop: 8 }}>
          <TextField value={date} onChangeText={setDate} placeholder="2026-10-13" />
        </View>
      </Field>
      <Field label={t("tasks.appointmentForm.starts")} hint={t("tasks.appointmentForm.startsHint")}>
        <TextField value={time} onChangeText={setTime} placeholder="15:00" />
      </Field>
      <Field
        label={t("tasks.appointmentForm.howLong")}
        hint={endsAt ? t("tasks.appointmentForm.ends", { time: endsAt }) : undefined}
      >
        <ChoicePills options={DURATIONS} value={duration} onChange={setDuration} />
      </Field>
      <Field label={t("tasks.appointmentForm.where")} hint={t("tasks.appointmentForm.whereHint")}>
        <TextField
          value={location}
          onChangeText={setLocation}
          placeholder={t("tasks.appointmentForm.wherePlaceholder")}
        />
      </Field>
      <Field label={t("tasks.appointmentForm.remindMe")}>
        <ChoicePills options={REMINDERS} value={remind} onChange={setRemind} />
      </Field>
      <Field label={t("tasks.appointmentForm.saveTo")}>
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
