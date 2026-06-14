// Navigation root. A bottom-tab navigator (Today, Reminders, Finance, Settings)
// plus a first-run onboarding flow (Consent → Routine Setup). The data layer is
// initialized and notifications configured once at boot.
import "./global.css";
import { useEffect, useState } from "react";
import { Text } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { createRepositoryDeps, initDataLayer, routineRepository } from "./src/data";
import { configureNotifications } from "./src/notifications";
import { rescheduleDay } from "./src/lib/reschedule";
import { LOCAL_USER_ID } from "./src/lib/constants";
import { LoadingState } from "./src/components/AsyncBoundary";
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

type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
  // Modal paywall — sibling of Main so any tab/Settings screen can reach it
  // via navigation.navigate("Upgrade").
  Upgrade: undefined;
};

/** Settings is a stack so the Pro surfaces (Optimizer, Tips) are reachable from it. */
type SettingsStackParamList = {
  SettingsHome: undefined;
  Optimizer: undefined;
  Tips: undefined;
};

const Tab = createBottomTabNavigator();
const RootStack = createNativeStackNavigator<RootStackParamList>();
const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();

/** Settings tab: the consent/about home plus the Pro Optimizer + Tips screens. */
function SettingsNavigator(): React.JSX.Element {
  return (
    <SettingsStack.Navigator>
      <SettingsStack.Screen
        name="SettingsHome"
        component={SettingsScreen}
        options={{ title: "Settings" }}
      />
      <SettingsStack.Screen
        name="Optimizer"
        component={OptimizerScreen}
        options={{ title: "Optimize your day" }}
      />
      <SettingsStack.Screen name="Tips" component={TipsScreen} options={{ title: "Tips" }} />
    </SettingsStack.Navigator>
  );
}

/** Tab-bar glyph (text — keeps the free build dependency-light). */
function tabIcon(glyph: string) {
  return ({ color }: { color: string }) => (
    <Text style={{ color, fontSize: 18 }} accessibilityElementsHidden>
      {glyph}
    </Text>
  );
}

function MainTabs(): React.JSX.Element {
  return (
    <Tab.Navigator screenOptions={{ headerShown: true }}>
      <Tab.Screen
        name="Today"
        component={TodayScreen}
        options={{ tabBarIcon: tabIcon("☀"), tabBarAccessibilityLabel: "Today" }}
      />
      <Tab.Screen
        name="Add"
        component={QuickAddScreen}
        options={{ tabBarIcon: tabIcon("＋"), tabBarAccessibilityLabel: "Quick add" }}
      />
      <Tab.Screen
        name="Reminders"
        component={RemindersScreen}
        options={{ tabBarIcon: tabIcon("🔔"), tabBarAccessibilityLabel: "Reminders" }}
      />
      <Tab.Screen
        name="Health"
        component={MedicationsScreen}
        options={{ tabBarIcon: tabIcon("💊"), tabBarAccessibilityLabel: "Health" }}
      />
      <Tab.Screen
        name="Finance"
        component={FinanceScreen}
        options={{ tabBarIcon: tabIcon("₱"), tabBarAccessibilityLabel: "Finance" }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsNavigator}
        options={{
          headerShown: false,
          tabBarIcon: tabIcon("⚙"),
          tabBarAccessibilityLabel: "Settings",
        }}
      />
    </Tab.Navigator>
  );
}

export default function App(): React.JSX.Element {
  // "booting" while we init the store + decide first-run; then onboarding | main.
  const [phase, setPhase] = useState<"booting" | "onboarding" | "main">("booting");

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
      <NavigationContainer>
        {phase === "booting" ? (
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
              </>
            )}
          </RootStack.Navigator>
        )}
      </NavigationContainer>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
