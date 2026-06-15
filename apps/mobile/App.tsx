// Navigation root. A bottom-tab navigator (Today, Reminders, Add, Finance, Health)
// rendered with the OTTO custom tab bar (the center "Add" is the raised green +).
// Settings, Optimizer and Tips live on the root stack (siblings of Main + the
// Upgrade modal) so the per-screen AppHeader gear reaches Settings, and Settings
// rows reach the Pro surfaces. A first-run onboarding flow gates the app. The data
// layer is initialized and notifications configured once at boot.
import "./global.css";
import { useEffect, useState } from "react";
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

import { createRepositoryDeps, initDataLayer, routineRepository } from "./src/data";
import { configureNotifications } from "./src/notifications";
import { rescheduleDay } from "./src/lib/reschedule";
import { LOCAL_USER_ID } from "./src/lib/constants";
import { LoadingState } from "./src/components/AsyncBoundary";
import { OttoTabBar } from "./src/components/otto-ui";
import { AuthProvider } from "./src/auth/AuthProvider";
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

type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
  // Modal paywall — sibling of Main so any tab/Settings screen can reach it
  // via navigation.navigate("Upgrade").
  Upgrade: undefined;
  // Settings + the Pro surfaces live on the root stack so the per-screen header
  // gear (AppHeader) reaches Settings, and Settings rows reach Optimizer/Tips.
  Settings: undefined;
  Optimizer: undefined;
  Tips: undefined;
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
  const [phase, setPhase] = useState<"booting" | "onboarding" | "main">("booting");

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
      initDataLayer();
      configureNotifications();
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
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          {phase === "booting" || !fontsLoaded ? (
            <LoadingState label="Starting Otto" />
          ) : (
            <RootStack.Navigator screenOptions={{ headerShown: false }}>
              {phase === "onboarding" ? (
                <RootStack.Screen name="Onboarding">
                  {() => <OnboardingScreen onComplete={() => setPhase("main")} />}
                </RootStack.Screen>
              ) : (
                <>
                  <RootStack.Screen name="Main" component={MainTabs} />
                  <RootStack.Screen
                    name="Upgrade"
                    component={UpgradeScreen}
                    options={{ presentation: "modal" }}
                  />
                  <RootStack.Screen
                    name="Login"
                    component={LoginScreen}
                    options={{ presentation: "modal" }}
                  />
                  <RootStack.Screen name="Settings" component={SettingsScreen} />
                  <RootStack.Screen name="Optimizer" component={OptimizerScreen} />
                  <RootStack.Screen name="Tips" component={TipsScreen} />
                </>
              )}
            </RootStack.Navigator>
          )}
        </NavigationContainer>
      </AuthProvider>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
