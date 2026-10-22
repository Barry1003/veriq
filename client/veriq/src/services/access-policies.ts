import { getMockAccessPolicies } from "@/services/adapters/access-policies";
import type { AccessPoliciesSnapshot } from "@/types/access-policies";

export async function getAccessPolicies(): Promise<AccessPoliciesSnapshot> {
  const source = process.env.NEXT_PUBLIC_DATA_SOURCE ?? "mock";
  if (source === "mock") return getMockAccessPolicies();
  if (source === "api")
    throw new Error(
      "Authenticated Access & Policies API contract is not integrated yet.",
    );
  throw new Error(`Unsupported data source mode: ${source}`);
}
