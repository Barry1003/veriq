import { bankGetRecentOperationalFeed, dataMode } from "@/lib/cedar-api";
import { dateLabel } from "@/lib/format";
import { observationsFromFeed } from "@/lib/telemetry";

export async function OperatorObservations() {
  const result = await bankGetRecentOperationalFeed();
  const observations = observationsFromFeed(result.data).slice(0, 10);
  return <section className="operator-form-card operator-observations">
    <h3>Recent gateway observations</h3>
    <p>Original Cedar measurements. Each sample retains its own window and reference; a timeout does not establish a financial outcome.</p>
    {result.error && <p role="status">{result.error}</p>}
    {observations.length ? <div className="operator-evidence-grid">{observations.map(observation => <div key={observation.id} data-observation-id={observation.id}>
      <span>{observation.gateway} / {observation.route}</span>
      <strong>{observation.timeouts} / {observation.attempts} timeouts · {observation.rate.toFixed(1)}%</strong>
      <p>{observation.windowSeconds}s window · {dateLabel(observation.eventTime)}</p>
      <small>{observation.id}</small>
    </div>)}</div> : <p>{dataMode === "api" ? "No operational observations returned." : "Connect the bank to inspect live observations."}</p>}
  </section>;
}
