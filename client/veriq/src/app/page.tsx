import { LivePageRefresh } from "@/components/live-page-refresh";
import { sessionVeriqApi } from "@/services/api/session-reader";
import { IntelligenceOverview } from "@/features/intelligence-overview/intelligence-overview";
import { getIntelligenceOverview } from "@/services/intelligence-overview";
import type { IntelligenceOverviewData } from "@/types/intelligence-overview";
import "./overview.css";

export default async function HomePage() {
  const api = await sessionVeriqApi();
  let data: IntelligenceOverviewData;
  try {
    data = await getIntelligenceOverview(api);
  } catch {
    return (
      <section className="io-page">
        <LivePageRefresh/><h1>Intelligence data unavailable</h1>
        <p>Intelligence data could not be retrieved.</p>
      </section>
    );
  }
  return <>{api && <LivePageRefresh/>}<IntelligenceOverview data={data} /></>;
}
