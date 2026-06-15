// Routine Optimizer (story 6.x / FR-O1) — the propose-and-confirm surface for
// reshaping the day. Describe a new routine; Otto proposes a reshaped day with
// per-change reasoning. NOTHING changes until the user taps "Apply to my day"
// (CLAUDE.md §1.11, spec §6.1). Presentational — all logic lives in useOptimizer
// / apply-optimization.
//
// Pro-gated: when not Pro (or the backend is unconfigured / 401 / 403) a calm
// ProGate / banner shows instead of the form. Nothing ever crashes.
//
// Visual: OTTO Optimizer design — Otto's bubble, the focus-emerald input + chips,
// the thinking pulse, the proposed reshaped day as a TimelineRow card, the "Why
// this works" mint note, Adjust / Apply, and the applied success state.
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NewRoutineRequest, ScheduleChange } from "@otto/schemas";
import { useOptimizer } from "../hooks/useOptimizer";
import { Banner, Card, Icon, OC, type IconName, type OttoTone } from "../components/ui";
import { OttoAvatar, ProGate, ScreenContainer, TimelineRow } from "../components/otto-ui";
import { getApiBaseUrl } from "../lib/api-client";
import { IS_PRO } from "../lib/constants";
import { proErrorBanner } from "../lib/pro-feature";

/** Example routines offered as one-tap chips (match the design's examples). */
const EXAMPLE_CHIPS: readonly string[] = [
  "A 30-min workout, mornings, 4×/week",
  "Read before bed, 20 min",
  "Call my mom every Sunday",
];

/** Icon + tone for a proposed change row (added = exercise/green, kept = sky). */
function changeStyle(change: ScheduleChange): { icon: IconName; tone: OttoTone } {
  if (change.action === "add") return { icon: "dumbbell", tone: "green" };
  if (change.action === "move") return { icon: "clock", tone: "green" };
  return { icon: "cal", tone: "sky" };
}

/** A short suffix describing the change ("new" / "moved" / "unchanged"). */
function changeSub(change: ScheduleChange): string {
  if (change.action === "add") return "New in your day";
  if (change.action === "move") return change.fromTime ? `Moved from ${change.fromTime}` : "Moved";
  return "Unchanged";
}

type OptimizerNavigation = {
  goBack: () => void;
  navigate: (screen: "Upgrade") => void;
};

export function OptimizerScreen(): React.JSX.Element {
  const navigation = useNavigation() as unknown as OptimizerNavigation;
  const { status, proposal, error, errorCode, propose, apply, discard } = useOptimizer();

  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const hasText = text.trim() !== "";
  const thinking = status === "proposing";
  const configured = getApiBaseUrl() !== null;

  const BackHeader = (
    <View className="flex-row items-center gap-2 px-[18px] pb-1.5 pt-2">
      <Pressable
        onPress={() => navigation.goBack()}
        accessibilityRole="button"
        accessibilityLabel="Back"
        className="h-[38px] w-[38px] items-center justify-center rounded-inner border border-line bg-surface"
      >
        <Icon name="chevL" size={20} color={OC.ink700} />
      </Pressable>
      <Text className="font-display text-[19px] text-ink">Routine optimizer</Text>
    </View>
  );

  // Pre-request gate: not entitled or no backend → calm message, no form.
  if (!IS_PRO || !configured) {
    return (
      <ScreenContainer>
        {BackHeader}
        <View className="mt-4">
          {!IS_PRO ? (
            <ProGate
              title="The optimizer is a Pro power"
              body="Tell Otto what to make room for and it reshapes your day with reasoning — then waits for your yes."
              onUpgrade={() => navigation.navigate("Upgrade")}
            />
          ) : (
            <Banner tone="info" message={proErrorBanner("NOT_CONFIGURED", "").text} />
          )}
        </View>
      </ScreenContainer>
    );
  }

  const handleRun = (value?: string): void => {
    const next = value ?? text;
    if (value !== undefined) setText(value);
    if (next.trim() === "") return;
    // The hook needs a structured NewRoutineRequest; we capture the user's words
    // as the label + preference and default the rest. The proxy reasons over it.
    const newRoutine: NewRoutineRequest = {
      label: next.trim().slice(0, 80),
      kind: "exercise",
      durationMinutes: 30,
      recurrence: { freq: "daily" },
      preference: next.trim(),
    };
    void propose(newRoutine);
  };

  return (
    <ScreenContainer>
      {BackHeader}

      {status === "applied" ? (
        <View className="mt-8 items-center">
          <View className="h-16 w-16 items-center justify-center rounded-card bg-mist">
            <Icon name="check" size={32} color={OC.green} />
          </View>
          <Text className="mt-3.5 font-display text-[21px] text-ink">
            Your day&apos;s reshaped.
          </Text>
          <Text className="mt-1.5 text-center font-body text-[14px] leading-[21px] text-ink-500">
            It&apos;s in. Otto will adapt the times as it learns when you actually move.
          </Text>
          <Pressable
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Back to Today"
            className="mt-5 rounded-btn bg-green px-6 py-3.5"
          >
            <Text className="font-body-extra text-[14.5px] text-white">Back to Today</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {/* Otto's bubble */}
          <View className="mt-3 flex-row items-start gap-3">
            <OttoAvatar />
            <View className="flex-1 rounded-[6px_18px_18px_18px] border border-line bg-surface px-4 py-3.5">
              <Text className="font-body text-[14.5px] leading-[22px] text-ink-700">
                What do you want to make room for? I&apos;ll work around what&apos;s already fixed.
              </Text>
            </View>
          </View>

          {/* Input */}
          <View
            className="mt-4 rounded-card bg-surface px-4 py-3.5"
            style={{ borderWidth: 2, borderColor: thinking || focused ? OC.emerald : OC.line }}
          >
            <TextInput
              value={text}
              onChangeText={setText}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="e.g. A 30-min workout, mornings, 4× a week"
              placeholderTextColor={OC.ink400}
              multiline
              editable={!thinking}
              className="min-h-[44px] font-body text-[15.5px] leading-[22px] text-ink"
              accessibilityLabel="What do you want to make room for?"
            />
            <View className="mt-1.5 flex-row justify-end">
              <Pressable
                onPress={() => handleRun()}
                disabled={!hasText || thinking}
                accessibilityRole="button"
                accessibilityLabel="Reshape my day"
                className={`rounded-btn px-4 py-2.5 ${hasText && !thinking ? "bg-green" : "bg-line"}`}
              >
                <Text className="font-body-extra text-[13.5px] text-white">
                  {thinking ? "Reshaping…" : "Reshape my day"}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Chips */}
          <View className="mt-3 flex-row flex-wrap gap-2">
            {EXAMPLE_CHIPS.map((chip) => (
              <Pressable
                key={chip}
                onPress={() => handleRun(chip)}
                disabled={thinking}
                accessibilityRole="button"
                accessibilityLabel={chip}
                className="rounded-pill bg-mist px-3 py-2"
              >
                <Text className="font-body-bold text-[12.5px] text-forest">{chip}</Text>
              </Pressable>
            ))}
          </View>

          {/* Thinking */}
          {thinking ? (
            <View className="mt-6 flex-row items-center justify-center gap-2.5">
              <View className="h-2.5 w-2.5 rounded-full bg-emerald" />
              <Text className="font-body-semibold text-[14px] text-ink-500">
                Reading your routine &amp; calendar…
              </Text>
            </View>
          ) : null}

          {/* Error */}
          {status === "error" && error ? (
            <View className="mt-5">
              <Banner
                tone={proErrorBanner(errorCode, error).tone}
                message={proErrorBanner(errorCode, error).text}
              />
              <Pressable
                onPress={discard}
                accessibilityRole="button"
                accessibilityLabel="Back"
                className="mt-2 items-center rounded-btn border-[1.5px] border-line-strong py-3"
              >
                <Text className="font-body-bold text-[14.5px] text-ink-700">Back</Text>
              </Pressable>
            </View>
          ) : null}

          {/* Proposal */}
          {(status === "proposed" || status === "applying") && proposal ? (
            <View className="mt-5">
              <Text className="mb-2.5 font-mono-bold text-[10.5px] uppercase tracking-[1px] text-ink-400">
                Otto proposes a reshaped day
              </Text>
              <Card pad="px-4 py-3.5">
                {proposal.changes.map((change, index) => {
                  const style = changeStyle(change);
                  return (
                    <TimelineRow
                      key={`change-${index}`}
                      time={change.toTime}
                      icon={style.icon}
                      tone={style.tone}
                      title={change.label}
                      sub={changeSub(change)}
                      last={index === proposal.changes.length - 1}
                    />
                  );
                })}
              </Card>

              <View className="mt-3 rounded-inner bg-mist px-3.5 py-3">
                <Text className="font-body text-[13px] leading-[19px] text-forest">
                  <Text className="font-body-bold">Why this works: </Text>
                  {proposal.summary}
                </Text>
              </View>

              <View className="mt-3.5 flex-row gap-2.5">
                <Pressable
                  onPress={discard}
                  disabled={status === "applying"}
                  accessibilityRole="button"
                  accessibilityLabel="Adjust"
                  className="flex-1 items-center rounded-btn border-[1.5px] border-line-strong py-3.5"
                >
                  <Text className="font-body-bold text-[14.5px] text-ink-700">Adjust</Text>
                </Pressable>
                <Pressable
                  onPress={() => void apply()}
                  disabled={status === "applying"}
                  accessibilityRole="button"
                  accessibilityLabel="Apply to my day"
                  style={{ flex: 1.5 }}
                  className="flex-row items-center justify-center gap-2 rounded-btn bg-green py-3.5"
                >
                  <Icon name="check" size={18} color="#fff" />
                  <Text className="font-body-extra text-[14.5px] text-white">
                    {status === "applying" ? "Applying…" : "Apply to my day"}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </>
      )}
    </ScreenContainer>
  );
}
