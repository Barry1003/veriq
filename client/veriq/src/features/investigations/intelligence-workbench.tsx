"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Activity, ArrowUpRight, RefreshCw } from "lucide-react";
import type {
  IntelligenceData,
  IssuesData,
  OperationsData,
  QueueData,
} from "@/types/investigations";
import { startIntelligencePolling } from "@/lib/intelligence-polling";
import "./intelligence-workbench.css";
import { Workspace } from "./investigation-workspace";
import {
  Badge,
  Card,
  Metadata,
  Original,
  EvidenceReferences,
  time,
  text,
} from "./investigation-presentation";
function useIntelligence(view: string, id?: string) {
  const [data, setData] = useState<IntelligenceData | null>(null),
    [error, setError] = useState<string | null>(null),
    [updated, setUpdated] = useState<string | null>(null);
  const poll = useRef<ReturnType<
    typeof startIntelligencePolling<IntelligenceData>
  > | null>(null);
  const url = `/api/intelligence?view=${encodeURIComponent(view)}${id ? `&id=${encodeURIComponent(id)}` : ""}`;
  useEffect(() => {
    const current = startIntelligencePolling<IntelligenceData>({
      read: async (signal) => {
        const response = await fetch(url, {
          cache: "no-store",
          signal: AbortSignal.any([signal, AbortSignal.timeout(15_000)]),
        });
        const body = await response.json();
        if (!response.ok)
          throw new Error(body.error ?? "Intelligence unavailable");
        return body;
      },
      receive: (value) => {
        setData(value);
        setError(null);
        setUpdated(new Date().toISOString());
      },
      fail: (error) => {
        setData(null);
        setError(
          error instanceof Error ? error.message : "Intelligence unavailable",
        );
      },
      active: (value) =>
        value.kind === "workspace"
          ? value.investigation.state !== "resolved"
          : value.kind === "queue"
            ? value.investigations.some((i) => i.state !== "resolved")
            : value.kind === "operations",
    });
    poll.current = current;
    return () => current.stop();
  }, [url]);
  return { data, error, updated, refresh: () => void poll.current?.refresh() };
}
function InvestigationQueue({ data }: { data: QueueData }) {
  const [query, setQuery] = useState(""),
    [status, setStatus] = useState("all");
  const rows = data.investigations.filter(
    (i) =>
      (status === "all" || i.state === status) &&
      `${i.id} ${i.triggerId} ${i.triggerType}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="iw-stats">
        <Card title="Investigations">
          <strong className="iw-number">{data.investigations.length}</strong>
          <p>Persisted cases</p>
        </Card>
        <Card title="Operationally initiated">
          <strong className="iw-number">
            {
              data.investigations.filter((i) => i.triggerType === "incident")
                .length
            }
          </strong>
          <p>Source detector triggers</p>
        </Card>
        <Card title="Open review">
          <strong className="iw-number">
            {data.investigations.filter((i) => i.reviewRequired).length}
          </strong>
          <p>Human review required</p>
        </Card>
      </div>
      <Card title="Investigation queue">
        <div className="iw-filters">
          <label>
            Search reference or trigger
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Investigation or source reference"
            />
          </label>
          <label>
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">All statuses</option>
              {[...new Set(data.investigations.map((i) => i.state))].map(
                (s) => (
                  <option key={s}>{s}</option>
                ),
              )}
            </select>
          </label>
        </div>
        <div className="iw-scroll">
          <table>
            <thead>
              <tr>
                <th>Investigation / created</th>
                <th>Initiation / source trigger</th>
                <th>Status</th>
                <th>Revision / evidence</th>
                <th>Workspace</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((i) => (
                <tr key={i.id}>
                  <td>
                    <Link
                      className="iw-mono"
                      href={`/investigations/${encodeURIComponent(i.id)}`}
                    >
                      {i.id}
                    </Link>
                    <small>Created {time(i.createdAt)}</small>
                    <small>
                      {i.updatedAt
                        ? `Updated ${time(i.updatedAt)}`
                        : "Update time unavailable"}
                    </small>
                  </td>
                  <td>
                    {i.triggerType === "incident" ? "Operational" : "Customer"}
                    <small className="iw-mono">
                      {i.triggerType} · {i.triggerId}
                    </small>
                  </td>
                  <td>
                    <Badge>{i.state}</Badge>
                    {i.reviewRequired && <small>Review required</small>}
                  </td>
                  <td>
                    Revision {i.revision}
                    <small>
                      {i.evidenceCount === null
                        ? "Evidence availability: inspect workspace"
                        : `${i.evidenceCount} linked source records`}
                    </small>
                  </td>
                  <td>
                    <Link
                      className="iw-action"
                      href={`/investigations/${encodeURIComponent(i.id)}`}
                    >
                      Open <ArrowUpRight size={15} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && (
          <p className="iw-empty">No investigations match these filters.</p>
        )}
      </Card>
    </>
  );
}
function Monitoring({ data }: { data: OperationsData }) {
  const [selected, setSelected] = useState<string | null>(null);
  const evidence = data.observations.find(
    (o) => o.record.id === selected,
  )?.record;
  const latest = data.observations.at(-1),
    fresh = latest
      ? Date.parse(data.observedAt) - Date.parse(latest.at) <= 60_000
        ? "Fresh"
        : "Stale"
      : "Absent";
  return (
    <>
      <div className="iw-stats">
        <Card title="Recorded observations">
          <strong className="iw-number">{data.observations.length}</strong>
          <p>{fresh} · freshness threshold 60 seconds</p>
        </Card>
        <Card title="Operational incidents">
          <strong className="iw-number">{data.incidents.length}</strong>
          <p>Source detector records</p>
        </Card>
        <Card title="Latest measurement">
          <strong>{latest ? time(latest.at) : "No source measurements"}</strong>
          <p>{latest ? `${latest.route} / ${latest.gateway}` : "Absent"}</p>
        </Card>
      </div>
      {data.warnings.map((w) => (
        <p role="status" key={w}>
          {w}
        </p>
      ))}
      <Card title="Operational incidents">
        {data.incidents.map((i) => {
          // Contact linkage comes from the backend workspace, never from timestamp proximity.
          return (
            <article className="iw-incident" id={i.record.id} key={i.record.id}>
              <div className="iw-card-heading">
                <h3>
                  {i.route} / {i.gateway}
                </h3>
                <Badge>{i.state}</Badge>
              </div>
              <p className="iw-mono">{i.record.id}</p>
              <Metadata
                items={[
                  ["Source", i.source],
                  ["Detected", time(i.record.created_at)],
                  ["Recorded window", `${time(i.start)} – ${time(i.end)}`],
                  ["Detector rule", i.rule],
                  ["Attempts / timeouts", `${i.attempts} / ${i.timeouts}`],
                  ["Timeout rate", `${(i.rate * 100).toFixed(1)}%`],
                  ["Financial outcome", text(i.record.data.financial_outcome)],
                ]}
              />
              {i.contactTimes.length > 0 && (
                <div className="iw-section-lead">
                  <Activity size={18} />
                  <div>
                    <strong>
                      {i.contactTimes.every(
                        (at) =>
                          Date.parse(at) > Date.parse(i.record.created_at),
                      )
                        ? "Detected before linked customer contact"
                        : "Incident and linked customer timeline"}
                    </strong>
                    <p>Incident detected: {time(i.record.created_at)}</p>
                    {i.contactTimes.map((at) => (
                      <p key={at}>Linked customer source event: {time(at)}</p>
                    ))}
                  </div>
                </div>
              )}
              <EvidenceReferences ids={i.evidenceIds} onInspect={setSelected} />
              {i.investigationIds.map((id) => (
                <Link
                  key={id}
                  className="iw-action"
                  href={`/investigations/${id}`}
                >
                  Open investigation <ArrowUpRight size={15} />
                </Link>
              ))}
            </article>
          );
        })}
        {!data.incidents.length && (
          <p className="iw-empty">No operational incidents recorded.</p>
        )}
      </Card>
      <Card title="Recorded measurement windows">
        <p className="iw-muted">
          Each row is an original source window. No historical baseline is
          supplied.
        </p>
        <div className="iw-scroll">
          <table>
            <thead>
              <tr>
                <th>Measurement / window</th>
                <th>Source / route / gateway</th>
                <th>Attempts</th>
                <th>Timeouts / rate</th>
                <th>Recorded association</th>
                <th>Evidence</th>
              </tr>
            </thead>
            <tbody>
              {data.observations.map((o) => (
                <tr key={o.record.id}>
                  <td>
                    {time(o.at)}
                    <small>{o.windowSeconds} second window</small>
                  </td>
                  <td>
                    {o.source}
                    <small>
                      {o.route} / {o.gateway}
                    </small>
                  </td>
                  <td>{o.attempts}</td>
                  <td>
                    <div className="iw-meter">
                      <span style={{ width: `${(o.rate ?? 0) * 100}%` }} />
                    </div>
                    {o.timeouts} /{" "}
                    {o.rate === null
                      ? "Unavailable"
                      : `${(o.rate * 100).toFixed(1)}%`}
                  </td>
                  <td>
                    {o.incidentIds.length
                      ? o.incidentIds.map((id) => (
                          <a key={id} className="iw-mono" href={`#${id}`}>
                            {id}
                          </a>
                        ))
                      : "No recorded incident"}
                  </td>
                  <td>
                    <button
                      className="iw-button"
                      onClick={() => setSelected(o.record.id)}
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!data.observations.length && <p>No measurements recorded.</p>}
      </Card>
      {evidence && (
        <Card title="Original operational source">
          <button className="iw-button" onClick={() => setSelected(null)}>
            Close evidence
          </button>
          <Original value={evidence} />
        </Card>
      )}
    </>
  );
}
function Issues({ data, issueId }: { data: IssuesData; issueId?: string }) {
  const issues = issueId
    ? data.issues.filter((i) => i.record.id === issueId)
    : data.issues;
  return (
    <>
      <div className="iw-card-heading">
        <p>
          {data.issues.length} recorded issue groups · {data.contacts.length}{" "}
          original contacts
        </p>
        <Link href="/customer-experience">Customer interactions</Link>
      </div>
      {issues.map((i) => (
        <Card key={i.record.id} title={i.category.replaceAll("_", " ")}>
          <p className="iw-mono">{i.record.id}</p>
          <p>{i.meaning}</p>
          <Metadata
            items={[
              ["Recorded contacts", String(i.count)],
              ["Channels", i.channels.join(", ")],
              ["Created", time(i.record.created_at)],
              ["Classification", i.record.classification],
            ]}
          />
          <Link
            className="iw-action"
            href={`/customer-experience/emerging-issues/${encodeURIComponent(i.record.id)}/evidence`}
          >
            Inspect persisted issue evidence <ArrowUpRight size={15} />
          </Link>
          {i.contacts.map((c) => (
            <article className="iw-source" key={c.record.id}>
              <blockquote>{c.text}</blockquote>
              <Metadata
                items={[
                  ["Channel", c.channel],
                  ["Source / native ID", `${c.source} / ${c.nativeId}`],
                  ["Source time", time(c.at)],
                  ["Ingested", time(c.record.created_at)],
                  ["Evidence ID", c.evidenceId],
                ]}
              />
            </article>
          ))}
          <details>
            <summary>Original issue record and evidence references</summary>
            <Original value={i.record} />
          </details>
        </Card>
      ))}
      {!issues.length && (
        <Card
          title={
            issueId ? "Issue unavailable" : "No emerging issue group recorded"
          }
        >
          <p>
            {issueId
              ? "This issue is unavailable or not visible to your role."
              : "The backend has not produced a recurring issue group. Individual customer reports remain available in Customer Interactions."}
          </p>
        </Card>
      )}
    </>
  );
}
export function IntelligenceWorkbench({
  view,
  id,
}: {
  view: "queue" | "workspace" | "operations" | "issues";
  id?: string;
}) {
  const { data, error, updated, refresh } = useIntelligence(view, id);
  const title =
    view === "queue"
      ? "Investigations"
      : view === "workspace"
        ? "Investigation workspace"
        : view === "operations"
          ? "Operational Intelligence"
          : "Emerging Issues";
  return (
    <section className="iw-page">
      <header className="iw-heading">
        <div>
          <p className="iw-overline">
            {view === "operations"
              ? "OPERATIONAL INTELLIGENCE / V13–V14"
              : view === "issues"
                ? "CUSTOMER INTELLIGENCE / V12"
                : "INVESTIGATIONS / V15–V17"}
          </p>
          <h1>{title}</h1>
          <p>
            {view === "workspace"
              ? "Evidence, institutional context and human review in one investigation."
              : view === "operations"
                ? "Original measurements and recorded operational incidents."
                : "Explore source-backed intelligence and its supporting evidence."}
          </p>
        </div>
        <button className="iw-button" onClick={refresh}>
          <RefreshCw size={15} /> Refresh
        </button>
      </header>
      <div className="iw-freshness">
        <Activity size={14} />
        {error
          ? "Unavailable · retrying automatically"
          : updated
            ? `Updated ${time(updated)}`
            : "Loading authorized records…"}
      </div>
      {error && (
        <Card title="Intelligence unavailable">
          <p role="alert">{error}</p>
          <p>Retry is automatic. You can also refresh now.</p>
        </Card>
      )}
      {!data && !error && (
        <p role="status" className="iw-empty">
          Loading intelligence records…
        </p>
      )}
      {data?.kind === "queue" && <InvestigationQueue data={data} />}{" "}
      {data?.kind === "workspace" && (
        <Workspace data={data} refresh={refresh} />
      )}{" "}
      {data?.kind === "operations" && <Monitoring data={data} />}{" "}
      {data?.kind === "issues" && <Issues data={data} issueId={id} />}
    </section>
  );
}
