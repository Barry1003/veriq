import { getLiveIssues } from "./adapters/live-investigations";
import { requireVeriqApi, type VeriqApi } from "./api/veriq";
import type { IssuesData } from "@/types/investigations";
import { getMockEmergingIssues } from "@/services/adapters/emerging-issues";
import type { EmergingIssueSnapshot } from "@/types/emerging-issues";

export async function getEmergingIssues(api?: VeriqApi): Promise<EmergingIssueSnapshot | IssuesData> {
  const mode = process.env.VERIQ_DATA_SOURCE ?? process.env.NEXT_PUBLIC_DATA_SOURCE ?? "mock";
  if (mode === "mock") return getMockEmergingIssues();
  if (mode === "api") return getLiveIssues(requireVeriqApi(api));
  throw new Error(`Unsupported Veriq data source: ${mode}`);
}

