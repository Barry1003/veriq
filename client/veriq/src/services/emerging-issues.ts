import { getMockEmergingIssues } from "@/services/adapters/emerging-issues";
import type { EmergingIssueSnapshot } from "@/types/emerging-issues";

export async function getEmergingIssues(): Promise<EmergingIssueSnapshot> {
  const mode = process.env.NEXT_PUBLIC_DATA_SOURCE ?? "mock";
  if (mode === "mock") return getMockEmergingIssues();
  if (mode === "api") throw new Error("The authorized emerging-issues API contract is not yet available.");
  throw new Error(`Unsupported Veriq data source: ${mode}`);
}

