// Quick Add (story 5.x). Type what's on your mind in natural language; Otto's
// brain turns it into confirmable proposals. Accept applies it locally; Dismiss
// drops it. Presentational — all logic lives in useQuickAdd / apply-proposal.
//
// Free-tier: quick-add has a small daily quota server-side. A spent quota (403)
// or rate-limit (429) shows an upgrade / try-later banner; an unconfigured or
// signed-out backend shows a calm sign-in message. Nothing ever crashes.
//
// Visual: OTTO Quick add design (otto/app-screens.jsx QuickAddScreen), ported to
// RN inline styles via the design kit — Otto's light intro bubble, the
// focus-emerald input with an inline "Ask Otto" button + quota text, example
// chips, the "Reading your routine & money…" pulse, and proposals as
// ProposalCards. Data logic is unchanged (useQuickAdd); only the look changed.
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import type { Proposal, ProposalAction } from "@otto/schemas";
import { useRepositoryDeps } from "../hooks/useRepositoryDeps";
import { useQuickAdd } from "../hooks/useQuickAdd";
import { summarizeAction } from "../components/ProposalCard";
import { Screen, AppHeader, OttoVoice, ProposalCard, EmptyState } from "../design/kit";
import { Icon, type IconName } from "../design/Icon";
import { OC, FONT, RADIUS } from "../design/theme";
import { UpgradeButton } from "../components/UpgradeButton";
import { getApiBaseUrl, type ApiErrorCode } from "../lib/api-client";
import { useAuth } from "../auth/AuthProvider";
import { useUpgradeNavigation } from "../hooks/useUpgradeNavigation";
import { useSettingsNavigation } from "../hooks/useSettingsNavigation";

/** Example prompts offered as one-tap chips (match the design's examples). */
const EXAMPLE_CHIPS: readonly string[] = [
  "Pay Meralco ₱2,480 on Saturday",
  "Gym Mon/Wed/Fri at 6am",
  "Dinner with Mom Friday 7pm",
];

/** Icon + accent tone per proposal type, matching the design's proposal cards. */
const ACTION_ICON: Record<ProposalAction["type"], { icon: IconName; tone: string }> = {
  create_reminder: { icon: "bell", tone: "green" },
  log_expense: { icon: "peso", tone: "green" },
  add_bill: { icon: "wallet", tone: "amber" },
  add_medication: { icon: "pill", tone: "green" },
  block_time: { icon: "cal", tone: "sky" },
  add_routine_anchor: { icon: "dumbbell", tone: "green" },
  add_note: { icon: "sparkle", tone: "sky" },
};

/**
 * Map a write-back proposal to the kit's ProposalCard props (icon/tone/title/
 * detail) — the same approach TodayScreen uses. Title is the plain-language
 * summary; detail is the model's rationale.
 */
function proposalDisplay(proposal: Proposal): {
  icon: IconName;
  tone: string;
  title: string;
  detail?: string;
} {
  const { icon, tone } = ACTION_ICON[proposal.action.type];
  return { icon, tone, title: summarizeAction(proposal.action), detail: proposal.rationale };
}

/** Map an error code to a banner tone + message for the quick-add surface. */
function errorBanner(
  code: ApiErrorCode | undefined,
  message: string,
): {
  tone: "info" | "warning";
  text: string;
} {
  switch (code) {
    case "FORBIDDEN":
      return { tone: "warning", text: `${message} Upgrade to Pro for unlimited quick-add.` };
    case "RATE_LIMITED":
      return { tone: "warning", text: "Too many requests — give it a moment and try again." };
    case "UNAUTHORIZED":
      return { tone: "info", text: "Sign in to use Otto's brain. (Pro feature.)" };
    case "NOT_CONFIGURED":
      return { tone: "info", text: "Otto's cloud brain isn't set up in this build yet." };
    default:
      return { tone: "warning", text: message };
  }
}

/** A calm inline banner (info = mist/green, warning = amber). */
function Banner({ tone, message }: { tone: "info" | "warning"; message: string }): React.JSX.Element {
  const info = tone === "info";
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
        borderRadius: RADIUS.inner,
        backgroundColor: info ? OC.mist : OC.amberBg,
        paddingHorizontal: 15,
        paddingVertical: 13,
      }}
    >
      <View style={{ marginTop: 1 }}>
        <Icon name={info ? "sparkle" : "bell"} size={18} color={info ? OC.green : OC.amber} />
      </View>
      <Text
        style={{
          flex: 1,
          fontFamily: FONT.bodySemi,
          fontSize: 13,
          lineHeight: 19,
          color: info ? OC.ink700 : OC.amberInk,
        }}
      >
        {message}
      </Text>
    </View>
  );
}

export function QuickAddScreen(): React.JSX.Element {
  const deps = useRepositoryDeps();
  const { isPro } = useAuth();
  const goToUpgrade = useUpgradeNavigation();
  const goToSettings = useSettingsNavigation();
  const { status, proposals, error, errorCode, applyingId, submit, accept, dismiss } =
    useQuickAdd(deps);
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const configured = getApiBaseUrl() !== null;
  const thinking = status === "submitting";
  const hasText = text.trim() !== "";
  const active = hasText && !thinking;

  const handleSubmit = (value?: string): void => {
    const next = value ?? text;
    if (value !== undefined) setText(value);
    void submit(next);
  };

  return (
    <Screen>
      <AppHeader title="Quick add" sub="Tell Otto in plain words" isPro={isPro} onUpgrade={goToUpgrade} onSettings={goToSettings} />

      <View style={{ paddingHorizontal: 18 }}>
        {/* Otto's intro bubble */}
        <View style={{ marginTop: 12 }}>
          <OttoVoice tone="light">
            What can I take off your plate? A bill, a dose, a plan — say it however you&apos;d say it
            to a friend.
          </OttoVoice>
        </View>

        {!configured ? (
          <View style={{ marginTop: 14 }}>
            <Banner
              tone="info"
              message="Otto's cloud brain isn't set up in this build. Quick add needs the Pro backend."
            />
          </View>
        ) : null}

        {/* Ask-Otto input with focus-emerald border */}
        <View
          style={{
            marginTop: 18,
            backgroundColor: OC.surface,
            borderRadius: 18,
            borderWidth: 2,
            borderColor: thinking || focused ? OC.emerald : OC.line,
            paddingHorizontal: 16,
            paddingVertical: 14,
          }}
        >
          <TextInput
            value={text}
            onChangeText={setText}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="e.g. Pay Meralco ₱2,480 on Saturday"
            placeholderTextColor={OC.ink400}
            multiline
            editable={!thinking}
            style={{
              minHeight: 44,
              fontFamily: FONT.body,
              fontSize: 15.5,
              lineHeight: 22,
              color: OC.ink,
              padding: 0,
            }}
            accessibilityLabel="What would you like to add?"
          />
          <View
            style={{
              marginTop: 8,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text style={{ fontFamily: FONT.bodySemi, fontSize: 11.5, color: OC.ink400 }}>
              {isPro ? "Unlimited" : "A few free each day"}
            </Text>
            <Pressable
              onPress={() => handleSubmit()}
              disabled={!active}
              accessibilityRole="button"
              accessibilityLabel="Ask Otto"
              style={({ pressed }) => [
                {
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  backgroundColor: active ? OC.green : OC.line,
                  borderRadius: 11,
                  paddingHorizontal: 16,
                  paddingVertical: 9,
                  opacity: pressed && active ? 0.9 : 1,
                },
              ]}
            >
              <Text style={{ fontFamily: FONT.bodyX, fontSize: 13.5, color: "#fff" }}>
                {thinking ? "Otto's thinking…" : "Ask Otto"}
              </Text>
              {!thinking ? <Icon name="arrowR" size={15} color="#fff" /> : null}
            </Pressable>
          </View>
        </View>

        {/* Example chips */}
        <View style={{ marginTop: 14, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {EXAMPLE_CHIPS.map((chip) => (
            <Pressable
              key={chip}
              onPress={() => handleSubmit(chip)}
              disabled={thinking}
              accessibilityRole="button"
              accessibilityLabel={chip}
              style={({ pressed }) => [
                {
                  backgroundColor: OC.mist,
                  borderRadius: RADIUS.pill,
                  paddingHorizontal: 13,
                  paddingVertical: 8,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Text style={{ fontFamily: FONT.bodyBold, fontSize: 12.5, color: OC.forest }}>
                {chip}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Thinking state */}
        {thinking ? (
          <View
            style={{
              marginTop: 20,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
            }}
          >
            <View style={{ width: 9, height: 9, borderRadius: 99, backgroundColor: OC.emerald }} />
            <Text style={{ fontFamily: FONT.bodySemi, fontSize: 14, color: OC.ink500 }}>
              Reading your routine &amp; money…
            </Text>
          </View>
        ) : null}

        {/* Error */}
        {status === "error" && error
          ? (() => {
              const banner = errorBanner(errorCode, error);
              const isProGate = errorCode === "FORBIDDEN" || errorCode === "UNAUTHORIZED";
              return (
                <View style={{ marginTop: 20 }}>
                  <Banner tone={banner.tone} message={banner.text} />
                  {isProGate ? (
                    <View style={{ marginTop: 12 }}>
                      <UpgradeButton />
                    </View>
                  ) : null}
                </View>
              );
            })()
          : null}

        {/* Empty result */}
        {status === "ready" && proposals.length === 0 ? (
          <View style={{ marginTop: 20 }}>
            <EmptyState
              icon="sparkle"
              title="Nothing to add"
              body="Otto didn't find anything to suggest. Try rephrasing."
            />
          </View>
        ) : null}

        {/* Proposals */}
        {proposals.length > 0 ? (
          <View style={{ marginTop: 20, gap: 12 }}>
            {proposals.map((proposal) => {
              const d = proposalDisplay(proposal);
              const busy = applyingId === proposal.id;
              return (
                <ProposalCard
                  key={proposal.id}
                  icon={d.icon}
                  tone={d.tone}
                  title={d.title}
                  detail={d.detail}
                  onAccept={busy ? undefined : () => void accept(proposal)}
                  onDismiss={busy ? undefined : () => dismiss(proposal)}
                />
              );
            })}
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
