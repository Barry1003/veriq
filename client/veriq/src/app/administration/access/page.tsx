import type { Metadata } from "next";
import { AccessPoliciesScreen } from "@/features/administration/access-policies-screen";
import { getAccessPolicies } from "@/services/access-policies";
import "./access-policies.css";

export const metadata: Metadata = {
  title: "Access & Policies | Veriq",
  description:
    "Institutional access roles, scoped capabilities, and authorization evidence boundaries",
};

export default async function AccessPoliciesPage() {
  const snapshot = await getAccessPolicies();
  return <AccessPoliciesScreen snapshot={snapshot} />;
}
