// Settings — OTTO app design (otto/app-screens.jsx SettingsScreen + app-extra.jsx
// CalendarConnectCard), ported to RN inline styles via the design kit. A dark
// profile header, Connections (Google Calendar connect card), Consent toggles with
// the encryption note, Pro tools rows, and the About footer. All data logic is
// unchanged (useConsents, useAuth, useGoogleCalendar); only the look is the
// inline-style design kit (reliable on SDK 54, unlike the prior NativeWind pass).
import { useState } from "react";
import { View, Text, Pressable, Image, Alert } from "react-native";
import type { DataSource } from "@otto/schemas";
import { useConsents } from "../hooks/useConsents";
import { useGoogleCalendar } from "../hooks/useGoogleCalendar";
import { useRepositoryDeps } from "../hooks/useRepositoryDeps";
import { AsyncBoundary } from "../components/AsyncBoundary";
import {
  OverlayScreen,
  GradientCard,
  Card,
  SectionLabel,
  Pill,
  ToggleRow,
  Display,
  CLAM_ASSET,
} from "../design/kit";
import { Icon, type IconName } from "../design/Icon";
import { OC, FONT, RADIUS, tint } from "../design/theme";
import { useAuth } from "../auth/AuthProvider";
import { useAppReset } from "../lib/app-reset";
import { wipeLocalData } from "../lib/account";
import { deleteAccount } from "../lib/api-client";
import { CONSENT_POLICY_VERSION } from "../lib/constants";
import appConfig from "../../app.json";

const APP_NAME = appConfig.expo.name;
const APP_VERSION = appConfig.expo.version;

/** The consent sources, with plain-language what & why (kept from the spine). */
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
    description: "Most sensitive · off unless you say so",
    purpose: "Store and read medications to time dose reminders",
    icon: "heart",
    tone: "coral",
  },
];

/** A tappable row that navigates to a Pro surface (or shows a PRO pill). */
function NavRow({
  icon,
  title,
  subtitle,
  onPress,
  locked = false,
  last = false,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  onPress: () => void;
  locked?: boolean;
  last?: boolean;
}): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 13,
          paddingVertical: 14,
          borderBottomWidth: last ? 0 : 1,
          borderBottomColor: OC.line,
          opacity: pressed ? 0.6 : 1,
        },
      ]}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 11,
          backgroundColor: tint(OC.green),
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name={icon} size={18} color={OC.green} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: FONT.bodyBold, fontSize: 14.5, color: OC.ink }}>{title}</Text>
        <Text style={{ marginTop: 1, fontFamily: FONT.body, fontSize: 12, color: OC.ink500 }}>
          {subtitle}
        </Text>
      </View>
      {locked ? <Pill tone="pro">PRO</Pill> : <Icon name="chevR" size={18} color={OC.ink400} />}
    </Pressable>
  );
}

/**
 * Google Calendar connect card — design's connected / connecting / disconnected
 * states, wired to the real on-device connector (useGoogleCalendar). Presentational
 * shell only; every action (connect / sync / disconnect) stays an explicit tap.
 */
function CalendarConnectCard(): React.JSX.Element {
  const deps = useRepositoryDeps();
  const { configured, connected, busy, message, connect, syncToday, disconnect } =
    useGoogleCalendar(deps);

  const glyph = (
    <View
      style={{
        width: 42,
        height: 42,
        borderRadius: 12,
        backgroundColor: OC.surface,
        borderWidth: 1,
        borderColor: OC.line,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon name="cal" size={22} color={OC.sky} />
    </View>
  );

  // Connecting / syncing — the design's "connecting" state.
  if (connected && busy) {
    return (
      <Card pad={16}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 13 }}>
          {glyph}
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: FONT.bodyBold, fontSize: 14.5, color: OC.ink }}>
              Syncing your calendar…
            </Text>
            <Text style={{ marginTop: 2, fontFamily: FONT.body, fontSize: 12, color: OC.ink500 }}>
              Reading today&apos;s events
            </Text>
          </View>
          <View style={{ width: 11, height: 11, borderRadius: 99, backgroundColor: OC.emerald }} />
        </View>
        {message ? (
          <Text style={{ marginTop: 12, fontFamily: FONT.body, fontSize: 12.5, color: OC.ink500 }}>
            {message}
          </Text>
        ) : null}
      </Card>
    );
  }

  // Connected — the design's "connected" state with sync/disconnect actions.
  if (connected) {
    return (
      <Card pad={16}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          {glyph}
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: FONT.bodyBold, fontSize: 14.5, color: OC.ink }}>
              Google Calendar
            </Text>
            <Text style={{ marginTop: 1, fontFamily: FONT.body, fontSize: 12, color: OC.ink500 }}>
              Read-only · on your device
            </Text>
          </View>
          <Pill tone="green">
            <Icon name="check" size={12} color="#fff" stroke={3} />
            <Text style={{ color: "#fff", fontFamily: FONT.bodyBold, fontSize: 11.5 }}>
              Connected
            </Text>
          </Pill>
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 12,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: OC.line,
            gap: 10,
          }}
        >
          <Pressable
            onPress={() => void syncToday()}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Sync today"
            style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={{ color: OC.green, fontFamily: FONT.bodyX, fontSize: 12.5 }}>
              Sync today
            </Text>
          </Pressable>
          <Pressable
            onPress={() => void disconnect()}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Disconnect Google Calendar"
            style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={{ color: OC.coral, fontFamily: FONT.bodyBold, fontSize: 12.5 }}>
              Disconnect
            </Text>
          </Pressable>
        </View>
        {message ? (
          <Text style={{ marginTop: 10, fontFamily: FONT.body, fontSize: 12.5, color: OC.ink500 }}>
            {message}
          </Text>
        ) : null}
      </Card>
    );
  }

  // Disconnected — the design's centered "connect" call to action.
  return (
    <Card pad={16} style={{ alignItems: "center" }}>
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          backgroundColor: OC.surface,
          borderWidth: 1,
          borderColor: OC.line,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 12,
        }}
      >
        <Icon name="cal" size={26} color={OC.sky} />
      </View>
      <Display style={{ fontSize: 17, textAlign: "center" }}>Connect Google Calendar</Display>
      <Text
        style={{
          fontFamily: FONT.body,
          fontSize: 13,
          color: OC.ink500,
          marginTop: 5,
          lineHeight: 20,
          textAlign: "center",
          maxWidth: 280,
        }}
      >
        So Otto can time reminders around your real schedule. Read-only — it never edits your events
        without asking.
      </Text>
      <Pressable
        onPress={() => void connect()}
        disabled={busy || !configured}
        accessibilityRole="button"
        accessibilityLabel="Connect with Google"
        style={({ pressed }) => [
          {
            marginTop: 14,
            alignSelf: "stretch",
            backgroundColor: busy || !configured ? OC.line : OC.ink,
            borderRadius: RADIUS.btn,
            paddingVertical: 12,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 9,
            opacity: pressed ? 0.9 : 1,
          },
        ]}
      >
        <Icon name="cal" size={18} color="#fff" />
        <Text style={{ color: "#fff", fontFamily: FONT.bodyX, fontSize: 14.5 }}>
          Connect with Google
        </Text>
      </Pressable>
      {!configured ? (
        <Text
          style={{
            marginTop: 10,
            fontFamily: FONT.body,
            fontSize: 12,
            color: OC.amberInk,
            textAlign: "center",
          }}
        >
          Google Calendar isn&apos;t set up in this build (missing client id).
        </Text>
      ) : message ? (
        <Text
          style={{
            marginTop: 10,
            fontFamily: FONT.body,
            fontSize: 12.5,
            color: OC.ink500,
            textAlign: "center",
          }}
        >
          {message}
        </Text>
      ) : null}
    </Card>
  );
}

type SettingsNavigation = { navigate: (screen: string) => void; goBack: () => void };

export function SettingsScreen({
  navigation,
}: {
  navigation: SettingsNavigation;
}): React.JSX.Element {
  const { state, error, isGranted, setConsent, reload } = useConsents();
  const { status, email, isPro, signOut } = useAuth();
  const signedIn = status === "signed-in";
  const reset = useAppReset();
  const [deleting, setDeleting] = useState(false);

  const runDelete = async (): Promise<void> => {
    setDeleting(true);
    try {
      // Delete the cloud account first (only if signed in); if that fails, keep
      // local data intact so the user can retry rather than lose it silently.
      if (signedIn) {
        const res = await deleteAccount();
        if (!res.ok) {
          Alert.alert("Couldn't delete your account", `${res.message} Your data is unchanged — please try again.`);
          return;
        }
      }
      await wipeLocalData();
      await signOut();
      reset(); // back to first-run onboarding
    } finally {
      setDeleting(false);
    }
  };

  const confirmDelete = (): void => {
    Alert.alert(
      "Delete account & data?",
      "This permanently deletes your Otto account and erases all data on this device. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => void runDelete() },
      ],
    );
  };

  return (
    <OverlayScreen title="Settings" onBack={() => navigation.goBack()}>
      {/* Profile header — dark gradient, driven by the live auth session. */}
      <GradientCard style={{ marginBottom: 18 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 13 }}>
          <View
            style={{
              width: 46,
              height: 46,
              borderRadius: 14,
              backgroundColor: OC.mist,
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            <Image source={CLAM_ASSET} style={{ width: 36, height: 36, resizeMode: "contain" }} />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{ fontFamily: FONT.display, fontSize: 18, color: "#fff" }}
              numberOfLines={1}
            >
              {signedIn && email ? email : "Your Otto"}
            </Text>
            <Text style={{ marginTop: 1, fontFamily: FONT.body, fontSize: 12.5, color: OC.sage }}>
              {isPro ? "Otto Pro" : signedIn ? "Free plan" : "Local & anonymous"}
            </Text>
          </View>
          {isPro ? (
            <Pill tone="pro">PRO</Pill>
          ) : signedIn ? (
            <Pressable
              onPress={() => navigation.navigate("Upgrade")}
              accessibilityRole="button"
              accessibilityLabel="Upgrade to Pro"
              style={({ pressed }) => [
                {
                  backgroundColor: OC.emerald,
                  borderRadius: RADIUS.pill,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text style={{ color: "#fff", fontFamily: FONT.bodyX, fontSize: 12.5 }}>Upgrade</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => navigation.navigate("Login")}
              accessibilityRole="button"
              accessibilityLabel="Sign in"
              style={({ pressed }) => [
                {
                  backgroundColor: OC.emerald,
                  borderRadius: RADIUS.pill,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text style={{ color: "#fff", fontFamily: FONT.bodyX, fontSize: 12.5 }}>Sign in</Text>
            </Pressable>
          )}
        </View>

        {/* Signed-in: an Upgrade affordance for free + a Sign out row. */}
        {signedIn ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginTop: 13,
              paddingTop: 13,
              borderTopWidth: 1,
              borderTopColor: "rgba(255,255,255,0.1)",
            }}
          >
            {!isPro ? (
              <Pressable
                onPress={() => navigation.navigate("Upgrade")}
                accessibilityRole="button"
                accessibilityLabel="Upgrade to Pro"
                style={({ pressed }) => [
                  {
                    flex: 1,
                    alignItems: "center",
                    borderRadius: RADIUS.inner,
                    backgroundColor: "rgba(255,255,255,0.1)",
                    paddingVertical: 10,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Text style={{ fontFamily: FONT.bodyBold, fontSize: 12.5, color: OC.mint }}>
                  Upgrade to Pro
                </Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => void signOut()}
              accessibilityRole="button"
              accessibilityLabel="Sign out"
              style={({ pressed }) => [
                {
                  flex: isPro ? 1 : undefined,
                  alignItems: "center",
                  borderRadius: RADIUS.inner,
                  backgroundColor: "rgba(255,255,255,0.1)",
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Text style={{ fontFamily: FONT.bodyBold, fontSize: 12.5, color: OC.sage }}>
                Sign out
              </Text>
            </Pressable>
          </View>
        ) : null}
      </GradientCard>

      <AsyncBoundary state={state} error={error} onRetry={reload} loadingLabel="Loading settings">
        {/* Connections */}
        <SectionLabel>Connections</SectionLabel>
        <CalendarConnectCard />

        {/* Consent */}
        <View style={{ marginTop: 18 }}>
          <SectionLabel>Consent</SectionLabel>
          <Card pad={16} style={{ paddingVertical: 2 }}>
            {SOURCES.map((s, index) => (
              <ToggleRow
                key={s.source}
                icon={s.icon}
                tone={s.tone}
                title={s.title}
                sub={s.description}
                on={isGranted(s.source)}
                onToggle={() => void setConsent(s.source, !isGranted(s.source), s.purpose)}
                last={index === SOURCES.length - 1}
              />
            ))}
          </Card>
          <View
            style={{
              marginTop: 12,
              flexDirection: "row",
              alignItems: "flex-start",
              gap: 10,
              borderRadius: RADIUS.inner,
              backgroundColor: OC.mist,
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
              Encrypted on your device, DPA-compliant, and never sold. Every access to health and
              finance data is logged for your records.
            </Text>
          </View>
        </View>

        {/* Pro tools */}
        <View style={{ marginTop: 18 }}>
          <SectionLabel>Pro tools</SectionLabel>
          <Card pad={16} style={{ paddingVertical: 2 }}>
            <NavRow
              icon="dumbbell"
              title="Routine optimizer"
              subtitle="Reshape your day — you confirm"
              onPress={() => navigation.navigate("Optimizer")}
            />
            <NavRow
              icon="sparkle"
              title="Tips"
              subtitle="Gentle finance & health"
              onPress={() => navigation.navigate("Tips")}
              locked={!isPro}
              last
            />
          </Card>
        </View>

        {/* Help */}
        <View style={{ marginTop: 18 }}>
          <SectionLabel>Help</SectionLabel>
          <Card pad={16} style={{ paddingVertical: 2 }}>
            <NavRow
              icon="sparkle"
              title="How Otto works"
              subtitle="A quick tour of the basics"
              onPress={() => navigation.navigate("HowItWorks")}
              last
            />
          </Card>
        </View>

        {/* About */}
        <View style={{ marginTop: 18 }}>
          <SectionLabel>About</SectionLabel>
          <Card>
            <Text style={{ fontFamily: FONT.bodyBold, fontSize: 15, color: OC.ink }}>
              {APP_NAME}
            </Text>
            <Text
              style={{ marginTop: 1, fontFamily: FONT.body, fontStyle: "italic", fontSize: 13, color: OC.ink500 }}
            >
              Otto knows.
            </Text>
            <Text style={{ marginTop: 8, fontFamily: FONT.body, fontSize: 13, color: OC.ink400 }}>
              Version {APP_VERSION}
            </Text>
            <Text style={{ marginTop: 1, fontFamily: FONT.body, fontSize: 13, color: OC.ink400 }}>
              Privacy policy version {CONSENT_POLICY_VERSION}
            </Text>
            <Text style={{ marginTop: 8, fontFamily: FONT.body, fontSize: 12, color: OC.ink400 }}>
              Free tier runs entirely on your device. Your data stays local.
            </Text>
          </Card>
        </View>

        {/* Danger zone — DPA right to erasure */}
        <View style={{ marginTop: 18, marginBottom: 10 }}>
          <SectionLabel>Account</SectionLabel>
          <Pressable
            onPress={confirmDelete}
            disabled={deleting}
            accessibilityRole="button"
            accessibilityLabel="Delete account and data"
            style={({ pressed }) => ({
              borderRadius: RADIUS.btn,
              borderWidth: 1.5,
              borderColor: OC.coral,
              backgroundColor: OC.surface,
              paddingVertical: 13,
              alignItems: "center",
              opacity: pressed || deleting ? 0.6 : 1,
            })}
          >
            <Text style={{ color: OC.coral, fontFamily: FONT.bodyX, fontSize: 14.5 }}>
              {deleting ? "Deleting…" : "Delete account & data"}
            </Text>
          </Pressable>
          <Text style={{ marginTop: 8, textAlign: "center", fontFamily: FONT.body, fontSize: 12, color: OC.ink400 }}>
            Permanently erases your account and all on-device data. This can&apos;t be undone.
          </Text>
        </View>
      </AsyncBoundary>
    </OverlayScreen>
  );
}
