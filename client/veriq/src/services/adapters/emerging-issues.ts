import { emergingIssueFixture } from "@/data/emerging-issues";
import { getMockCustomerInteractions } from "@/services/adapters/customer-interactions";
import type { EmergingIssueSnapshot } from "@/types/emerging-issues";

export async function getMockEmergingIssues(): Promise<EmergingIssueSnapshot> {
  return {
    kind: "synthetic-preview",
    customer: await getMockCustomerInteractions(),
    issues: emergingIssueFixture,
  };
}

