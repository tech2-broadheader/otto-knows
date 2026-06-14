// Quick Add (story 5.x). Type what's on your mind in natural language; Otto's
// brain turns it into confirmable proposals. Accept applies it locally; Dismiss
// drops it. Presentational — all logic lives in useQuickAdd / apply-proposal.
//
// Free-tier: quick-add has a small daily quota server-side. A spent quota (403)
// or rate-limit (429) shows an upgrade / try-later banner; an unconfigured or
// signed-out backend shows a calm sign-in message. Nothing ever crashes.
import { useState } from "react";
import { Text, View } from "react-native";
import { useRepositoryDeps } from "../hooks/useRepositoryDeps";
import { useQuickAdd } from "../hooks/useQuickAdd";
import { ProposalCard } from "../components/ProposalCard";
import { EmptyState, LoadingState, ScreenScroll } from "../components/AsyncBoundary";
import { Banner, Button, Card, LabeledInput } from "../components/ui";
import { UpgradeButton } from "../components/UpgradeButton";
import { getApiBaseUrl, type ApiErrorCode } from "../lib/api-client";

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
  const { status, proposals, error, errorCode, applyingId, submit, accept, dismiss } =
    useQuickAdd(deps);
  const [text, setText] = useState("");
  const configured = getApiBaseUrl() !== null;

  const handleSubmit = (): void => {
    void submit(text);
  };

  return (
    <ScreenScroll>
      <Text className="mb-1 text-2xl font-bold text-slate-900">Quick add</Text>
      <Text className="mb-4 text-sm text-slate-500">
        Tell Otto what's on your mind — it'll suggest what to add. You confirm before anything is
        saved.
      </Text>

      {!configured ? (
        <Banner
          tone="info"
          message="Otto's cloud brain isn't set up in this build. Quick add needs the Pro backend."
        />
      ) : null}

      <Card>
        <LabeledInput
          label="What would you like to add?"
          value={text}
          onChangeText={setText}
          placeholder="e.g. Pay Meralco ₱1,800 on the 20th"
          multiline
        />
        <Button
          label="Ask Otto"
          onPress={handleSubmit}
          disabled={status === "submitting" || text.trim() === ""}
        />
      </Card>

      {status === "submitting" ? <LoadingState label="Thinking" /> : null}

      {status === "error" && error
        ? (() => {
            const banner = errorBanner(errorCode, error);
            // Quota spent (403) / sign-in (401) are the Pro-upgrade paths — offer
            // a way to the paywall. Rate-limit / not-configured are transient.
            const isProGate = errorCode === "FORBIDDEN" || errorCode === "UNAUTHORIZED";
            return (
              <>
                <Banner tone={banner.tone} message={banner.text} />
                {isProGate ? <UpgradeButton /> : null}
              </>
            );
          })()
        : null}

      {status === "ready" && proposals.length === 0 ? (
        <EmptyState
          title="Nothing to add"
          hint="Otto didn't find anything to suggest. Try rephrasing."
        />
      ) : null}

      {proposals.length > 0 ? (
        <View>
          <Text className="mb-2 mt-2 text-sm font-medium text-slate-600">
            Suggestions — accept the ones you want.
          </Text>
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
    </ScreenScroll>
  );
}
