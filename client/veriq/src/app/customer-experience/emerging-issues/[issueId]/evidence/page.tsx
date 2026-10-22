import { IntelligenceWorkbench } from "@/features/investigations/intelligence-workbench";
import { notFound } from "next/navigation";
import { EmergingIssueEvidenceScreen } from "@/features/customer-intelligence/emerging-issue-evidence-screen";
import { getEmergingIssues } from "@/services/emerging-issues";
import "./emerging-issue-evidence.css";

type PageProps = { params: Promise<{ issueId: string }> };

export default async function EmergingIssueEvidencePage({ params }: PageProps) {
  const { issueId } = await params;
  if ((process.env.VERIQ_DATA_SOURCE ?? process.env.NEXT_PUBLIC_DATA_SOURCE ?? "mock") === "api") return <IntelligenceWorkbench view="issues" id={issueId}/>;
  const snapshot = await getEmergingIssues().catch(() => null);
  if (!snapshot) {
    return (
      <section className="ep-page">
        <h1>Evidence unavailable</h1>
        <p>The emerging issue and its supporting records could not be loaded.</p>
      </section>
    );
  }
  if(snapshot.kind === "issues") return <IntelligenceWorkbench view="issues" id={issueId}/>;
  const issue = snapshot.issues.find((record) => record.id === issueId);
  if (!issue) notFound();
  return <EmergingIssueEvidenceScreen issue={issue} customer={snapshot.customer} />;
}

