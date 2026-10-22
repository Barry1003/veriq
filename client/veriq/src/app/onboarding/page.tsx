import type { Metadata } from "next";
import { OnboardingWizard } from "@/features/onboarding/onboarding-wizard";
import "./onboarding.css";
import "./onboarding-extra.css";

export const metadata: Metadata = {
  title: "First-run deployment | Veriq",
  description: "Bank-controlled Veriq deployment setup",
};

export default function OnboardingPage() {
  return <OnboardingWizard />;
}
