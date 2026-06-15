// Medications (Health). List / add / edit / delete medications via the sensitive
// medication repository. Fields: name, dosage, dose times (one or more HH:mm) and
// recurrence. Validated with medicationSchema (in the hook). Free cap enforced
// with a ProGate at the cap. Logic lives in useMedications; this screen is
// presentational + form state only.
//
// Visual: OTTO Health design — a dark "Next dose" hero, the meds as CheckRows
// (tap a row to edit it) with a refill Pill when stock is low, and a ProGate at
// the free 3-med cap. The add/edit form reveals inline below the list.
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { Medication } from "@otto/schemas";
import { useRepositoryDeps } from "../hooks/useRepositoryDeps";
import { useMedications, type MedicationInput } from "../hooks/useMedications";
import { AsyncBoundary, EmptyState } from "../components/AsyncBoundary";
import { Banner, Button, Card, Icon, LabeledInput, OC, Pill, SectionLabel } from "../components/ui";
import { CheckRow, ProGate, ScreenContainer, ScreenHeader } from "../components/otto-ui";
import { useUpgradeNavigation } from "../hooks/useUpgradeNavigation";
import { FREE_CAPS } from "../lib/caps";
import {
  MED_RECURRENCE_FREQS,
  parseTimesList,
  recurrenceFromFreq,
  type MedRecurrenceFreq,
} from "../lib/medication-input";

const FREQ_LABEL: Record<MedRecurrenceFreq, string> = {
  daily: "Daily",
  weekdays: "Weekdays",
  weekends: "Weekends",
  weekly: "Weekly",
  monthly: "Monthly",
};

/** Low-stock threshold (doses) that surfaces a "refill" pill on the row. */
const REFILL_THRESHOLD = 7;

/** A simple single-select chip row for the recurrence frequency. */
function FreqSelect({
  value,
  onChange,
}: {
  value: MedRecurrenceFreq;
  onChange: (next: MedRecurrenceFreq) => void;
}): React.JSX.Element {
  return (
    <View className="mb-3">
      <Text className="mb-1 font-body-medium text-sm text-ink-500">Repeats</Text>
      <View className="flex-row flex-wrap gap-2">
        {MED_RECURRENCE_FREQS.map((freq) => (
          <Pressable
            key={freq}
            onPress={() => onChange(freq)}
            accessibilityRole="button"
            accessibilityLabel={FREQ_LABEL[freq]}
            accessibilityState={{ selected: freq === value }}
            className={`rounded-pill px-3 py-1.5 ${freq === value ? "bg-green" : "bg-mist"}`}
          >
            <Text
              className={`font-body-bold text-[12.5px] ${freq === value ? "text-white" : "text-forest"}`}
            >
              {FREQ_LABEL[freq]}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function MedicationsScreen(): React.JSX.Element {
  const deps = useRepositoryDeps();
  const goToUpgrade = useUpgradeNavigation();
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
    if (name.trim().length === 0) return setFormError("Medication needs a name.");
    const times = parseTimesList(timesText);
    if (times === null) {
      return setFormError("Add at least one dose time as HH:mm (e.g. 08:00, 20:00).");
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
    <ScreenContainer>
      <ScreenHeader title="Health" sub="Medications" />

      <AsyncBoundary
        state={state}
        error={error}
        onRetry={reload}
        loadingLabel="Loading medications"
      >
        {/* Next dose hero */}
        {nextDose ? (
          <View className="mt-3.5 overflow-hidden rounded-card bg-dark p-[18px]">
            <Text className="font-mono-bold text-[11px] uppercase tracking-[1.6px] text-emerald">
              Next dose
            </Text>
            <View className="mt-2.5 flex-row items-end justify-between">
              <View className="flex-1 pr-3">
                <Text className="font-display text-[26px] leading-[28px] text-white">
                  {nextDose.med.name}
                  {nextDose.med.dosage ? ` ${nextDose.med.dosage}` : ""}
                </Text>
                <Text className="mt-1.5 font-body-semibold text-[13.5px] text-sage">
                  {nextDose.time}
                </Text>
              </View>
              <Pill tone="green">{nextDose.time}</Pill>
            </View>
          </View>
        ) : null}

        {/* Meds list */}
        <View className="mt-5">
          <SectionLabel
            right={
              <Text className="font-body-semibold text-[11.5px] text-ink-400">
                {medications.length} of {FREE_CAPS.medications} free
              </Text>
            }
          >
            Your medications
          </SectionLabel>
          <Card pad="px-3.5 py-1">
            {medications.length === 0 ? (
              <EmptyState title="No medications yet" hint="Add one below to get dose reminders." />
            ) : (
              medications.map((med, index) => {
                const low =
                  med.quantityRemaining !== undefined && med.quantityRemaining <= REFILL_THRESHOLD;
                return (
                  <View
                    key={med.id}
                    className={index < medications.length - 1 ? "border-b border-line" : ""}
                  >
                    <CheckRow
                      checked={false}
                      onToggle={() => startEdit(med)}
                      icon="pill"
                      tone={low ? "coral" : "green"}
                      title={med.name}
                      sub={`${med.dosage ? `${med.dosage} · ` : ""}${med.times.join(", ")}`}
                      right={
                        low ? <Pill tone="coral">{med.quantityRemaining} left</Pill> : undefined
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
          <View className="mt-4">
            <ProGate
              title="At your 3-med limit"
              body="Pro tracks unlimited meds, warns you before refills run out, and adds gentle health tips from your wearable."
              onUpgrade={goToUpgrade}
            />
          </View>
        ) : showForm ? (
          <View className="mt-4">
            <Card title={editingId ? "Edit medication" : "Add a medication"}>
              {formError ? <Banner message={formError} tone="warning" /> : null}
              <LabeledInput
                label="Name"
                value={name}
                onChangeText={setName}
                placeholder="e.g. Metformin"
              />
              <LabeledInput
                label="Dosage (optional)"
                value={dosage}
                onChangeText={setDosage}
                placeholder="e.g. 500mg"
              />
              <LabeledInput
                label="Dose times (HH:mm, comma-separated)"
                value={timesText}
                onChangeText={setTimesText}
                placeholder="e.g. 08:00, 20:00"
              />
              <FreqSelect value={freq} onChange={setFreq} />
              <Button
                label={editingId ? "Save changes" : "Add medication"}
                onPress={() => void handleSubmit()}
              />
              <View className="mt-2 flex-row gap-2">
                <View className="flex-1">
                  <Button label="Cancel" variant="ghost" onPress={resetForm} />
                </View>
                {editingId ? (
                  <View className="flex-1">
                    <Button
                      label="Delete"
                      variant="danger"
                      onPress={() => void deleteMedication(editingId).then(resetForm)}
                    />
                  </View>
                ) : null}
              </View>
            </Card>
          </View>
        ) : (
          <Pressable
            onPress={() => setShowForm(true)}
            accessibilityRole="button"
            accessibilityLabel="Add a medication"
            className="mt-4 flex-row items-center justify-center gap-2 rounded-inner border-[1.5px] border-dashed border-line-strong bg-surface py-3.5"
          >
            <Icon name="plus" size={18} color={OC.green} />
            <Text className="font-body-extra text-[14.5px] text-green">Add a medication</Text>
          </Pressable>
        )}
      </AsyncBoundary>
    </ScreenContainer>
  );
}
