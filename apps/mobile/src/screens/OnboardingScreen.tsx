// First-run onboarding flow: Welcome → Consent → Routine Setup → main app. Owns
// the wizard shell (top row with back + progress dots + Skip, scrollable step
// body, bottom CTA) and renders each step's body inline. On finish it calls
// onComplete so the navigation root swaps to the tab navigator. Each step's data
// is persisted by its own hook/repository (consent, routine).
//
// Visual: OTTO onboarding flow (otto/app-screens.jsx OnboardingScreen), ported to
// RN inline styles via the design kit. NativeWind does not render on SDK 54, so
// every style is an RN style object. Data logic (useConsents / useRoutine) is
// unchanged — only the presentation is the inline-style design kit.
import { useState, type ReactNode } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type {
  DataSource,
  RoutineAnchor,
  RoutineAnchorKind,
} from "@otto/schemas";
import { useConsents } from "../hooks/useConsents";
import { useRoutine } from "../hooks/useRoutine";
import { AsyncBoundary } from "../components/AsyncBoundary";
import {
  Display,
  PrimaryButton,
  OToggle,
  AddButton,
  Field,
  TextField,
  ChoicePills,
  type Option,
} from "../design/kit";
import { Icon, type IconName } from "../design/Icon";
import { OC, FONT, RADIUS, toneColor, tint } from "../design/theme";
import { WelcomeStep, TeachStep, TEACH } from "../components/teaching";

// Flow: Welcome → 3 "how Otto works" teaching cards → Consent → Routine.
const CTA_LABELS = ["Show me how", "Next", "Next", "Set me up", "I agree", "Set my rhythm"] as const;
const STEP_COUNT = CTA_LABELS.length;

/** The free-tier sources we ask consent for, with plain-language what & why. */
const SOURCES: ReadonlyArray<{
  source: DataSource;
  title: string;
  description: string;
  purpose: string;
  icon: IconName;
  tone: string;
}> = [
  {
    source: "calendar",
    title: "Calendar & reminders",
    description: "Read your schedule to time things right",
    purpose: "Read calendar events to build your daily briefing",
    icon: "cal",
    tone: "sky",
  },
  {
    source: "finance",
    title: "Finance",
    description: "Bills, budget & income you enter",
    purpose: "Store and read your finances to track budget and bills",
    icon: "peso",
    tone: "green",
  },
  {
    source: "health",
    title: "Health data",
    description: "Most sensitive — off unless you say so",
    purpose: "Store and read medications to time dose reminders",
    icon: "heart",
    tone: "coral",
  },
];

const ANCHOR_KINDS: readonly RoutineAnchorKind[] = [
  "wake",
  "meds",
  "meal",
  "work",
  "exercise",
  "wind-down",
  "sleep",
  "custom",
];

const KIND_OPTIONS: Option[] = ANCHOR_KINDS.map((kind) => ({ k: kind, l: kind }));

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

// Welcome + "how Otto works" teaching cards are shared with the Settings tour
// (components/teaching). Consent + Routine setup steps stay here.

// ─────────── Step 1 · Consent ───────────
function ConsentStep(): React.JSX.Element {
  const { state, error, isGranted, setConsent, reload } = useConsents();

  return (
    <View style={{ paddingTop: 6 }}>
      <Display style={{ fontSize: 26 }}>What can I look at?</Display>
      <Text
        style={{
          marginTop: 8,
          marginBottom: 18,
          fontFamily: FONT.body,
          fontSize: 14,
          lineHeight: 21,
          color: OC.ink500,
        }}
      >
        You choose, per source. Turn any of these off anytime — nothing is ever used for ads.
      </Text>

      <AsyncBoundary state={state} error={error} onRetry={reload} loadingLabel="Loading consent">
        {SOURCES.map((s, index) => {
          const accent = toneColor(s.tone);
          const on = isGranted(s.source);
          return (
            <View
              key={s.source}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 13,
                paddingVertical: 14,
                borderBottomWidth: index < SOURCES.length - 1 ? 1 : 0,
                borderBottomColor: OC.line,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: tint(accent),
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name={s.icon} size={19} color={accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: FONT.bodyBold, fontSize: 14.5, color: OC.ink }}>
                  {s.title}
                </Text>
                <Text style={{ marginTop: 1, fontFamily: FONT.body, fontSize: 12, color: OC.ink500 }}>
                  {s.description}
                </Text>
              </View>
              <OToggle on={on} onToggle={() => void setConsent(s.source, !on, s.purpose)} />
            </View>
          );
        })}

        <View
          style={{
            marginTop: 16,
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 9,
            backgroundColor: OC.mist,
            borderRadius: RADIUS.inner,
            paddingHorizontal: 14,
            paddingVertical: 12,
          }}
        >
          <View style={{ marginTop: 1 }}>
            <Icon name="lock" size={17} color={OC.green} />
          </View>
          <Text
            style={{
              flex: 1,
              fontFamily: FONT.body,
              fontSize: 12.5,
              lineHeight: 19,
              color: OC.forest,
            }}
          >
            Encrypted on your device and never sold or used for ads. Every access to health and finance
            data is logged for your records.
          </Text>
        </View>
      </AsyncBoundary>
    </View>
  );
}

// ─────────── Step 2 · Routine anchors ───────────
function RoutineStep(): React.JSX.Element {
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
    <View style={{ paddingTop: 6 }}>
      <Display style={{ fontSize: 26 }}>When&apos;s your day?</Display>
      <Text
        style={{
          marginTop: 8,
          marginBottom: 18,
          fontFamily: FONT.body,
          fontSize: 14,
          lineHeight: 21,
          color: OC.ink500,
        }}
      >
        A few anchors so reminders land at the right moment — not random times. I&apos;ll learn the
        rest.
      </Text>

      <AsyncBoundary state={state} error={error} onRetry={reload} loadingLabel="Loading routine">
        {needsSetup ? (
          <View
            style={{
              borderRadius: RADIUS.inner,
              backgroundColor: OC.mist,
              paddingHorizontal: 16,
              paddingVertical: 16,
            }}
          >
            <Text
              style={{ fontFamily: FONT.body, fontSize: 13.5, lineHeight: 20, color: OC.forest }}
            >
              Start with a few defaults — wake, meds, lunch, wind-down and sleep. Everything is
              editable.
            </Text>
            <PrimaryButton
              label="Add starter anchors"
              onPress={() => void seedDefaults()}
              style={{ marginTop: 14 }}
            />
          </View>
        ) : (
          <>
            {sorted.map((anchor: RoutineAnchor, index) => (
              <View
                key={anchor.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 13,
                  paddingVertical: 13,
                  borderBottomWidth: index < sorted.length - 1 ? 1 : 0,
                  borderBottomColor: OC.line,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: OC.mist,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name={KIND_ICON[anchor.kind]} size={19} color={OC.green} />
                </View>
                <Text style={{ flex: 1, fontFamily: FONT.bodyBold, fontSize: 15, color: OC.ink }}>
                  {anchor.label}
                </Text>
                <View
                  style={{
                    backgroundColor: OC.mist,
                    borderRadius: 10,
                    paddingHorizontal: 13,
                    paddingVertical: 5,
                  }}
                >
                  <Text style={{ fontFamily: FONT.display, fontSize: 20, color: OC.green }}>
                    {anchor.time}
                  </Text>
                </View>
                <Pressable
                  onPress={() => void removeAnchor(anchor.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${anchor.label}`}
                  hitSlop={8}
                  style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                >
                  <Icon name="x" size={18} color={OC.ink400} />
                </Pressable>
              </View>
            ))}

            {showForm ? (
              <View style={{ marginTop: 16 }}>
                {formError ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "flex-start",
                      gap: 9,
                      backgroundColor: OC.amberBg,
                      borderRadius: RADIUS.inner,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      marginBottom: 16,
                    }}
                  >
                    <View style={{ marginTop: 1 }}>
                      <Icon name="bell" size={16} color={OC.amber} />
                    </View>
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
                <Field label="Name">
                  <TextField value={label} onChangeText={setLabel} placeholder="e.g. Lunch" />
                </Field>
                <Field label="Kind">
                  <ChoicePills
                    options={KIND_OPTIONS}
                    value={kind}
                    onChange={(k) => setKind(k as RoutineAnchorKind)}
                  />
                </Field>
                <Field label="Time (HH:mm)">
                  <TextField value={time} onChangeText={setTime} placeholder="12:30" />
                </Field>
                <PrimaryButton label="Add anchor" onPress={handleAdd} icon="check" />
              </View>
            ) : (
              <AddButton label="Add an anchor" onPress={() => setShowForm(true)} />
            )}
          </>
        )}
      </AsyncBoundary>
    </View>
  );
}

export function OnboardingScreen({ onComplete }: { onComplete: () => void }): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);

  const next = (): void => {
    if (step < STEP_COUNT - 1) setStep((s) => s + 1);
    else onComplete();
  };

  // 0 = welcome · 1..3 = teaching cards · 4 = consent · 5 = routine
  let stepBody: ReactNode;
  if (step === 0) {
    stepBody = <WelcomeStep />;
  } else if (step <= TEACH.length) {
    const t = TEACH[step - 1];
    stepBody = t ? <TeachStep title={t.title} body={t.body} art={t.art} /> : null;
  } else if (step === TEACH.length + 1) {
    stepBody = <ConsentStep />;
  } else {
    stepBody = <RoutineStep />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: OC.paper }}>
      {/* Top row: back chevron (step > 0) · progress dots · Skip */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          paddingHorizontal: 18,
          paddingTop: insets.top + 6,
          paddingBottom: 6,
        }}
      >
        {step > 0 ? (
          <Pressable
            onPress={() => setStep((s) => Math.max(0, s - 1))}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              borderRadius: 11,
              backgroundColor: OC.surface,
              borderWidth: 1,
              borderColor: OC.line,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Icon name="chevL" size={19} color={OC.ink700} />
          </Pressable>
        ) : (
          <View style={{ width: 36 }} />
        )}

        <View style={{ flex: 1, flexDirection: "row", gap: 6, justifyContent: "center" }}>
          {Array.from({ length: STEP_COUNT }, (_, i) => (
            <View
              key={i}
              style={{
                width: i === step ? 22 : 7,
                height: 7,
                borderRadius: 99,
                backgroundColor: i === step ? OC.green : OC.lineStrong,
              }}
            />
          ))}
        </View>

        <Pressable
          onPress={onComplete}
          accessibilityRole="button"
          accessibilityLabel="Skip onboarding"
          style={({ pressed }) => ({ width: 36, alignItems: "flex-end", opacity: pressed ? 0.6 : 1 })}
        >
          <Text style={{ fontFamily: FONT.bodyBold, fontSize: 12.5, color: OC.ink400 }}>Skip</Text>
        </Pressable>
      </View>

      {/* Step body */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 8, paddingHorizontal: 22, paddingBottom: 20 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {stepBody}
      </ScrollView>

      {/* Bottom CTA */}
      <View
        style={{
          paddingHorizontal: 22,
          paddingTop: 12,
          paddingBottom: insets.bottom + 16,
        }}
      >
        <PrimaryButton label={CTA_LABELS[step]!} onPress={next} />
      </View>
    </View>
  );
}
