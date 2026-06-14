// First-run onboarding flow: Welcome → Consent → Routine Setup → main app. Drives
// a tiny wizard; on finish it calls onComplete so the navigation root swaps to
// the tab navigator. Each step's data is persisted by its own hook/repository.
import { useState } from "react";
import { WelcomeScreen } from "./WelcomeScreen";
import { ConsentScreen } from "./ConsentScreen";
import { RoutineSetupScreen } from "./RoutineSetupScreen";

type Step = "welcome" | "consent" | "routine";

export function OnboardingScreen({ onComplete }: { onComplete: () => void }): React.JSX.Element {
  const [step, setStep] = useState<Step>("welcome");

  if (step === "welcome") {
    return <WelcomeScreen onGetStarted={() => setStep("consent")} />;
  }
  if (step === "consent") {
    return <ConsentScreen onDone={() => setStep("routine")} />;
  }
  return <RoutineSetupScreen onDone={onComplete} />;
}
