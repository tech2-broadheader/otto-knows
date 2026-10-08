// Shared async-state UI: loading / error wrappers so every screen has explicit
// states (CODING_CONVENTIONS §8). Presentational only — no data logic. Styled
// with the OTTO design tokens as RN style objects, like the rest of the design
// kit (NativeWind class names are not relied on — see design/theme.ts).
// Empty states live in the design kit (EmptyState).
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { FONT, OC, RADIUS } from "../design/theme";
import { t } from "../i18n";

export type LoadState = "loading" | "error" | "ready";

/** Centered spinner with an accessible label. */
export function LoadingState({
  label = t("account.async.loading"),
}: {
  label?: string;
}): React.JSX.Element {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: OC.paper,
        padding: 24,
      }}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
    >
      <ActivityIndicator size="large" color={OC.green} />
      <Text style={{ marginTop: 12, fontFamily: FONT.body, fontSize: 16, color: OC.ink500 }}>
        {label}…
      </Text>
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
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: OC.paper,
        padding: 24,
      }}
      accessibilityRole="alert"
    >
      <Text
        style={{ textAlign: "center", fontFamily: FONT.bodyBold, fontSize: 16, color: OC.coralInk }}
      >
        {t("account.async.errorTitle")}
      </Text>
      <Text
        style={{
          marginTop: 8,
          textAlign: "center",
          fontFamily: FONT.body,
          fontSize: 14,
          lineHeight: 21,
          color: OC.ink500,
        }}
      >
        {message}
      </Text>
      {onRetry ? (
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel={t("common.retry")}
          style={({ pressed }) => [
            {
              marginTop: 16,
              borderRadius: RADIUS.btn,
              backgroundColor: OC.green,
              paddingHorizontal: 20,
              paddingVertical: 12,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <Text style={{ fontFamily: FONT.bodyBold, fontSize: 15, color: "#fff" }}>
            {t("common.retry")}
          </Text>
        </Pressable>
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
    return <ErrorState message={error ?? t("account.async.fallback")} onRetry={onRetry} />;
  return <>{children}</>;
}
