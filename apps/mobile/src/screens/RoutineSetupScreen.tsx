// Routine Setup (story 2.1). List/add/edit/remove anchors; offer seeded defaults
// on first run, all editable. Persists via the routine repository (useRoutine).
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { RoutineAnchor, RoutineAnchorKind } from "@otto/schemas";
import { useRoutine } from "../hooks/useRoutine";
import { AsyncBoundary, EmptyState, ScreenScroll } from "../components/AsyncBoundary";
import { Button, Card, LabeledInput } from "../components/ui";

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
            className={`rounded-full px-3 py-1.5 ${active ? "bg-slate-900" : "bg-slate-200"}`}
          >
            <Text className={active ? "text-white" : "text-slate-700"}>{kind}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function RoutineSetupScreen({ onDone }: { onDone?: () => void }): React.JSX.Element {
  const { state, error, anchors, needsSetup, seedDefaults, addAnchor, removeAnchor, reload } =
    useRoutine();

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
  };

  return (
    <ScreenScroll>
      <View className="mb-4">
        <Text className="text-2xl font-bold text-slate-900">Your routine</Text>
        <Text className="mt-1 text-sm text-slate-500">
          Anchors are the fixed moments of your day. Otto times everything around them.
        </Text>
      </View>

      <AsyncBoundary state={state} error={error} onRetry={reload} loadingLabel="Loading routine">
        {needsSetup ? (
          <Card title="Start with a few defaults?">
            <Text className="mb-3 text-sm text-slate-600">
              We can add wake, meds, lunch, wind-down and sleep to get you going. Everything is
              editable.
            </Text>
            <Button label="Add starter anchors" onPress={() => void seedDefaults()} />
          </Card>
        ) : null}

        <Card title="Add an anchor">
          <LabeledInput
            label="Name"
            value={label}
            onChangeText={setLabel}
            placeholder="e.g. Lunch"
          />
          <Text className="mb-1 text-sm font-medium text-slate-600">Kind</Text>
          <KindPicker value={kind} onChange={setKind} />
          <LabeledInput
            label="Time (HH:mm)"
            value={time}
            onChangeText={setTime}
            placeholder="12:30"
          />
          {formError ? <Text className="mb-2 text-sm text-red-600">{formError}</Text> : null}
          <Button label="Add anchor" onPress={handleAdd} />
        </Card>

        <Text className="mb-2 mt-2 text-base font-semibold text-slate-900">
          Anchors ({anchors.length})
        </Text>
        {anchors.length === 0 && !needsSetup ? (
          <EmptyState title="No anchors yet" hint="Add your first anchor above." />
        ) : (
          [...anchors]
            .sort((a, b) => a.time.localeCompare(b.time))
            .map((anchor: RoutineAnchor) => (
              <Card key={anchor.id}>
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-base font-medium text-slate-900">
                      {anchor.time} · {anchor.label}
                    </Text>
                    <Text className="text-sm text-slate-400">{anchor.kind}</Text>
                  </View>
                  <Pressable
                    onPress={() => void removeAnchor(anchor.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${anchor.label}`}
                    className="rounded-lg bg-red-50 px-3 py-2"
                  >
                    <Text className="font-medium text-red-600">Remove</Text>
                  </Pressable>
                </View>
              </Card>
            ))
        )}

        {onDone ? (
          <View className="mt-2">
            <Button label="Done" onPress={onDone} />
          </View>
        ) : null}
      </AsyncBoundary>
    </ScreenScroll>
  );
}
