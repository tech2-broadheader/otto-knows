// Routine Setup (story 2.1). Offer seeded defaults on first run; list/add/remove
// anchors. Persists via the routine repository (useRoutine). Body-only: the
// onboarding shell owns the step dots + CTA.
//
// Visual: OTTO routine step — "When's your day?" with the anchor rows (icon +
// label + time chip) and a compact add affordance.
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { RoutineAnchor, RoutineAnchorKind } from "@otto/schemas";
import { useRoutine } from "../hooks/useRoutine";
import { AsyncBoundary } from "../components/AsyncBoundary";
import { Banner, Button, Icon, LabeledInput, OC, type IconName } from "../components/ui";

const KINDS: readonly RoutineAnchorKind[] = [
  "wake",
  "meds",
  "meal",
  "work",
  "exercise",
  "wind-down",
  "sleep",
  "custom",
];

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** A glyph for each anchor kind so the rows read at a glance. */
const KIND_ICON: Record<RoutineAnchorKind, IconName> = {
  wake: "sun",
  meds: "pill",
  meal: "coffee",
  work: "cal",
  exercise: "dumbbell",
  "wind-down": "moon",
  sleep: "moon",
  custom: "clock",
};

function KindPicker({
  value,
  onChange,
}: {
  value: RoutineAnchorKind;
  onChange: (kind: RoutineAnchorKind) => void;
}): React.JSX.Element {
  return (
    <View className="mb-3 flex-row flex-wrap gap-2">
      {KINDS.map((kind) => {
        const active = kind === value;
        return (
          <Pressable
            key={kind}
            onPress={() => onChange(kind)}
            accessibilityRole="button"
            accessibilityLabel={`Kind ${kind}`}
            accessibilityState={{ selected: active }}
            className={`rounded-pill px-3 py-1.5 ${active ? "bg-green" : "bg-mist"}`}
          >
            <Text
              className={`font-body-bold text-[12.5px] ${active ? "text-white" : "text-forest"}`}
            >
              {kind}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function RoutineSetupScreen(): React.JSX.Element {
  const { state, error, anchors, needsSetup, seedDefaults, addAnchor, removeAnchor, reload } =
    useRoutine();

  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState("");
  const [time, setTime] = useState("");
  const [kind, setKind] = useState<RoutineAnchorKind>("custom");
  const [formError, setFormError] = useState<string | undefined>();

  const handleAdd = (): void => {
    if (label.trim().length === 0) {
      setFormError("Give the anchor a name.");
      return;
    }
    if (!TIME_PATTERN.test(time)) {
      setFormError("Enter a time as HH:mm (24h), e.g. 07:30.");
      return;
    }
    setFormError(undefined);
    void addAnchor({ label: label.trim(), kind, time });
    setLabel("");
    setTime("");
    setKind("custom");
    setShowForm(false);
  };

  const sorted = [...anchors].sort((a, b) => a.time.localeCompare(b.time));

  return (
    <View>
      <Text className="font-display text-[26px] text-ink">When&apos;s your day?</Text>
      <Text className="mb-4 mt-2 font-body text-[14px] leading-[21px] text-ink-500">
        A few anchors so reminders land at the right moment — not random times. I&apos;ll learn the
        rest.
      </Text>

      <AsyncBoundary state={state} error={error} onRetry={reload} loadingLabel="Loading routine">
        {needsSetup ? (
          <View className="rounded-inner bg-mist px-4 py-4">
            <Text className="font-body text-[13.5px] leading-5 text-forest">
              Start with a few defaults — wake, meds, lunch, wind-down and sleep. Everything is
              editable.
            </Text>
            <View className="mt-3">
              <Button
                label="Add starter anchors"
                variant="mint"
                onPress={() => void seedDefaults()}
              />
            </View>
          </View>
        ) : (
          <>
            {sorted.map((anchor: RoutineAnchor, index) => (
              <View
                key={anchor.id}
                className={`flex-row items-center gap-3 py-3 ${index < sorted.length - 1 ? "border-b border-line" : ""}`}
              >
                <View className="h-10 w-10 items-center justify-center rounded-inner bg-mist">
                  <Icon name={KIND_ICON[anchor.kind]} size={19} color={OC.green} />
                </View>
                <Text className="flex-1 font-body-bold text-[15px] text-ink">{anchor.label}</Text>
                <View className="rounded-inner bg-mist px-3 py-1.5">
                  <Text className="font-display text-[18px] text-green">{anchor.time}</Text>
                </View>
                <Pressable
                  onPress={() => void removeAnchor(anchor.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${anchor.label}`}
                  hitSlop={8}
                >
                  <Icon name="x" size={18} color={OC.ink400} />
                </Pressable>
              </View>
            ))}

            {showForm ? (
              <View className="mt-3">
                {formError ? <Banner message={formError} tone="warning" /> : null}
                <LabeledInput
                  label="Name"
                  value={label}
                  onChangeText={setLabel}
                  placeholder="e.g. Lunch"
                />
                <Text className="mb-1 font-body-medium text-sm text-ink-500">Kind</Text>
                <KindPicker value={kind} onChange={setKind} />
                <LabeledInput
                  label="Time (HH:mm)"
                  value={time}
                  onChangeText={setTime}
                  placeholder="12:30"
                />
                <Button label="Add anchor" onPress={handleAdd} />
              </View>
            ) : (
              <Pressable
                onPress={() => setShowForm(true)}
                accessibilityRole="button"
                accessibilityLabel="Add an anchor"
                className="mt-3 flex-row items-center justify-center gap-2 rounded-inner border-[1.5px] border-dashed border-line-strong bg-surface py-3"
              >
                <Icon name="plus" size={18} color={OC.green} />
                <Text className="font-body-extra text-[14px] text-green">Add an anchor</Text>
              </Pressable>
            )}
          </>
        )}
      </AsyncBoundary>
    </View>
  );
}
