// Settings — OTTO app design (otto/app-screens.jsx SettingsScreen + app-extra.jsx
// CalendarConnectCard), ported to RN inline styles via the design kit. A dark
// profile header, Connections (Google Calendar connect card), Consent toggles with
// the encryption note, Pro tools rows, and the About footer. All data logic is
// unchanged (useConsents, useAuth, useGoogleCalendar); only the look is the
// inline-style design kit (reliable on SDK 54, unlike the prior NativeWind pass).
import { View, Text, Pressable, Image } from "react-native";
import type { DataSource } from "@otto/schemas";
import { useConsents } from "../hooks/useConsents";
import { useGoogleCalendar } from "../hooks/useGoogleCalendar";
import { useRepositoryDeps } from "../hooks/useRepositoryDeps";
import { AsyncBoundary } from "../components/AsyncBoundary";
import { RegionSettings } from "../components/RegionSettings";
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
import { CONSENT_POLICY_VERSION } from "../lib/constants";
import { t } from "../i18n";
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
    title: t("account.settings.consent.calendar.title"),
    description: t("account.settings.consent.calendar.description"),
    purpose: t("account.settings.consent.calendar.purpose"),
    icon: "cal",
    tone: "sky",
  },
  {
    source: "finance",
    title: t("account.settings.consent.finance.title"),
    description: t("account.settings.consent.finance.description"),
    purpose: t("account.settings.consent.finance.purpose"),
    icon: "peso",
    tone: "green",
  },
  {
    source: "health",
    title: t("account.settings.consent.health.title"),
    description: t("account.settings.consent.health.description"),
    purpose: t("account.settings.consent.health.purpose"),
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
      {locked ? <Pill tone="pro">{t("common.pro")}</Pill> : <Icon name="chevR" size={18} color={OC.ink400} />}
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
              {t("account.settings.calendar.syncing")}
            </Text>
            <Text style={{ marginTop: 2, fontFamily: FONT.body, fontSize: 12, color: OC.ink500 }}>
              {t("account.settings.calendar.readingToday")}
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
              {t("account.settings.calendar.name")}
            </Text>
            <Text style={{ marginTop: 1, fontFamily: FONT.body, fontSize: 12, color: OC.ink500 }}>
              {t("account.settings.calendar.readOnly")}
            </Text>
          </View>
          <Pill tone="green">
            <Icon name="check" size={12} color="#fff" stroke={3} />
            <Text style={{ color: "#fff", fontFamily: FONT.bodyBold, fontSize: 11.5 }}>
              {t("account.settings.calendar.connected")}
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
            accessibilityLabel={t("account.settings.calendar.syncToday")}
            style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={{ color: OC.green, fontFamily: FONT.bodyX, fontSize: 12.5 }}>
              {t("account.settings.calendar.syncToday")}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => void disconnect()}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={t("account.settings.calendar.disconnectA11y")}
            style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={{ color: OC.coral, fontFamily: FONT.bodyBold, fontSize: 12.5 }}>
              {t("account.settings.calendar.disconnect")}
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
      <Display style={{ fontSize: 17, textAlign: "center" }}>{t("account.settings.calendar.connectTitle")}</Display>
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
        {t("account.settings.calendar.connectBody")}
      </Text>
      <Pressable
        onPress={() => void connect()}
        disabled={busy || !configured}
        accessibilityRole="button"
        accessibilityLabel={t("account.settings.calendar.connectWithGoogle")}
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
          {t("account.settings.calendar.connectWithGoogle")}
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
          {t("account.settings.calendar.notConfigured")}
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
  return (
    <OverlayScreen title={t("account.settings.title")} onBack={() => navigation.goBack()}>
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
              {signedIn && email ? email : t("account.settings.profile.fallbackName")}
            </Text>
            <Text style={{ marginTop: 1, fontFamily: FONT.body, fontSize: 12.5, color: OC.sage }}>
              {isPro ? t("account.settings.profile.planPro") : signedIn ? t("account.settings.profile.planFree") : t("account.settings.profile.planLocal")}
            </Text>
          </View>
          {isPro ? (
            <Pill tone="pro">{t("common.pro")}</Pill>
          ) : signedIn ? (
            <Pressable
              onPress={() => navigation.navigate("Upgrade")}
              accessibilityRole="button"
              accessibilityLabel={t("account.settings.profile.upgradeToPro")}
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
              <Text style={{ color: "#fff", fontFamily: FONT.bodyX, fontSize: 12.5 }}>{t("common.upgrade")}</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => navigation.navigate("Login")}
              accessibilityRole="button"
              accessibilityLabel={t("account.settings.profile.signIn")}
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
              <Text style={{ color: "#fff", fontFamily: FONT.bodyX, fontSize: 12.5 }}>{t("account.settings.profile.signIn")}</Text>
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
                accessibilityLabel={t("account.settings.profile.upgradeToPro")}
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
                  {t("account.settings.profile.upgradeToPro")}
                </Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => void signOut()}
              accessibilityRole="button"
              accessibilityLabel={t("account.settings.profile.signOut")}
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
                {t("account.settings.profile.signOut")}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </GradientCard>

      <AsyncBoundary state={state} error={error} onRetry={reload} loadingLabel={t("account.settings.loading")}>
        {/* Connections */}
        <SectionLabel>{t("account.settings.sections.connections")}</SectionLabel>
        <CalendarConnectCard />

        {/* Region & currency (stories 13.1 / 13.4) */}
        <View style={{ marginTop: 18 }}>
          <SectionLabel>{t("account.settings.sections.region")}</SectionLabel>
          <RegionSettings />
        </View>

        {/* Consent */}
        <View style={{ marginTop: 18 }}>
          <SectionLabel>{t("account.settings.sections.consent")}</SectionLabel>
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
              {t("account.settings.consent.encryptionNote")}
            </Text>
          </View>
        </View>

        {/* Pro tools */}
        <View style={{ marginTop: 18 }}>
          <SectionLabel>{t("account.settings.sections.proTools")}</SectionLabel>
          <Card pad={16} style={{ paddingVertical: 2 }}>
            <NavRow
              icon="dumbbell"
              title={t("account.settings.proTools.optimizer.title")}
              subtitle={t("account.settings.proTools.optimizer.subtitle")}
              onPress={() => navigation.navigate("Optimizer")}
            />
            <NavRow
              icon="sparkle"
              title={t("account.settings.proTools.tips.title")}
              subtitle={t("account.settings.proTools.tips.subtitle")}
              onPress={() => navigation.navigate("Tips")}
              locked={!isPro}
              last
            />
          </Card>
        </View>

        {/* Help */}
        <View style={{ marginTop: 18 }}>
          <SectionLabel>{t("account.settings.sections.help")}</SectionLabel>
          <Card pad={16} style={{ paddingVertical: 2 }}>
            <NavRow
              icon="sparkle"
              title={t("account.settings.help.howItWorks.title")}
              subtitle={t("account.settings.help.howItWorks.subtitle")}
              onPress={() => navigation.navigate("HowItWorks")}
              last
            />
          </Card>
        </View>

        {/* About */}
        <View style={{ marginTop: 18 }}>
          <SectionLabel>{t("account.settings.sections.about")}</SectionLabel>
          <Card>
            <Text style={{ fontFamily: FONT.bodyBold, fontSize: 15, color: OC.ink }}>
              {APP_NAME}
            </Text>
            <Text
              style={{ marginTop: 1, fontFamily: FONT.body, fontStyle: "italic", fontSize: 13, color: OC.ink500 }}
            >
              {t("account.settings.about.tagline")}
            </Text>
            <Text style={{ marginTop: 8, fontFamily: FONT.body, fontSize: 13, color: OC.ink400 }}>
              {t("account.settings.about.version", { version: APP_VERSION })}
            </Text>
            <Text style={{ marginTop: 1, fontFamily: FONT.body, fontSize: 13, color: OC.ink400 }}>
              {t("account.settings.about.policyVersion", { version: CONSENT_POLICY_VERSION })}
            </Text>
            <Text style={{ marginTop: 8, fontFamily: FONT.body, fontSize: 12, color: OC.ink400 }}>
              {t("account.settings.about.localNote")}
            </Text>
          </Card>
        </View>

        {/* Your data — export, erase, delete account (right to erasure) */}
        <View style={{ marginTop: 18, marginBottom: 10 }}>
          <SectionLabel>{t("account.settings.sections.yourData")}</SectionLabel>
          <Card pad={16} style={{ paddingVertical: 2 }}>
            <NavRow
              icon="shield"
              title={t("account.settings.yourData.title")}
              subtitle={t("account.settings.yourData.subtitle")}
              onPress={() => navigation.navigate("YourData")}
              last
            />
          </Card>
        </View>
      </AsyncBoundary>
    </OverlayScreen>
  );
}
