// First-run onboarding flow: Consent → Routine Setup → main app. Drives a tiny
// two-step wizard; on finish it calls onComplete so the navigation root swaps to
// the tab navigator. Each step's data is persisted by its own hook/repository.
import { useState } from "react";
import { ConsentScreen } from "./ConsentScreen";
import { RoutineSetupScreen } from "./RoutineSetupScreen";

type Step = "consent" | "routine";

export function OnboardingScreen({ onComplete }: { onComplete: () => void }): React.JSX.Element {
  const [step, setStep] = useState<Step>("consent");

  if (step === "consent") {
    return <ConsentScreen onDone={() => setStep("routine")} />;
  }
  return <RoutineSetupScreen onDone={onComplete} />;
}
