import type { Metadata } from "next";
import { LocalAiRuntimeScreen } from "@/features/administration/local-ai-runtime-screen";
import { getLocalAiRuntime } from "@/services/local-ai-runtime";
import "./local-ai-runtime.css";

export const metadata: Metadata = {
  title: "Local AI Runtime | Veriq",
  description:
    "Bank-controlled model policy, readiness and evidence governance",
};

export default async function LocalAiPage() {
  const snapshot = await getLocalAiRuntime();
  return <LocalAiRuntimeScreen snapshot={snapshot} />;
}
