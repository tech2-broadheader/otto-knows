// New / edit alarm (story 12.3; approved design 2026-10-08): big hour and
// minute, repeat days, label, vibrate and snooze. Saving arms it on the phone;
// editing offers Delete. Route params: { alarmId } to edit; none to create.
import { useEffect, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { SNOOZE_MINUTES, type DayOfWeek } from "@otto/schemas";
import { describeRepeat, formatTimeUntil, nextAlarm } from "@otto/core";
import { FormError } from "../components/money-ui";
import { ChoicePills, Field, OToggle, OverlayScreen, SaveBar, TextField } from "../design/kit";
import { FONT, OC, RADIUS } from "../design/theme";
import { useAlarms } from "../hooks/useAlarms";
import { LOCAL_USER_ID } from "../lib/constants";
import { todayDate } from "../lib/datetime";
import { validateAlarmForm } from "../lib/forms";
import { t } from "../i18n";

type Params = { alarmId?: string };

const DAYS: ReadonlyArray<{ day: DayOfWeek; letter: string; name: string }> = [
  { day: "mon", letter: t("tasks.alarmForm.dayLetters.mon"), name: t("tasks.alarmForm.days.mon") },
  { day: "tue", letter: t("tasks.alarmForm.dayLetters.tue"), name: t("tasks.alarmForm.days.tue") },
  { day: "wed", letter: t("tasks.alarmForm.dayLetters.wed"), name: t("tasks.alarmForm.days.wed") },
  { day: "thu", letter: t("tasks.alarmForm.dayLetters.thu"), name: t("tasks.alarmForm.days.thu") },
  { day: "fri", letter: t("tasks.alarmForm.dayLetters.fri"), name: t("tasks.alarmForm.days.fri") },
  { day: "sat", letter: t("tasks.alarmForm.dayLetters.sat"), name: t("tasks.alarmForm.days.sat") },
  { day: "sun", letter: t("tasks.alarmForm.dayLetters.sun"), name: t("tasks.alarmForm.days.sun") },
];

const DEFAULT_HOUR = "06";
const DEFAULT_MINUTE = "00";
const PLACEHOLDER_TS = "2026-01-01T00:00:00+00:00";

export function AlarmFormScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const { alarmId } = (useRoute().params ?? {}) as Params;
  const alarms = useAlarms();
  const existing = alarmId ? alarms.get(alarmId) : undefined;

  const [hour, setHour] = useState(DEFAULT_HOUR);
  const [minute, setMinute] = useState(DEFAULT_MINUTE);
  const [repeatDays, setRepeatDays] = useState<DayOfWeek[]>([]);
  const [label, setLabel] = useState("");
  const [vibrate, setVibrate] = useState(true);
  const [snoozeMinutes, setSnoozeMinutes] = useState<number>(5);
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [loadedId, setLoadedId] = useState<string | undefined>();

  // Fill the form once the alarm being edited has loaded.
  useEffect(() => {
    if (!existing || loadedId === existing.id) return;
    const [h, m] = existing.time.split(":");
    setHour(h ?? DEFAULT_HOUR);
    setMinute(m ?? DEFAULT_MINUTE);
    setRepeatDays(existing.repeatDays);
    setLabel(existing.label ?? "");
    setVibrate(existing.vibrate);
    setSnoozeMinutes(existing.snoozeMinutes);
    setLoadedId(existing.id);
  }, [existing, loadedId]);

  const parsed = validateAlarmForm({ hour, minute, label });
  const ringsIn = (() => {
    if (!parsed.ok) return undefined;
    const now = new Date();
    const pad = (n: number): string => `${n}`.padStart(2, "0");
    const found = nextAlarm(
      [
        {
          id: "00000000-0000-4000-8000-000000000000",
          userId: LOCAL_USER_ID,
          time: parsed.value.time,
          repeatDays,
          enabled: true,
          vibrate,
          snoozeMinutes,
          createdAt: PLACEHOLDER_TS,
          updatedAt: PLACEHOLDER_TS,
        },
      ],
      { date: todayDate(now), time: `${pad(now.getHours())}:${pad(now.getMinutes())}` },
    );
    return found ? formatTimeUntil(found.minutesUntil) : undefined;
  })();

  const toggleDay = (day: DayOfWeek): void =>
    setRepeatDays((current) =>
      current.includes(day) ? current.filter((d) => d !== day) : [...current, day],
    );

  const save = async (): Promise<void> => {
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setError(undefined);
    setSaving(true);
    try {
      await alarms.save(
        { time: parsed.value.time, label: parsed.value.label, repeatDays, vibrate, snoozeMinutes },
        existing?.id,
      );
      navigation.goBack();
    } catch {
      setError(t("tasks.alarmForm.saveError"));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (): void => {
    if (!existing) return;
    Alert.alert(t("tasks.alarmForm.deleteConfirm"), existing.label ?? existing.time, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: () => void alarms.remove(existing.id).then(() => navigation.goBack()),
      },
    ]);
  };

  return (
    <OverlayScreen
      title={existing ? t("tasks.alarmForm.editTitle") : t("tasks.alarmForm.newTitle")}
      onBack={() => navigation.goBack()}
      footer={
        <SaveBar
          label={saving ? t("tasks.saving") : t("tasks.alarmForm.save")}
          onCancel={() => navigation.goBack()}
          onSave={() => void save()}
          disabled={saving}
        />
      }
    >
      <FormError message={error} />

      <View
        style={{
          backgroundColor: OC.surface,
          borderWidth: 1,
          borderColor: OC.line,
          borderRadius: 20,
          paddingVertical: 18,
          alignItems: "center",
          marginBottom: 18,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <TimeBox value={hour} onChange={setHour} label={t("tasks.alarmForm.hour")} />
          <Text style={{ fontFamily: FONT.display, fontSize: 56, color: OC.ink400 }}>:</Text>
          <TimeBox value={minute} onChange={setMinute} label={t("tasks.alarmForm.minute")} />
        </View>
        <Text style={{ marginTop: 10, fontFamily: FONT.bodySemi, fontSize: 13, color: OC.ink500 }}>
          {ringsIn ? t("tasks.alarmForm.ringsIn", { time: ringsIn }) : t("tasks.alarmForm.range")}
        </Text>
      </View>

      <Field label={t("tasks.alarmForm.repeat")} hint={describeRepeat(repeatDays)}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          {DAYS.map(({ day, letter, name }) => {
            const on = repeatDays.includes(day);
            return (
              <Pressable
                key={day}
                onPress={() => toggleDay(day)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={name}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: on ? OC.green : OC.surface,
                  borderWidth: on ? 0 : 1.5,
                  borderColor: OC.line,
                }}
              >
                <Text
                  style={{ fontFamily: FONT.bodyX, fontSize: 13, color: on ? "#fff" : OC.ink700 }}
                >
                  {letter}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={{ marginTop: 7, fontFamily: FONT.body, fontSize: 12, color: OC.ink500 }}>
          {t("tasks.alarmForm.ringsOnce")}
        </Text>
      </Field>

      <Field label={t("tasks.alarmForm.label")} hint={t("common.optional")}>
        <TextField
          value={label}
          onChangeText={setLabel}
          placeholder={t("tasks.alarmForm.labelPlaceholder")}
        />
      </Field>

      <View
        style={{
          backgroundColor: OC.surface,
          borderWidth: 1,
          borderColor: OC.line,
          borderRadius: RADIUS.inner,
          paddingHorizontal: 14,
          marginBottom: 16,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: OC.line,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: FONT.bodyBold, fontSize: 14, color: OC.ink }}>
              {t("tasks.alarmForm.sound")}
            </Text>
            <Text style={{ fontFamily: FONT.body, fontSize: 12, color: OC.ink500 }}>
              {t("tasks.alarmForm.soundDefault")}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 12 }}>
          <Text style={{ flex: 1, fontFamily: FONT.bodyBold, fontSize: 14, color: OC.ink }}>
            {t("tasks.alarmForm.vibrate")}
          </Text>
          <OToggle on={vibrate} onToggle={() => setVibrate((v) => !v)} />
        </View>
      </View>

      <Field label={t("tasks.alarmForm.snooze")}>
        <ChoicePills
          options={SNOOZE_MINUTES.map((m) => ({
            k: String(m),
            l: t("tasks.alarmForm.snoozeMinutes", { minutes: m }),
          }))}
          value={String(snoozeMinutes)}
          onChange={(k) => setSnoozeMinutes(Number(k))}
        />
      </Field>

      {existing ? (
        <Pressable
          onPress={confirmDelete}
          accessibilityRole="button"
          style={({ pressed }) => ({
            alignItems: "center",
            paddingVertical: 12,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text style={{ fontFamily: FONT.bodyX, fontSize: 14, color: OC.coralInk }}>
            {t("tasks.alarmForm.delete")}
          </Text>
        </Pressable>
      ) : null}
    </OverlayScreen>
  );
}

function TimeBox({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (next: string) => void;
  label: string;
}): React.JSX.Element {
  return (
    <TextInput
      value={value}
      onChangeText={(text) => onChange(text.replace(/\D/g, "").slice(0, 2))}
      keyboardType="number-pad"
      maxLength={2}
      selectTextOnFocus
      accessibilityLabel={label}
      style={{
        width: 104,
        textAlign: "center",
        backgroundColor: OC.paper2,
        borderRadius: 16,
        paddingVertical: 4,
        fontFamily: FONT.display,
        fontSize: 64,
        color: OC.ink,
      }}
    />
  );
}
