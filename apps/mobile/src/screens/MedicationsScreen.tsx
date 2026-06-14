// Medications (Health). List / add / edit / delete medications via the sensitive
// medication repository. Fields: name, dosage, dose times (one or more HH:mm) and
// recurrence. Validated with medicationSchema (in the hook). Free cap enforced
// with the same upgrade-prompt pattern Finance uses. Logic lives in useMedications;
// this screen is presentational + form state only.
import { useState } from "react";
import { Text, View } from "react-native";
import type { Medication } from "@otto/schemas";
import { useRepositoryDeps } from "../hooks/useRepositoryDeps";
import { useMedications, type MedicationInput } from "../hooks/useMedications";
import { AsyncBoundary, EmptyState, ScreenScroll } from "../components/AsyncBoundary";
import { Banner, Button, Card, LabeledInput } from "../components/ui";
import { FREE_CAPS, upgradePromptFor } from "../lib/caps";
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
      <Text className="mb-1 text-sm font-medium text-slate-600">Repeats</Text>
      <View className="flex-row flex-wrap gap-2">
        {MED_RECURRENCE_FREQS.map((freq) => (
          <View key={freq}>
            <Button
              label={FREQ_LABEL[freq]}
              variant={freq === value ? "primary" : "secondary"}
              onPress={() => onChange(freq)}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

export function MedicationsScreen(): React.JSX.Element {
  const deps = useRepositoryDeps();
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

  const resetForm = (): void => {
    setEditingId(undefined);
    setName("");
    setDosage("");
    setTimesText("");
    setFreq("daily");
    setFormError(undefined);
  };

  const startEdit = (med: Medication): void => {
    setEditingId(med.id);
    setName(med.name);
    setDosage(med.dosage ?? "");
    setTimesText(med.times.join(", "));
    // Schema allows `custom`; the form only offers the simple frequencies, so
    // fall back to daily when editing a custom-recurrence med.
    const f = MED_RECURRENCE_FREQS.find((x) => x === med.recurrence.freq);
    setFreq(f ?? "daily");
    setFormError(undefined);
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

  return (
    <ScreenScroll>
      <Text className="mb-1 text-2xl font-bold text-slate-900">Medications</Text>
      <Text className="mb-4 text-sm text-slate-500">
        Otto reminds you to take these at the right time. Stored encrypted on your device.
      </Text>

      <AsyncBoundary
        state={state}
        error={error}
        onRetry={reload}
        loadingLabel="Loading medications"
      >
        <Card title={`Your medications (${medications.length}/${FREE_CAPS.medications})`}>
          {medications.length === 0 ? (
            <EmptyState title="No medications yet" hint="Add one below to get dose reminders." />
          ) : (
            medications.map((med) => (
              <View key={med.id} className="border-b border-slate-100 py-2">
                <View className="flex-row justify-between">
                  <Text className="text-base font-medium text-slate-900">{med.name}</Text>
                  <Text className="text-sm text-slate-500">
                    {
                      FREQ_LABEL[
                        MED_RECURRENCE_FREQS.find((f) => f === med.recurrence.freq) ?? "daily"
                      ]
                    }
                  </Text>
                </View>
                {med.dosage ? (
                  <Text className="mt-0.5 text-sm text-slate-500">{med.dosage}</Text>
                ) : null}
                <Text className="mt-0.5 text-sm text-slate-500">At {med.times.join(", ")}</Text>
                <View className="mt-2 flex-row gap-2">
                  <View className="flex-1">
                    <Button label="Edit" variant="secondary" onPress={() => startEdit(med)} />
                  </View>
                  <View className="flex-1">
                    <Button
                      label="Delete"
                      variant="danger"
                      onPress={() => void deleteMedication(med.id)}
                    />
                  </View>
                </View>
              </View>
            ))
          )}
        </Card>

        {medicationsAtCap && !editingId ? (
          <Banner message={upgradePromptFor("medications")} tone="warning" />
        ) : (
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
            {editingId ? (
              <View className="mt-2">
                <Button label="Cancel" variant="secondary" onPress={resetForm} />
              </View>
            ) : null}
          </Card>
        )}
      </AsyncBoundary>
    </ScreenScroll>
  );
}
