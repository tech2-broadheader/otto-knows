// Quick Add (story 5.x). Type what's on your mind in natural language; Otto's
// brain turns it into confirmable proposals. Accept applies it locally; Dismiss
// drops it. Presentational — all logic lives in useQuickAdd / apply-proposal.
//
// Free-tier: quick-add has a small daily quota server-side. A spent quota (403)
// or rate-limit (429) shows an upgrade / try-later banner; an unconfigured or
// signed-out backend shows a calm sign-in message. Nothing ever crashes.
//
// Visual: OTTO Quick add design — Otto's intro bubble, the focus-emerald input,
// example chips, the "Otto's thinking…" pulse, and proposals as ProposalCards.
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useRepositoryDeps } from "../hooks/useRepositoryDeps";
import { useQuickAdd } from "../hooks/useQuickAdd";
import { ProposalCard } from "../components/ProposalCard";
import { EmptyState } from "../components/AsyncBoundary";
import { Banner, Icon, OC } from "../components/ui";
import { OttoAvatar, ScreenContainer, ScreenHeader } from "../components/otto-ui";
import { UpgradeButton } from "../components/UpgradeButton";
import { getApiBaseUrl, type ApiErrorCode } from "../lib/api-client";
import { useAuth } from "../auth/AuthProvider";

/** Example prompts offered as one-tap chips (match the design's examples). */
const EXAMPLE_CHIPS: readonly string[] = [
  "Pay Meralco ₱2,480 on Saturday",
  "Gym Mon/Wed/Fri at 6am",
  "Dinner with Mom Friday 7pm",
];

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

export function QuickAddScreen(): React.JSX.Element {
  const deps = useRepositoryDeps();
  const { isPro } = useAuth();
  const { status, proposals, error, errorCode, applyingId, submit, accept, dismiss } =
    useQuickAdd(deps);
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const configured = getApiBaseUrl() !== null;
  const thinking = status === "submitting";
  const hasText = text.trim() !== "";

  const handleSubmit = (value?: string): void => {
    const next = value ?? text;
    if (value !== undefined) setText(value);
    void submit(next);
  };

  return (
    <ScreenContainer>
      <ScreenHeader title="Quick add" sub="Tell Otto in plain words" />

      {/* Otto's intro bubble */}
      <View className="mt-3 flex-row items-start gap-3">
        <OttoAvatar />
        <View className="flex-1 rounded-[6px_18px_18px_18px] border border-line bg-surface px-4 py-3.5">
          <Text className="font-body text-[14.5px] leading-[22px] text-ink-700">
            What can I take off your plate? A bill, a dose, a plan — say it however you&apos;d say
            it to a friend.
          </Text>
        </View>
      </View>

      {!configured ? (
        <View className="mt-3">
          <Banner
            tone="info"
            message="Otto's cloud brain isn't set up in this build. Quick add needs the Pro backend."
          />
        </View>
      ) : null}

      {/* Ask-Otto input with focus-emerald border */}
      <View
        className="mt-4 rounded-card bg-surface px-4 py-3.5"
        style={{
          borderWidth: 2,
          borderColor: thinking || focused ? OC.emerald : OC.line,
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
          className="min-h-[44px] font-body text-[15.5px] leading-[22px] text-ink"
          accessibilityLabel="What would you like to add?"
        />
        <View className="mt-2 flex-row items-center justify-between">
          <Text className="font-body-semibold text-[11.5px] text-ink-400">
            {isPro ? "Unlimited" : "A few free each day"}
          </Text>
          <Pressable
            onPress={() => handleSubmit()}
            disabled={!hasText || thinking}
            accessibilityRole="button"
            accessibilityLabel="Ask Otto"
            className={`flex-row items-center gap-1.5 rounded-btn px-4 py-2.5 ${hasText && !thinking ? "bg-green" : "bg-line"}`}
          >
            <Text className="font-body-extra text-[13.5px] text-white">
              {thinking ? "Otto's thinking…" : "Ask Otto"}
            </Text>
            {!thinking ? <Icon name="arrowR" size={15} color="#fff" /> : null}
          </Pressable>
        </View>
      </View>

      {/* Example chips */}
      <View className="mt-3.5 flex-row flex-wrap gap-2">
        {EXAMPLE_CHIPS.map((chip) => (
          <Pressable
            key={chip}
            onPress={() => handleSubmit(chip)}
            disabled={thinking}
            accessibilityRole="button"
            accessibilityLabel={chip}
            className="rounded-pill bg-mist px-3 py-2"
          >
            <Text className="font-body-bold text-[12.5px] text-forest">{chip}</Text>
          </Pressable>
        ))}
      </View>

      {/* Thinking state */}
      {thinking ? (
        <View className="mt-5 flex-row items-center justify-center gap-2.5">
          <View className="h-2.5 w-2.5 rounded-full bg-emerald" />
          <Text className="font-body-semibold text-[14px] text-ink-500">
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
              <View className="mt-5">
                <Banner tone={banner.tone} message={banner.text} />
                {isProGate ? <UpgradeButton /> : null}
              </View>
            );
          })()
        : null}

      {/* Empty result */}
      {status === "ready" && proposals.length === 0 ? (
        <View className="mt-5">
          <EmptyState
            title="Nothing to add"
            hint="Otto didn't find anything to suggest. Try rephrasing."
          />
        </View>
      ) : null}

      {/* Proposals */}
      {proposals.length > 0 ? (
        <View className="mt-5 gap-3">
          {proposals.map((proposal) => (
            <ProposalCard
              key={proposal.id}
              proposal={proposal}
              onAccept={(p) => void accept(p)}
              onDismiss={dismiss}
              busy={applyingId === proposal.id}
            />
          ))}
        </View>
      ) : null}
    </ScreenContainer>
  );
}
