import { systemHealthFixture } from "@/data/system-health";
import type { SystemHealthSnapshot } from "@/types/system-health";

export async function getMockSystemHealth(): Promise<SystemHealthSnapshot> {
  return systemHealthFixture;
}
