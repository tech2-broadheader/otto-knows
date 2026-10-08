// Medications (Health) — OTTO Health design (otto/app-screens.jsx HealthScreen),
// ported to RN inline styles via the design kit. List / add / edit / delete
// medications via the sensitive medication repository. Fields: name, dosage, dose
// times (one or more HH:mm) and recurrence. Validated with medicationSchema (in
// the hook). Free cap enforced with a ProGate at the cap. Logic lives in
// useMedications; this screen is presentational + form state only.
//
// Visual: a dark "Next dose" hero (GradientCard), the meds as CheckRows (tap a row
// to edit it) with a refill Pill when stock is low, a dashed "Add a medication"
// affordance, and a ProGate at the free 3-med cap. The add/edit form reveals
// inline below the list. Only the look changed; data logic is unchanged.
import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import type { Medication } from "@otto/schemas";
import { useRepositoryDeps } from "../hooks/useRepositoryDeps";
import { useMedications, type MedicationInput } from "../hooks/useMedications";
import { AsyncBoundary } from "../components/AsyncBoundary";
import {
  Screen,
  AppHeader,
  GradientCard,
  SectionLabel,
  Card,
  CheckRow,
  Pill,
  AddButton,
  ProGate,
  Display,
  EmptyState,
  Field,
  TextField,
  ChoicePills,
  SaveBar,
  GhostButton,
  type Option,
} from "../design/kit";
import { Icon } from "../design/Icon";
import { OC, FONT } from "../design/theme";
import { useAuth } from "../auth/AuthProvider";
import { useUpgradeNavigation } from "../hooks/useUpgradeNavigation";
import { useSettingsNavigation } from "../hooks/useSettingsNavigation";
import { FREE_CAPS } from "../lib/caps";
import {
  MED_RECURRENCE_FREQS,
  parseTimesList,
  recurrenceFromFreq,
  type MedRecurrenceFreq,
} from "../lib/medication-input";
import { t } from "../i18n";

const FREQ_LABEL: Record<MedRecurrenceFreq, string> = {
  daily: t("assistant.health.freq.daily"),
  weekdays: t("assistant.health.freq.weekdays"),
  weekends: t("assistant.health.freq.weekends"),
  weekly: t("assistant.health.freq.weekly"),
  monthly: t("assistant.health.freq.monthly"),
};

/** Recurrence options for the ChoicePills selector. */
const FREQ_OPTIONS: Option[] = MED_RECURRENCE_FREQS.map((freq) => ({
  k: freq,
  l: FREQ_LABEL[freq],
}));

/** Low-stock threshold (doses) that surfaces a "refill" pill on the row. */
const REFILL_THRESHOLD = 7;

export function MedicationsScreen(): React.JSX.Element {
  const deps = useRepositoryDeps();
  const goToUpgrade = useUpgradeNavigation();
  const goToSettings = useSettingsNavigation();
  const { isPro } = useAuth();
  const {
    state,
    error,
    medications,
    medicationsAtCap,
    addMedication,
    editMedication,
    deleteMedication,
    reload,
  } = useMedications(deps);

  // Form state. `editingId` switches the form between "add" and "edit" modes.
  const [editingId, setEditingId] = useState<string | undefined>();
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [timesText, setTimesText] = useState("");
  const [freq, setFreq] = useState<MedRecurrenceFreq>("daily");
  const [formError, setFormError] = useState<string | undefined>();
  const [showForm, setShowForm] = useState(false);

  const resetForm = (): void => {
    setEditingId(undefined);
    setName("");
    setDosage("");
    setTimesText("");
    setFreq("daily");
    setFormError(undefined);
    setShowForm(false);
  };

  const startEdit = (med: Medication): void => {
    setEditingId(med.id);
    setName(med.name);
    setDosage(med.dosage ?? "");
    setTimesText(med.times.join(", "));
    const f = MED_RECURRENCE_FREQS.find((x) => x === med.recurrence.freq);
    setFreq(f ?? "daily");
    setFormError(undefined);
    setShowForm(true);
  };

  const handleSubmit = async (): Promise<void> => {
    if (name.trim().length === 0) return setFormError(t("assistant.health.errors.nameRequired"));
    const times = parseTimesList(timesText);
    if (times === null) {
      return setFormError(t("assistant.health.errors.timesRequired"));
    }
    setFormError(undefined);
    const input: MedicationInput = {
      name: name.trim(),
      dosage: dosage.trim(),
      times,
      recurrence: recurrenceFromFreq(freq),
    };
    if (editingId) {
      await editMedication(editingId, input);
      resetForm();
      return;
    }
    const result = await addMedication(input);
    if (result === "at-cap") return;
    resetForm();
  };

  // The "next dose" hero: the med with the earliest dose time (today's rhythm).
  const nextDose = useMemo(() => {
    const withTime = medications
      .map((m) => ({ med: m, time: [...m.times].sort()[0] }))
      .filter((x): x is { med: Medication; time: string } => x.time !== undefined)
      .sort((a, b) => a.time.localeCompare(b.time));
    return withTime[0];
  }, [medications]);

  return (
    <Screen>
      <AppHeader
        title={t("common.tabs.health")}
        sub={t("assistant.health.sub")}
        isPro={isPro}
        onUpgrade={goToUpgrade}
        onSettings={goToSettings}
      />

      <View style={{ paddingHorizontal: 18 }}>
        <AsyncBoundary
          state={state}
          error={error}
          onRetry={reload}
          loadingLabel={t("assistant.health.loading")}
        >
          {/* Next dose hero */}
          {nextDose ? (
            <View style={{ marginTop: 14 }}>
              <GradientCard>
                <Text
                  style={{
                    fontFamily: FONT.monoBold,
                    fontSize: 11,
                    letterSpacing: 1.6,
                    textTransform: "uppercase",
                    color: OC.emerald,
                  }}
                >
                  {t("assistant.health.nextDose")}
                </Text>
                <View
                  style={{
                    marginTop: 10,
                    flexDirection: "row",
                    alignItems: "flex-end",
                    justifyContent: "space-between",
                  }}
                >
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Display style={{ fontSize: 26, lineHeight: 28, color: "#fff" }}>
                      {nextDose.med.name}
                      {nextDose.med.dosage ? ` ${nextDose.med.dosage}` : ""}
                    </Display>
                    <Text
                      style={{
                        marginTop: 6,
                        fontFamily: FONT.bodySemi,
                        fontSize: 13.5,
                        color: OC.sage,
                      }}
                    >
                      {nextDose.time}
                    </Text>
                  </View>
                  <Pill tone="green" style={{ backgroundColor: OC.emerald }}>
                    {nextDose.time}
                  </Pill>
                </View>
              </GradientCard>
            </View>
          ) : null}

          {/* Meds list */}
          <View style={{ marginTop: 20 }}>
            <SectionLabel
              right={
                <Text style={{ fontFamily: FONT.bodySemi, fontSize: 11.5, color: OC.ink400 }}>
                  {t("assistant.health.capCount", {
                    count: medications.length,
                    cap: FREE_CAPS.medications,
                  })}
                </Text>
              }
            >
              {t("assistant.health.listLabel")}
            </SectionLabel>
            <Card pad={0} style={{ paddingHorizontal: 14, paddingVertical: 4 }}>
              {medications.length === 0 ? (
                <EmptyState
                  title={t("assistant.health.empty.title")}
                  body={t("assistant.health.empty.body")}
                />
              ) : (
                medications.map((med, index) => {
                  const low =
                    med.quantityRemaining !== undefined &&
                    med.quantityRemaining <= REFILL_THRESHOLD;
                  return (
                    <View
                      key={med.id}
                      style={
                        index < medications.length - 1
                          ? { borderBottomWidth: 1, borderBottomColor: OC.line }
                          : undefined
                      }
                    >
                      <CheckRow
                        checked={false}
                        onToggle={() => startEdit(med)}
                        icon="pill"
                        tone={low ? "coral" : "green"}
                        title={med.name}
                        sub={`${med.dosage ? `${med.dosage} · ` : ""}${med.times.join(", ")}`}
                        right={
                          low ? (
                            <Pill tone="coral">
                              <Icon name="refresh" size={12} color={OC.coralInk} />
                              <Text
                                style={{
                                  color: OC.coralInk,
                                  fontFamily: FONT.bodyBold,
                                  fontSize: 11.5,
                                }}
                              >
                                {t("assistant.health.left", { count: med.quantityRemaining ?? 0 })}
                              </Text>
                            </Pill>
                          ) : undefined
                        }
                      />
                    </View>
                  );
                })
              )}
            </Card>
          </View>

          {/* Cap → ProGate; otherwise the add/edit affordance */}
          {medicationsAtCap && !editingId ? (
            <View style={{ marginTop: 18 }}>
              <ProGate onUpgrade={goToUpgrade}>
                <Display style={{ fontSize: 17, color: "#fff", lineHeight: 22 }}>
                  {t("assistant.health.proGate.title")}
                </Display>
                <Text
                  style={{
                    fontSize: 13.5,
                    color: OC.sage,
                    marginTop: 6,
                    lineHeight: 20,
                    fontFamily: FONT.body,
                  }}
                >
                  {t("assistant.health.proGate.body")}
                </Text>
              </ProGate>
            </View>
          ) : showForm ? (
            <View style={{ marginTop: 16 }}>
              <Card>
                <Display style={{ fontSize: 18, marginBottom: 14 }}>
                  {editingId
                    ? t("assistant.health.form.editTitle")
                    : t("assistant.health.form.addTitle")}
                </Display>
                {formError ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "flex-start",
                      gap: 9,
                      borderRadius: 14,
                      backgroundColor: OC.amberBg,
                      paddingHorizontal: 14,
                      paddingVertical: 11,
                      marginBottom: 14,
                    }}
                  >
                    <Text
                      style={{
                        flex: 1,
                        fontFamily: FONT.bodySemi,
                        fontSize: 13,
                        lineHeight: 19,
                        color: OC.amberInk,
                      }}
                    >
                      {formError}
                    </Text>
                  </View>
                ) : null}
                <Field label={t("assistant.health.form.name")}>
                  <TextField
                    value={name}
                    onChangeText={setName}
                    placeholder={t("assistant.health.form.namePlaceholder")}
                  />
                </Field>
                <Field
                  label={t("assistant.health.form.dosage")}
                  hint={t("assistant.health.form.optionalHint")}
                >
                  <TextField
                    value={dosage}
                    onChangeText={setDosage}
                    placeholder={t("assistant.health.form.dosagePlaceholder")}
                  />
                </Field>
                <Field
                  label={t("assistant.health.form.times")}
                  hint={t("assistant.health.form.timesHint")}
                >
                  <TextField
                    value={timesText}
                    onChangeText={setTimesText}
                    placeholder={t("assistant.health.form.timesPlaceholder")}
                  />
                </Field>
                <Field label={t("assistant.health.form.repeats")}>
                  <ChoicePills
                    options={FREQ_OPTIONS}
                    value={freq}
                    onChange={(k) => setFreq(k as MedRecurrenceFreq)}
                  />
                </Field>
                <SaveBar
                  onCancel={resetForm}
                  onSave={() => void handleSubmit()}
                  label={
                    editingId
                      ? t("assistant.health.form.saveChanges")
                      : t("assistant.health.form.add")
                  }
                />
                {editingId ? (
                  <View style={{ marginTop: 10 }}>
                    <GhostButton
                      label={t("common.delete")}
                      onPress={() => void deleteMedication(editingId).then(resetForm)}
                    />
                  </View>
                ) : null}
              </Card>
            </View>
          ) : (
            <AddButton
              label={t("assistant.health.form.addTitle")}
              onPress={() => setShowForm(true)}
            />
          )}
        </AsyncBoundary>
      </View>
    </Screen>
  );
}
