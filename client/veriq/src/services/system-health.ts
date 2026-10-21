import { getMockSystemHealth } from "@/services/adapters/system-health";
import type { SystemHealthSnapshot } from "@/types/system-health";

export async function getSystemHealth(): Promise<SystemHealthSnapshot> {
  const mode = process.env.NEXT_PUBLIC_DATA_SOURCE ?? "mock";
  if (mode === "mock") return getMockSystemHealth();
  if (mode === "api") {
    throw new Error(
      "System health API contract has not yet been agreed with the backend team.",
    );
  }
  throw new Error(`Unsupported data source mode: ${mode}`);
}
