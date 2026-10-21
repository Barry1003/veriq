import { getMockLocalAiRuntime } from "@/services/adapters/local-ai-runtime";
import type { LocalAiRuntimeSnapshot } from "@/types/local-ai-runtime";

export async function getLocalAiRuntime(): Promise<LocalAiRuntimeSnapshot> {
  const source = process.env.NEXT_PUBLIC_DATA_SOURCE ?? "mock";
  if (source === "mock") return getMockLocalAiRuntime();
  if (source === "api") {
    throw new Error(
      "The authenticated local AI runtime API contract has not yet been agreed.",
    );
  }
  throw new Error(`Unsupported data source mode: ${source}`);
}
