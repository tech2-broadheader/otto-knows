// First-run onboarding flow: Welcome → Consent → Routine Setup → main app. Owns
// the wizard shell (step dots + bottom CTA) and renders each step's body. On
// finish it calls onComplete so the navigation root swaps to the tab navigator.
// Each step's data is persisted by its own hook/repository (consent, routine).
import { useState } from "react";
import { WelcomeScreen } from "./WelcomeScreen";
import { ConsentScreen } from "./ConsentScreen";
import { RoutineSetupScreen } from "./RoutineSetupScreen";
import { OnboardingShell } from "../components/otto-ui";

const STEP_COUNT = 3;
const CTA_LABELS = ["Get started", "I agree", "Set my rhythm"];

export function OnboardingScreen({ onComplete }: { onComplete: () => void }): React.JSX.Element {
  const [step, setStep] = useState(0);

  const next = (): void => {
    if (step < STEP_COUNT - 1) setStep((s) => s + 1);
    else onComplete();
  };

  return (
    <OnboardingShell
      step={step}
      stepCount={STEP_COUNT}
      ctaLabel={CTA_LABELS[step]!}
      onNext={next}
      onBack={() => setStep((s) => Math.max(0, s - 1))}
      onSkip={onComplete}
    >
      {step === 0 ? <WelcomeScreen /> : step === 1 ? <ConsentScreen /> : <RoutineSetupScreen />}
    </OnboardingShell>
  );
}
