// A tiny context exposing an "app reset" callback (provided by App.tsx) so a
// deep screen (Settings → delete account) can send the user back to first-run
// onboarding after wiping their data, without threading a prop through every
// navigator.
import { createContext, useContext, type ReactNode } from "react";

const AppResetContext = createContext<() => void>(() => {});

export function AppResetProvider({
  reset,
  children,
}: {
  reset: () => void;
  children: ReactNode;
}): React.JSX.Element {
  return <AppResetContext.Provider value={reset}>{children}</AppResetContext.Provider>;
}

/** Returns a callback that resets the app to its first-run (onboarding) state. */
export function useAppReset(): () => void {
  return useContext(AppResetContext);
}
