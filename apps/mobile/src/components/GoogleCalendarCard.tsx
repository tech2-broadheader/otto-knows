// "Connect Google Calendar" card for Settings (Story 3.1). Presentational; all
// logic lives in useGoogleCalendar. Explicit user action (connect/sync/disconnect).
// On-device, free-tier path (ADR-002): events are read on the device and stored
// locally, gated by the Calendar consent toggle above.
import { Text, View } from "react-native";
import { useRepositoryDeps } from "../hooks/useRepositoryDeps";
import { useGoogleCalendar } from "../hooks/useGoogleCalendar";
import { Banner, Button, Card } from "./ui";

export function GoogleCalendarCard(): React.JSX.Element {
  const deps = useRepositoryDeps();
  const { configured, connected, busy, message, connect, syncToday, disconnect } =
    useGoogleCalendar(deps);

  return (
    <Card title="Google Calendar">
      <Text className="mb-3 text-sm text-slate-600">
        Connect your Google account to pull today’s events into Otto. Read-only, on your device, and
        only after you allow the Calendar source above.
      </Text>

      {!configured ? (
        <Banner
          tone="warning"
          message="Google Calendar isn’t configured in this build. Set EXPO_PUBLIC_GOOGLE_CLIENT_ID to enable it."
        />
      ) : null}

      {message ? <Banner message={message} /> : null}

      {connected ? (
        <View className="gap-2">
          <Button label="Sync today" onPress={() => void syncToday()} disabled={busy} />
          <Button
            label="Disconnect"
            variant="secondary"
            onPress={() => void disconnect()}
            disabled={busy}
          />
        </View>
      ) : (
        <Button
          label="Connect Google Calendar"
          onPress={() => void connect()}
          disabled={busy || !configured}
        />
      )}
    </Card>
  );
}
