// Routine Optimizer (story 6.x / FR-O1) — the propose-and-confirm surface for
// reshaping the day. Describe a new routine; Otto proposes a reshaped day with
// per-change reasoning. NOTHING changes until the user taps "Apply to my day"
// (CLAUDE.md §1.11, spec §6.1). Presentational — all logic lives in useOptimizer
// / apply-optimization.
//
// Pro-gated: when not Pro (or the backend is unconfigured / 401 / 403) a calm
// ProGate / banner shows instead of the form. Nothing ever crashes.
//
// Visual: OTTO Optimizer design — Otto's voice prompt, the focus-emerald input +
// chips, the thinking pulse, the proposed reshaped day as a TLRow card, the "Why
// this works" mint note, Adjust / Apply, and the applied success state. Ported to
// the inline-style design kit (reliable on SDK 54, unlike the prior NativeWind
// pass) — logic unchanged.
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NewRoutineRequest, ScheduleChange } from "@otto/schemas";
import { useOptimizer } from "../hooks/useOptimizer";
import {
  Card,
  OttoVoice,
  OverlayScreen,
  PrimaryButton,
  ProGate,
  Display,
  TLRow,
} from "../design/kit";
import { Icon, type IconName } from "../design/Icon";
import { OC, FONT, RADIUS, eyebrow } from "../design/theme";
import { getApiBaseUrl } from "../lib/api-client";
import { useAuth } from "../auth/AuthProvider";
import { proErrorBanner } from "../lib/pro-feature";
import { t } from "../i18n";

/** Example routines offered as one-tap chips (match the design's examples). */
const EXAMPLE_CHIPS: readonly string[] = [
  t("assistant.optimizer.chips.workout"),
  t("assistant.optimizer.chips.read"),
  t("assistant.optimizer.chips.call"),
];

/** Icon + tone for a proposed change row (added = exercise/green, kept = sky). */
function changeStyle(change: ScheduleChange): { icon: IconName; tone: string } {
  if (change.action === "add") return { icon: "dumbbell", tone: "green" };
  if (change.action === "move") return { icon: "clock", tone: "green" };
  return { icon: "cal", tone: "sky" };
}

/** A short suffix describing the change ("new" / "moved" / "unchanged"). */
function changeSub(change: ScheduleChange): string {
  if (change.action === "add") return t("assistant.optimizer.change.added");
  if (change.action === "move") return change.fromTime ? t("assistant.optimizer.change.movedFrom", { time: change.fromTime }) : t("assistant.optimizer.change.moved");
  return t("assistant.optimizer.change.unchanged");
}

type OptimizerNavigation = {
  goBack: () => void;
  navigate: (screen: "Upgrade") => void;
};

export function OptimizerScreen(): React.JSX.Element {
  const navigation = useNavigation() as unknown as OptimizerNavigation;
  const { isPro } = useAuth();
  const { status, proposal, error, errorCode, propose, apply, discard } = useOptimizer();

  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const hasText = text.trim() !== "";
  const thinking = status === "proposing";
  const configured = getApiBaseUrl() !== null;

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
    <OverlayScreen title={t("assistant.optimizer.title")} onBack={() => navigation.goBack()}>
      {/* Pre-request gate: not entitled or no backend → calm message, no form. */}
      {!isPro || !configured ? (
        <View style={{ marginTop: 8 }}>
          {!isPro ? (
            <ProGate onUpgrade={() => navigation.navigate("Upgrade")}>
              <Display style={{ fontSize: 19, color: "#fff", lineHeight: 23 }}>
                {t("assistant.optimizer.proGate.title")}
              </Display>
              <Text
                style={{ fontSize: 13.5, color: OC.sage, marginTop: 6, lineHeight: 20, fontFamily: FONT.body }}
              >
                {t("assistant.optimizer.proGate.body")}
              </Text>
            </ProGate>
          ) : (
            <Card>
              <Text
                style={{ fontFamily: FONT.bodySemi, fontSize: 13.5, lineHeight: 20, color: OC.skyInk }}
              >
                {proErrorBanner("NOT_CONFIGURED", "").text}
              </Text>
            </Card>
          )}
        </View>
      ) : status === "applied" ? (
        /* Applied success state */
        <View style={{ marginTop: 24, alignItems: "center" }}>
          <View
            style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: OC.mist, alignItems: "center", justifyContent: "center", marginBottom: 14 }}
          >
            <Icon name="check" size={32} color={OC.green} stroke={2.6} />
          </View>
          <Display style={{ fontSize: 21, textAlign: "center" }}>{t("assistant.optimizer.applied.title")}</Display>
          <Text
            style={{ fontSize: 14, color: OC.ink500, marginTop: 6, lineHeight: 21, textAlign: "center", fontFamily: FONT.body }}
          >
            {t("assistant.optimizer.applied.body")}
          </Text>
          <Pressable
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel={t("assistant.optimizer.applied.backToToday")}
            style={({ pressed }) => [
              { marginTop: 18, backgroundColor: OC.green, borderRadius: RADIUS.btn, paddingVertical: 13, paddingHorizontal: 24, opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <Text style={{ color: "#fff", fontFamily: FONT.bodyX, fontSize: 14.5 }}>{t("assistant.optimizer.applied.backToToday")}</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {/* Otto's voice prompt */}
          <View style={{ marginTop: 4 }}>
            <OttoVoice tone="light">
              {t("assistant.optimizer.prompt")}
            </OttoVoice>
          </View>

          {/* Input — emerald border while thinking or focused */}
          <View
            style={{ marginTop: 16, backgroundColor: OC.surface, borderRadius: RADIUS.card, borderWidth: 2, borderColor: thinking || focused ? OC.emerald : OC.line, paddingHorizontal: 16, paddingVertical: 14 }}
          >
            <TextInput
              value={text}
              onChangeText={setText}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={t("assistant.optimizer.placeholder")}
              placeholderTextColor={OC.ink400}
              multiline
              editable={!thinking}
              style={{ minHeight: 44, fontFamily: FONT.body, fontSize: 15.5, lineHeight: 22, color: OC.ink, padding: 0 }}
              accessibilityLabel={t("assistant.optimizer.inputLabel")}
            />
            <View style={{ marginTop: 6, flexDirection: "row", justifyContent: "flex-end" }}>
              <Pressable
                onPress={() => handleRun()}
                disabled={!hasText || thinking}
                accessibilityRole="button"
                accessibilityLabel={t("assistant.optimizer.run")}
                style={({ pressed }) => [
                  { backgroundColor: hasText && !thinking ? OC.green : OC.line, borderRadius: 11, paddingHorizontal: 16, paddingVertical: 9, opacity: pressed && hasText && !thinking ? 0.9 : 1 },
                ]}
              >
                <Text style={{ color: "#fff", fontFamily: FONT.bodyX, fontSize: 13.5 }}>
                  {thinking ? t("assistant.optimizer.running") : t("assistant.optimizer.run")}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Chips */}
          <View style={{ marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {EXAMPLE_CHIPS.map((chip) => (
              <Pressable
                key={chip}
                onPress={() => handleRun(chip)}
                disabled={thinking}
                accessibilityRole="button"
                accessibilityLabel={chip}
                style={({ pressed }) => [
                  { backgroundColor: OC.mist, borderRadius: RADIUS.pill, paddingHorizontal: 13, paddingVertical: 8, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Text style={{ color: OC.forest, fontFamily: FONT.bodyBold, fontSize: 12.5 }}>{chip}</Text>
              </Pressable>
            ))}
          </View>

          {/* Thinking pulse */}
          {thinking ? (
            <View style={{ marginTop: 24, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <View style={{ width: 9, height: 9, borderRadius: 99, backgroundColor: OC.emerald }} />
              <Text style={{ fontFamily: FONT.bodySemi, fontSize: 14, color: OC.ink500 }}>
                {t("assistant.optimizer.reading")}
              </Text>
            </View>
          ) : null}

          {/* Error */}
          {status === "error" && error ? (
            <View style={{ marginTop: 20 }}>
              <Card>
                <Text
                  style={{ fontFamily: FONT.bodySemi, fontSize: 13.5, lineHeight: 20, color: OC.coralInk }}
                >
                  {proErrorBanner(errorCode, error).text}
                </Text>
              </Card>
              <Pressable
                onPress={discard}
                accessibilityRole="button"
                accessibilityLabel={t("assistant.optimizer.back")}
                style={({ pressed }) => [
                  { marginTop: 8, alignItems: "center", borderRadius: RADIUS.btn, borderWidth: 1.5, borderColor: OC.lineStrong, paddingVertical: 13, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Text style={{ fontFamily: FONT.bodyBold, fontSize: 14.5, color: OC.ink700 }}>{t("assistant.optimizer.back")}</Text>
              </Pressable>
            </View>
          ) : null}

          {/* Proposal */}
          {(status === "proposed" || status === "applying") && proposal ? (
            <View style={{ marginTop: 22 }}>
              <Text style={[eyebrow, { fontSize: 10.5, marginBottom: 10 }]}>
                {t("assistant.optimizer.proposalEyebrow")}
              </Text>
              <Card pad={16}>
                {proposal.changes.map((change, index) => {
                  const s = changeStyle(change);
                  return (
                    <TLRow
                      key={`change-${index}`}
                      time={change.toTime}
                      icon={s.icon}
                      tone={s.tone}
                      title={change.label}
                      sub={changeSub(change)}
                      last={index === proposal.changes.length - 1}
                    />
                  );
                })}
              </Card>

              <View
                style={{ marginTop: 12, backgroundColor: OC.mist, borderRadius: RADIUS.inner, paddingHorizontal: 14, paddingVertical: 12 }}
              >
                <Text style={{ fontFamily: FONT.body, fontSize: 13, lineHeight: 20, color: OC.forest }}>
                  <Text style={{ fontFamily: FONT.bodyBold }}>{t("assistant.optimizer.why")}</Text>
                  {proposal.summary}
                </Text>
              </View>

              <View style={{ marginTop: 14, flexDirection: "row", gap: 10 }}>
                <Pressable
                  onPress={discard}
                  disabled={status === "applying"}
                  accessibilityRole="button"
                  accessibilityLabel={t("assistant.optimizer.adjust")}
                  style={({ pressed }) => [
                    { flex: 1, alignItems: "center", borderRadius: RADIUS.btn, borderWidth: 1.5, borderColor: OC.lineStrong, paddingVertical: 13, opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <Text style={{ fontFamily: FONT.bodyBold, fontSize: 14.5, color: OC.ink700 }}>{t("assistant.optimizer.adjust")}</Text>
                </Pressable>
                <PrimaryButton
                  label={status === "applying" ? t("assistant.optimizer.applying") : t("assistant.optimizer.apply")}
                  icon="check"
                  onPress={() => void apply()}
                  disabled={status === "applying"}
                  style={{ flex: 1.5, paddingVertical: 13 }}
                />
              </View>
            </View>
          ) : null}
        </>
      )}
    </OverlayScreen>
  );
}
