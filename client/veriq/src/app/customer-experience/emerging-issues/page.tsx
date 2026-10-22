import { EmergingIssuesScreen } from "@/features/customer-intelligence/emerging-issues-screen";
import { getEmergingIssues } from "@/services/emerging-issues";
import "./emerging-issues.css";

export default async function EmergingIssuesPage() {
  const snapshot = await getEmergingIssues().catch(() => null);
  if (!snapshot) return (
    <section className="ei-page" aria-labelledby="ei-unavailable">
      <h1 id="ei-unavailable">Emerging issues unavailable</h1>
      <p>Issue records could not be loaded.</p>
    </section>
  );
  return <EmergingIssuesScreen snapshot={snapshot} />;
}

