import { localAiRuntimeFixture } from "@/data/local-ai-runtime";
import type { LocalAiRuntimeSnapshot } from "@/types/local-ai-runtime";

export async function getMockLocalAiRuntime(): Promise<LocalAiRuntimeSnapshot> {
  return localAiRuntimeFixture;
}
