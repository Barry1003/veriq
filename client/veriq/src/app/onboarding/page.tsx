import type { Metadata } from "next";
import { OnboardingWizard } from "@/features/onboarding/onboarding-wizard";
import "./onboarding.css";

export const metadata: Metadata = {
  title: "First-run deployment | Veriq",
  description: "Frontend preview of bank-controlled Veriq deployment setup",
};

export default function OnboardingPage() {
  return <OnboardingWizard />;
}
