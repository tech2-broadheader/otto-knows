// Navigation root. A bottom-tab navigator (Today, Reminders, Add, Finance, Health)
// rendered with the OTTO custom tab bar (the center "Add" is the raised green +).
// Settings, Optimizer and Tips live on the root stack (siblings of Main + the
// Upgrade modal) so the per-screen AppHeader gear reaches Settings, and Settings
// rows reach the Pro surfaces. A first-run onboarding flow gates the app. The data
// layer is initialized and notifications configured once at boot.
import "./global.css";
import { useCallback, useEffect, useState } from "react";
import type { UserSettings } from "@otto/schemas";
import { StatusBar } from "expo-status-bar";
import {
  useFonts,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from "@expo-google-fonts/bricolage-grotesque";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { SpaceMono_400Regular, SpaceMono_700Bold } from "@expo-google-fonts/space-mono";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import {
  createRepositoryDeps,
  initDataLayer,
  makeAccountRepository,
  routineRepository,
  settingsRepository,
} from "./src/data";
import { configureNotifications } from "./src/notifications";
import { rescheduleDay } from "./src/lib/reschedule";
import { LOCAL_USER_ID } from "./src/lib/constants";
import { ErrorState, LoadingState } from "./src/components/AsyncBoundary";
import { describeMigrationError, type MigrationError } from "./src/db/migrations";
import { OttoTabBar } from "./src/design/kit";
import { AuthProvider } from "./src/auth/AuthProvider";
import { AppResetProvider } from "./src/lib/app-reset";
import { SettingsProvider, deviceSettings } from "./src/lib/settings-context";
import { useProOffer } from "./src/hooks/useProOffer";
import { TodayScreen } from "./src/screens/TodayScreen";
import { QuickAddScreen } from "./src/screens/QuickAddScreen";
import { RemindersScreen } from "./src/screens/RemindersScreen";
import { MedicationsScreen } from "./src/screens/MedicationsScreen";
import { FinanceScreen } from "./src/screens/FinanceScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { OptimizerScreen } from "./src/screens/OptimizerScreen";
import { TipsScreen } from "./src/screens/TipsScreen";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { UpgradeScreen } from "./src/screens/UpgradeScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { HowItWorksScreen } from "./src/screens/HowItWorksScreen";
import { AddTransactionScreen } from "./src/screens/AddTransactionScreen";
import { WalletsScreen } from "./src/screens/WalletsScreen";
import { WalletFormScreen } from "./src/screens/WalletFormScreen";
import { MonthlyReportScreen } from "./src/screens/MonthlyReportScreen";
import { NoteEditorScreen } from "./src/screens/NoteEditorScreen";
import { AppointmentFormScreen } from "./src/screens/AppointmentFormScreen";

type RootStackParamList = {
  Onboarding: undefined;
  // Post-onboarding sign-up panel (skippable).
  AuthGate: undefined;
  Main: undefined;
  // Modal paywall — sibling of Main so any tab/Settings screen can reach it
  // via navigation.navigate("Upgrade").
  Upgrade: undefined;
  // Settings + the Pro surfaces live on the root stack so the per-screen header
  // gear (AppHeader) reaches Settings, and Settings rows reach Optimizer/Tips.
  Settings: undefined;
  Optimizer: undefined;
  Tips: undefined;
  // Replayable "how Otto works" tour (Settings → How Otto works).
  HowItWorks: undefined;
  // Budgeting+ and Daily tasks (approved design 2026-10-08).
  AddTransaction: { txId?: string; type?: "expense" | "income" | "transfer" } | undefined;
  Wallets: undefined;
  WalletForm: { accountId?: string } | undefined;
  MonthlyReport: { month?: string } | undefined;
  NoteEditor: { noteId?: string } | undefined;
  AppointmentForm: undefined;
  // Optional sign-in (ADR-002). Modal sibling of Main/Upgrade so any screen can
  // route an unauthenticated user here before a Pro action.
  Login: undefined;
};

const Tab = createBottomTabNavigator();
const RootStack = createNativeStackNavigator<RootStackParamList>();

/**
 * The five bottom tabs in design order: Today · Reminders · Add (raised +) ·
 * Finance · Health. The custom OttoTabBar renders the center Add as the raised
 * green button; headers are off (each screen draws its own AppHeader).
 */
function MainTabs(): React.JSX.Element {
  // After a few sessions, a free user gets a one-time Pro offer (calm, never naggy).
  useProOffer();
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <OttoTabBar {...props} />}
    >
      <Tab.Screen name="Today" component={TodayScreen} />
      <Tab.Screen name="Reminders" component={RemindersScreen} />
      <Tab.Screen name="Add" component={QuickAddScreen} />
      <Tab.Screen name="Finance" component={FinanceScreen} />
      <Tab.Screen name="Health" component={MedicationsScreen} />
    </Tab.Navigator>
  );
}

export default function App(): React.JSX.Element {
  // "booting" while we init the store + decide first-run; then onboarding | main.
  // Flow: booting → onboarding (first run) → auth (sign-up panel, skippable) → main.
  const [phase, setPhase] = useState<"booting" | "db-error" | "onboarding" | "auth" | "main">(
    "booting",
  );
  // Set when the on-device schema upgrade fails (Story 11.1); drives the error screen.
  const [dbError, setDbError] = useState<MigrationError | null>(null);
  // Home currency / locale / timezone (story 13.1); the device suggestion until loaded.
  const [settings, setSettings] = useState(() => deviceSettings());
  const updateSettings = useCallback(async (next: UserSettings) => {
    const saved = await settingsRepository.update(next);
    if (saved !== "currency-locked") setSettings(saved);
    return saved;
  }, []);
  // Bumped by "Try again" on the error screen to re-run boot.
  const [bootAttempt, setBootAttempt] = useState(0);

  // OTTO type system: Bricolage Grotesque (display), Plus Jakarta Sans (body),
  // Space Mono (eyebrows/tabular). Gate render until loaded so text never flashes
  // in a fallback face.
  const [fontsLoaded] = useFonts({
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    SpaceMono_400Regular,
    SpaceMono_700Bold,
  });

  useEffect(() => {
    let cancelled = false;
    async function boot(): Promise<void> {
      const migration = initDataLayer();
      if (!migration.ok) {
        // Stop here: repositories, notifications and rescheduling all read the
        // store. Never fall through to onboarding — that would hide a user's data.
        if (!cancelled) {
          setDbError(migration.error);
          setPhase("db-error");
        }
        return;
      }
      configureNotifications();
      let bootSettings = deviceSettings(LOCAL_USER_ID);
      try {
        // First run stores the device's suggestion; later runs load the user's choice.
        bootSettings = await settingsRepository.ensure(deviceSettings(LOCAL_USER_ID));
        // The timezone follows the phone (travel, DST rules): refresh it each launch.
        const deviceTimezone = deviceSettings(LOCAL_USER_ID).timezone;
        if (bootSettings.timezone !== deviceTimezone) {
          bootSettings = await settingsRepository.save({ ...bootSettings, timezone: deviceTimezone });
        }
        if (!cancelled) setSettings(bootSettings);
      } catch {
        // Non-fatal: screens keep formatting with the device suggestion.
      }
      try {
        // Every install needs a default Cash wallet (story 11.2) before any
        // transaction is added; idempotent.
        await makeAccountRepository(createRepositoryDeps()).ensureDefault(
          LOCAL_USER_ID,
          bootSettings.currency,
        );
      } catch {
        // Non-fatal: the Finance screen retries ensureDefault on load.
      }
      // First run = no routine set up yet → start with onboarding.
      let hasRoutine = false;
      try {
        hasRoutine = (await routineRepository.getForUser(LOCAL_USER_ID)) !== undefined;
      } catch {
        // Treat a load failure as first-run; onboarding is safe to re-enter.
        hasRoutine = false;
      }
      if (!cancelled) setPhase(hasRoutine ? "main" : "onboarding");
      // Routine-timed auto-scheduling (Story 4.1): (re)plan today's notifications
      // on boot. Diffed against what's already scheduled, so no double-fire; and
      // it degrades gracefully if notification permission is denied.
      void rescheduleDay(createRepositoryDeps());
    }
    void boot();
    return () => {
      cancelled = true;
    };
  }, [bootAttempt]);

  const dbErrorCopy = dbError ? describeMigrationError(dbError) : null;
  const retryBoot = (): void => {
    setDbError(null);
    setPhase("booting");
    setBootAttempt((n) => n + 1);
  };

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SettingsProvider value={settings} onUpdate={updateSettings}>
          <AppResetProvider reset={() => setPhase("onboarding")}>
            <NavigationContainer>
              {phase === "booting" || !fontsLoaded ? (
                <LoadingState label="Starting Otto" />
              ) : phase === "db-error" && dbErrorCopy ? (
                <ErrorState
                  message={dbErrorCopy.message}
                  onRetry={dbErrorCopy.canRetry ? retryBoot : undefined}
                />
              ) : (
                <RootStack.Navigator screenOptions={{ headerShown: false }}>
                  {phase === "onboarding" ? (
                    <RootStack.Screen name="Onboarding">
                      {() => <OnboardingScreen onComplete={() => setPhase("auth")} />}
                    </RootStack.Screen>
                  ) : phase === "auth" ? (
                    // Right after onboarding: offer to create an account (skippable —
                    // free tier stays anonymous per ADR-002). Either path → main.
                    <RootStack.Screen name="AuthGate">
                      {() => <LoginScreen initialMode="sign-up" onDone={() => setPhase("main")} />}
                    </RootStack.Screen>
                  ) : (
                    <>
                      <RootStack.Screen name="Main" component={MainTabs} />
                      <RootStack.Screen
                        name="Upgrade"
                        component={UpgradeScreen}
                        options={{ presentation: "modal" }}
                      />
                      <RootStack.Screen name="Login" options={{ presentation: "modal" }}>
                        {({ navigation }) => <LoginScreen onDone={() => navigation.goBack()} />}
                      </RootStack.Screen>
                      <RootStack.Screen name="Settings" component={SettingsScreen} />
                      <RootStack.Screen name="Optimizer" component={OptimizerScreen} />
                      <RootStack.Screen name="Tips" component={TipsScreen} />
                      <RootStack.Screen name="HowItWorks" component={HowItWorksScreen} />
                      <RootStack.Screen name="AddTransaction" component={AddTransactionScreen} />
                      <RootStack.Screen name="Wallets" component={WalletsScreen} />
                      <RootStack.Screen name="WalletForm" component={WalletFormScreen} />
                      <RootStack.Screen name="MonthlyReport" component={MonthlyReportScreen} />
                      <RootStack.Screen name="NoteEditor" component={NoteEditorScreen} />
                      <RootStack.Screen name="AppointmentForm" component={AppointmentFormScreen} />
                    </>
                  )}
                </RootStack.Navigator>
              )}
            </NavigationContainer>
          </AppResetProvider>
        </SettingsProvider>
      </AuthProvider>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
