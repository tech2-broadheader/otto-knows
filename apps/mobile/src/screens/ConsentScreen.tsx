// Onboarding / Consent (story 1.4). Explains each data source — what & why —
// with granular, revocable toggles. Persists via the consent repository. Nothing
// reads a source without granted consent. Presentational only; logic in useConsents.
import { Text, View } from "react-native";
import type { DataSource } from "@otto/schemas";
import { useConsents } from "../hooks/useConsents";
import { AsyncBoundary, ScreenScroll } from "../components/AsyncBoundary";
import { Banner, Button, Card, ToggleRow } from "../components/ui";

/** The free-tier sources we ask consent for, with plain-language what & why. */
const SOURCES: ReadonlyArray<{
  source: DataSource;
  title: string;
  what: string;
  why: string;
  purpose: string;
}> = [
  {
    source: "calendar",
    title: "Calendar",
    what: "Your events and their times.",
    why: "So Otto can frame your day and time reminders around what's already booked.",
    purpose: "Read calendar events to build your daily briefing",
  },
  {
    source: "finance",
    title: "Finance",
    what: "Income, bills and spending you enter yourself.",
    why: "So Otto can show your budget and give gentle payday-vs-bill heads-ups. Encrypted on your device; never used for ads.",
    purpose: "Store and read your finances to track budget and bills",
  },
  {
    source: "health",
    title: "Health (medications)",
    what: "Medication names and dose times you enter.",
    why: "So Otto can remind you to take meds at the right moment. Encrypted on your device; never used for ads.",
    purpose: "Store and read medications to time dose reminders",
  },
];

export function ConsentScreen({
  onDone,
  footer,
}: {
  onDone?: () => void;
  /** Extra content rendered below the toggles (used by Settings for app info). */
  footer?: React.ReactNode;
}): React.JSX.Element {
  const { state, error, isGranted, setConsent, reload } = useConsents();

  return (
    <ScreenScroll>
      <View className="mb-4">
        <Text className="text-2xl font-bold text-slate-900">Your data, your call</Text>
        <Text className="mt-1 text-sm text-slate-500">
          Otto only reads a source after you turn it on. You can change these anytime in Settings —
          turning one off stops Otto reading it.
        </Text>
      </View>

      <AsyncBoundary state={state} error={error} onRetry={reload} loadingLabel="Loading consent">
        {SOURCES.map((s) => (
          <Card key={s.source} title={s.title}>
            <Text className="mb-1 text-sm text-slate-600">
              <Text className="font-medium">What: </Text>
              {s.what}
            </Text>
            <Text className="mb-3 text-sm text-slate-600">
              <Text className="font-medium">Why: </Text>
              {s.why}
            </Text>
            <ToggleRow
              label={`Allow ${s.title}`}
              value={isGranted(s.source)}
              onValueChange={(next) => {
                void setConsent(s.source, next, s.purpose);
              }}
            />
          </Card>
        ))}

        <Banner message="Health and finance data are sensitive. Otto keeps them encrypted on your device and logs every access for your records (Data Privacy Act)." />

        {onDone ? (
          <View className="mt-2">
            <Button label="Continue" onPress={onDone} />
          </View>
        ) : null}

        {footer}
      </AsyncBoundary>
    </ScreenScroll>
  );
}
