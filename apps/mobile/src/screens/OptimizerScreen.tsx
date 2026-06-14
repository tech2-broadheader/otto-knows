// Routine Optimizer (story 6.x / FR-O1) — the propose-and-confirm surface for
// reshaping the day. Describe a new routine; Otto proposes a reshaped day with
// per-change reasoning. NOTHING changes until the user taps "Apply this plan"
// (CLAUDE.md §1.11, spec §6.1). Presentational — all logic lives in useOptimizer
// / apply-optimization.
//
// Pro-gated: when not Pro (or the backend is unconfigured / 401 / 403) a calm
// upgrade / sign-in banner shows instead of the form. Nothing ever crashes.
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { NewRoutineRequest, Recurrence, RoutineAnchorKind } from "@otto/schemas";
import { useOptimizer } from "../hooks/useOptimizer";
import { EmptyState, LoadingState, ScreenScroll } from "../components/AsyncBoundary";
import { Banner, Button, Card, LabeledInput } from "../components/ui";
import { UpgradeButton } from "../components/UpgradeButton";
import { describeChange } from "../lib/apply-optimization";
import { getApiBaseUrl } from "../lib/api-client";
import { IS_PRO } from "../lib/constants";
import { proErrorBanner, proGateBanner } from "../lib/pro-feature";

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

/** Recurrence presets the chooser offers (covers the common cases). */
const RECURRENCE_OPTIONS: ReadonlyArray<{ label: string; value: Recurrence }> = [
  { label: "Every day", value: { freq: "daily" } },
  { label: "Weekdays", value: { freq: "weekdays" } },
  { label: "Weekends", value: { freq: "weekends" } },
  { label: "Weekly", value: { freq: "weekly" } },
];

/** A pill-style single-select used for kind + recurrence. */
function PillPicker<T>({
  options,
  labelFor,
  isActive,
  onSelect,
  accessibilityPrefix,
}: {
  options: readonly T[];
  labelFor: (option: T) => string;
  isActive: (option: T) => boolean;
  onSelect: (option: T) => void;
  accessibilityPrefix: string;
}): React.JSX.Element {
  return (
    <View className="mb-3 flex-row flex-wrap gap-2">
      {options.map((option, index) => {
        const active = isActive(option);
        return (
          <Pressable
            key={`${accessibilityPrefix}-${index}`}
            onPress={() => onSelect(option)}
            accessibilityRole="button"
            accessibilityLabel={`${accessibilityPrefix} ${labelFor(option)}`}
            accessibilityState={{ selected: active }}
            className={`rounded-full px-3 py-1.5 ${active ? "bg-slate-900" : "bg-slate-200"}`}
          >
            <Text className={active ? "text-white" : "text-slate-700"}>{labelFor(option)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function OptimizerScreen(): React.JSX.Element {
  const { status, proposal, error, errorCode, propose, apply, discard } = useOptimizer();

  const [label, setLabel] = useState("");
  const [kind, setKind] = useState<RoutineAnchorKind>("custom");
  const [duration, setDuration] = useState("30");
  const [recurrenceIndex, setRecurrenceIndex] = useState(0);
  const [preference, setPreference] = useState("");
  const [formError, setFormError] = useState<string | undefined>();

  // Pre-request gate: not entitled or no backend → calm message, no form.
  const configured = getApiBaseUrl() !== null;
  if (!IS_PRO || !configured) {
    const banner = !IS_PRO
      ? proGateBanner("The routine optimizer")
      : proErrorBanner("NOT_CONFIGURED", "");
    return (
      <ScreenScroll>
        <Text className="mb-1 text-2xl font-bold text-slate-900">Optimize your day</Text>
        <Text className="mb-4 text-sm text-slate-500">
          Tell Otto about a new routine and it proposes a reshaped day — you always confirm.
        </Text>
        <Banner tone={banner.tone} message={banner.text} />
        {!IS_PRO ? <UpgradeButton /> : null}
      </ScreenScroll>
    );
  }

  const handlePropose = (): void => {
    if (label.trim().length === 0) {
      setFormError("Give the new routine a name.");
      return;
    }
    const minutes = Number.parseInt(duration, 10);
    if (!Number.isFinite(minutes) || minutes < 5 || minutes > 480) {
      setFormError("Enter a duration in minutes between 5 and 480.");
      return;
    }
    setFormError(undefined);
    const newRoutine: NewRoutineRequest = {
      label: label.trim(),
      kind,
      durationMinutes: minutes,
      recurrence: RECURRENCE_OPTIONS[recurrenceIndex]!.value,
      preference: preference.trim() === "" ? undefined : preference.trim(),
    };
    void propose(newRoutine);
  };

  return (
    <ScreenScroll>
      <Text className="mb-1 text-2xl font-bold text-slate-900">Optimize your day</Text>
      <Text className="mb-4 text-sm text-slate-500">
        Describe a new routine. Otto proposes where it fits and what to shift — nothing changes
        until you apply.
      </Text>

      {status !== "proposed" && status !== "applied" ? (
        <Card title="New routine">
          <LabeledInput
            label="Name"
            value={label}
            onChangeText={setLabel}
            placeholder="e.g. Morning run"
          />
          <Text className="mb-1 text-sm font-medium text-slate-600">Kind</Text>
          <PillPicker
            options={KINDS}
            labelFor={(k) => k}
            isActive={(k) => k === kind}
            onSelect={setKind}
            accessibilityPrefix="Kind"
          />
          <LabeledInput
            label="Duration (minutes)"
            value={duration}
            onChangeText={setDuration}
            placeholder="30"
            keyboardType="numeric"
          />
          <Text className="mb-1 text-sm font-medium text-slate-600">How often</Text>
          <PillPicker
            options={RECURRENCE_OPTIONS}
            labelFor={(o) => o.label}
            isActive={(o) => o === RECURRENCE_OPTIONS[recurrenceIndex]}
            onSelect={(o) => setRecurrenceIndex(RECURRENCE_OPTIONS.indexOf(o))}
            accessibilityPrefix="How often"
          />
          <LabeledInput
            label="Preference (optional)"
            value={preference}
            onChangeText={setPreference}
            placeholder="e.g. mornings, not before 6am"
            multiline
          />
          {formError ? <Text className="mb-2 text-sm text-red-600">{formError}</Text> : null}
          <Button
            label="Propose a plan"
            onPress={handlePropose}
            disabled={status === "proposing"}
          />
        </Card>
      ) : null}

      {status === "proposing" ? <LoadingState label="Reshaping your day" /> : null}

      {status === "error" && error
        ? (() => {
            const banner = proErrorBanner(errorCode, error);
            return (
              <View>
                <Banner tone={banner.tone} message={banner.text} />
                <Button label="Back" variant="secondary" onPress={discard} />
              </View>
            );
          })()
        : null}

      {status === "applied" ? (
        <View>
          <Banner tone="info" message="Done — your routine has been updated." />
          <Button label="Optimize again" variant="secondary" onPress={discard} />
        </View>
      ) : null}

      {(status === "proposed" || status === "applying") && proposal ? (
        <View>
          <Card title="Otto's proposed plan">
            <Text className="text-base leading-6 text-slate-700">{proposal.summary}</Text>
          </Card>

          {proposal.changes.length === 0 ? (
            <EmptyState title="No changes needed" hint="Your day already fits this routine." />
          ) : (
            proposal.changes.map((change, index) => (
              <Card key={`change-${index}`}>
                <Text
                  className="text-base font-medium text-slate-900"
                  accessibilityLabel={`${describeChange(change)} — ${change.reason}`}
                >
                  {describeChange(change)}
                </Text>
                <Text className="mt-1 text-sm leading-5 text-slate-500">{change.reason}</Text>
              </Card>
            ))
          )}

          <Text className="mb-3 mt-1 text-xs text-slate-400">
            Otto proposes — nothing is saved until you apply this plan.
          </Text>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button
                label="Apply this plan"
                onPress={() => void apply()}
                disabled={status === "applying"}
              />
            </View>
            <View className="flex-1">
              <Button
                label="Not now"
                variant="secondary"
                onPress={discard}
                disabled={status === "applying"}
              />
            </View>
          </View>
        </View>
      ) : null}
    </ScreenScroll>
  );
}
