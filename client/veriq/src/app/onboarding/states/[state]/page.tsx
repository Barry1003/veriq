import { notFound } from "next/navigation";
import { developmentSetupStates } from "@/data/onboarding-development-states";
import { OnboardingOutcomeScreen } from "@/features/onboarding/onboarding-extra-screens";
import { isAdditionalSetupState } from "@/types/onboarding-extra";
import "../../onboarding.css";
import "../../onboarding-extra.css";

export default async function OnboardingStatePage({ params }: { params: Promise<{ state: string }> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { state } = await params;
  if (!isAdditionalSetupState(state)) notFound();
  return <OnboardingOutcomeScreen outcome={developmentSetupStates[state]} />;
}

