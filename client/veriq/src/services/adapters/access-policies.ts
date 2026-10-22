import { accessPoliciesFixture } from "@/data/access-policies";
import type { AccessPoliciesSnapshot } from "@/types/access-policies";

export async function getMockAccessPolicies(): Promise<AccessPoliciesSnapshot> {
  return accessPoliciesFixture;
}
