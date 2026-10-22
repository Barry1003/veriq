import { IntelligenceWorkbench } from "@/features/investigations/intelligence-workbench";
import { EmergingIssuesScreen } from "@/features/customer-intelligence/emerging-issues-screen";
import { getEmergingIssues } from "@/services/emerging-issues";
import "./emerging-issues.css";
export default async function EmergingIssuesPage() {
  if ((process.env.VERIQ_DATA_SOURCE ?? process.env.NEXT_PUBLIC_DATA_SOURCE ?? "mock") === "api") return <IntelligenceWorkbench view="issues"/>;
  const snapshot=await getEmergingIssues();
  if(snapshot.kind === "issues") return <IntelligenceWorkbench view="issues"/>;
  return <EmergingIssuesScreen snapshot={snapshot}/>;
}
