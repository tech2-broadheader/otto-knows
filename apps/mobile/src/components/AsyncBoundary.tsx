// Shared async-state UI: loading / error / empty wrappers so every screen has
// explicit states (CODING_CONVENTIONS §8). Presentational only — no data logic.
// OTTO palette (Claude Design pass).
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { OC } from "./ui";

export type LoadState = "loading" | "error" | "ready";

/** Centered spinner with an accessible label. */
export function LoadingState({ label = "Loading" }: { label?: string }): React.JSX.Element {
  return (
    <View
      className="flex-1 items-center justify-center bg-paper p-6"
      accessibilityRole="progressbar"
      accessibilityLabel={label}
    >
      <ActivityIndicator size="large" color={OC.green} />
      <Text className="mt-3 font-body text-base text-ink-500">{label}…</Text>
    </View>
  );
}

/** Error panel with an optional retry action. */
export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-center bg-paper p-6" accessibilityRole="alert">
      <Text className="text-center font-body-bold text-base text-coral">Something went wrong</Text>
      <Text className="mt-2 text-center font-body text-sm text-ink-500">{message}</Text>
      {onRetry ? (
        <Pressable
          className="mt-4 rounded-btn bg-green px-5 py-3"
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Try again"
        >
          <Text className="font-body-bold text-white">Try again</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Friendly empty state for a screen/section with nothing to show yet. */
export function EmptyState({ title, hint }: { title: string; hint?: string }): React.JSX.Element {
  return (
    <View className="items-center justify-center p-8" accessibilityRole="text">
      <Text className="text-center font-body-bold text-base text-ink-700">{title}</Text>
      {hint ? (
        <Text className="mt-2 text-center font-body text-sm text-ink-400">{hint}</Text>
      ) : null}
    </View>
  );
}

/**
 * Routes children through the right async state. When `state` is "ready" the
 * children render; otherwise the matching loading/error UI shows.
 */
export function AsyncBoundary({
  state,
  error,
  onRetry,
  loadingLabel,
  children,
}: {
  state: LoadState;
  error?: string;
  onRetry?: () => void;
  loadingLabel?: string;
  children: React.ReactNode;
}): React.JSX.Element {
  if (state === "loading") return <LoadingState label={loadingLabel} />;
  if (state === "error")
    return <ErrorState message={error ?? "Please try again."} onRetry={onRetry} />;
  return <>{children}</>;
}

/** A scrollable screen container with consistent padding + safe background. */
export function ScreenScroll({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <ScrollView
      className="flex-1 bg-paper"
      contentContainerStyle={{ padding: 18, paddingBottom: 120 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}
