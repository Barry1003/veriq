import { IntelligenceOverview } from "@/features/intelligence-overview/intelligence-overview";
import { getIntelligenceOverview } from "@/services/intelligence-overview";
import type { IntelligenceOverviewData } from "@/types/intelligence-overview";
import "./overview.css";

export default async function HomePage() {
  let data: IntelligenceOverviewData;
  try {
    data = await getIntelligenceOverview();
  } catch {
    return (
      <section className="io-page">
        <h1>Intelligence data unavailable</h1>
        <p>Intelligence data could not be retrieved.</p>
      </section>
    );
  }
  return <IntelligenceOverview data={data} />;
}
