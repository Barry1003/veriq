"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowLeft } from "lucide-react";
import type { WorkspaceData } from "@/types/investigations";
import { InvestigationAnalysis } from "./investigation-analysis";
import {
  Badge,
  Card,
  Metadata,
  Original,
  EvidenceReferences,
  Statements,
  text,
  list,
  obj,
  time,
} from "./investigation-presentation";
function ReviewActions({
  data,
  refresh,
}: {
  data: WorkspaceData;
  refresh: () => void;
}) {
  const [rationale, setRationale] = useState(""),
    [action, setAction] = useState("review"),
    [state, setState] = useState("investigating"),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const session = await fetch("/api/session", { cache: "no-store" });
      const auth = await session.json();
      if (!session.ok) throw new Error(auth.error ?? "Session unavailable");
      const response = await fetch("/api/intelligence", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": auth.csrf,
        },
        body: JSON.stringify({
          id: data.investigation.id,
          revisionId: data.investigation.latestRevisionId,
          rationale,
          action,
          state,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Action failed");
      setMessage("Recorded. Cedar financial state is unchanged.");
      setRationale("");
      refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action unavailable");
      if (error instanceof Error && error.message.includes("revision"))
        refresh();
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card title="Human review">
      {data.canReview ? (
        <form className="iw-review" onSubmit={submit}>
          <p>
            Applies to the latest revision ({data.investigation.revision}).
            Review does not reconcile a transaction.
          </p>
          <label>
            Action
            <select value={action} onChange={(e) => setAction(e.target.value)}>
              <option value="review">Record review</option>
              <option value="state">Change investigation state</option>
            </select>
          </label>
          {action === "state" && (
            <label>
              New state
              <select value={state} onChange={(e) => setState(e.target.value)}>
                <option>open</option>
                <option>investigating</option>
                <option>resolved</option>
              </select>
            </label>
          )}
          <label>
            Rationale
            <textarea
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              minLength={5}
              maxLength={2000}
              required
            />
          </label>
          <button
            className="iw-button iw-primary"
            disabled={busy || rationale.trim().length < 5}
          >
            {busy ? "Recording…" : "Submit review action"}
          </button>
        </form>
      ) : (
        <p>
          Your investigator role can inspect this workspace. An authorized
          reviewer is required to record decisions.
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {data.reviews.map((r) => (
        <details key={r.id}>
          <summary>
            {time(r.created_at)} · {text(r.data.actor)}
          </summary>
          <Metadata
            items={[
              ["Reviewed revision", text(r.data.revision_id)],
              ["Rationale", text(r.data.rationale)],
            ]}
          />
        </details>
      ))}
    </Card>
  );
}
export function Workspace({
  data,
  refresh,
}: {
  data: WorkspaceData;
  refresh: () => void;
}) {
  const [revisionId, storeRevisionId] = useState(() =>
      typeof window === "undefined"
        ? "latest"
        : (new URL(window.location.href).searchParams.get("revision") ??
          "latest"),
    ),
    [evidenceId, setEvidenceId] = useState<string | null>(null);
  const setRevisionId = (id: string) => {
    storeRevisionId(id);
    const url = new URL(window.location.href);
    if (id === "latest") url.searchParams.delete("revision");
    else url.searchParams.set("revision", id);
    window.history.replaceState(null, "", url);
  };
  const revision =
    revisionId === "latest"
      ? data.revisions.find(
          (r) => r.record.id === data.investigation.latestRevisionId,
        )
      : data.revisions.find((r) => r.record.id === revisionId);
  const inspect = (id: string) => {
    setEvidenceId(id);
    document
      .getElementById("workspace-evidence")
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };
  if (!revision)
    return (
      <Card title="Revision unavailable">
        <p>The selected revision is no longer visible.</p>
        <button onClick={() => setRevisionId("latest")}>
          Open latest revision
        </button>
      </Card>
    );
  const allowedEvidence = data.evidence.filter((e) =>
      revision.evidenceIds.includes(e.id),
    ),
    selected = allowedEvidence.find((e) => e.id === evidenceId);
  const observations = allowedEvidence.filter(
      (e) => e.data.record_type === "observation",
    ),
    reports = allowedEvidence.filter(
      (e) => e.data.record_type === "interaction",
    ),
    entities = list(revision.context.entities).map(obj),
    relationships = list(revision.context.relationships).map(obj);
  return (
    <>
      <Link className="iw-back" href="/investigations">
        <ArrowLeft size={16} /> Investigation queue
      </Link>
      <Card title="Investigation summary">
        <div className="iw-card-heading">
          <h3 className="iw-mono">{data.investigation.id}</h3>
          <Badge>{data.investigation.state}</Badge>
        </div>
        <Metadata
          items={[
            [
              "Initiation",
              data.investigation.triggerType === "incident"
                ? "Operational detector"
                : "Customer interaction",
            ],
            [
              "Source trigger",
              <Link
                key="trigger"
                className="iw-mono"
                href={
                  data.investigation.triggerType === "incident"
                    ? `/operations#${data.investigation.triggerId}`
                    : "/customer-experience"
                }
              >
                {data.investigation.triggerId}
              </Link>,
            ],
            ["Created", time(data.investigation.createdAt)],
            ["Latest revision", String(data.investigation.revision)],
            [
              "Updated",
              time(
                data.revisions.find(
                  (r) => r.record.id === data.investigation.latestRevisionId,
                )?.record.created_at ?? data.investigation.createdAt,
              ),
            ],
            ["Source evidence", String(revision.evidenceIds.length)],
          ]}
        />
        <label className="iw-revision">
          Viewing revision
          <select
            aria-label="Investigation revision"
            value={revisionId}
            onChange={(e) => {
              setRevisionId(e.target.value);
              setEvidenceId(null);
            }}
          >
            <option value="latest">
              Latest · revision {data.investigation.revision}
            </option>
            {[...data.revisions].reverse().map((r) => (
              <option key={r.record.id} value={r.record.id}>
                Revision {r.number} · {time(r.record.created_at)}
              </option>
            ))}
          </select>
        </label>
        <p className="iw-muted">
          Viewing revision {revision.number} · {revision.record.id} · assembled{" "}
          {time(revision.record.created_at)}
        </p>
      </Card>
      {data.warnings.map((w) => (
        <p key={w} role="status">
          {w}
        </p>
      ))}
      <div className="iw-workspace-grid">
        <div className="iw-main">
          <InvestigationAnalysis
            assessment={data.assessments[revision.record.id]}
            onInspect={inspect}
          />
          <Card title="Source-backed findings">
            <p className="iw-muted">
              Method: {text(revision.record.data.method)}
            </p>
            <Statements items={revision.findings} onInspect={inspect} />
            <h3>Observational associations</h3>
            <Statements items={revision.correlations} onInspect={inspect} />
            <h3>Unverified hypotheses</h3>
            <Statements items={revision.hypotheses} onInspect={inspect} />
          </Card>
          <Card title="Operational evidence" id="operational-evidence">
            {observations.map((e) => {
              const p = obj(e.data.payload);
              return (
                <article key={e.id} className="iw-source">
                  <h3>
                    {text(p.route_id)} / {text(p.gateway_id)}
                  </h3>
                  <Metadata
                    items={[
                      ["Measured", time(text(p.occurred_at))],
                      ["Source", text(e.data.source_id)],
                      [
                        "Attempts / timeouts",
                        `${text(p.attempts)} / ${text(p.timeouts)}`,
                      ],
                      ["Window", `${text(p.window_seconds)} seconds`],
                    ]}
                  />
                  <EvidenceReferences ids={[e.id]} onInspect={inspect} />
                </article>
              );
            })}
            {!observations.length && (
              <p>No operational observations linked in this revision.</p>
            )}
          </Card>
          <Card title="Institutional context at the event">
            <Metadata
              items={[
                ["Effective at", time(text(revision.context.at))],
                ["Known at", time(text(revision.context.known_at))],
              ]}
            />
            <div className="iw-entity-grid">
              {entities.map((e, index) => (
                <article className="iw-source" key={index}>
                  <Badge>{text(e.kind)}</Badge>
                  <h3>{list(e.names).map(text).join(", ")}</h3>
                  <p>{text(e.native_id)}</p>
                  <EvidenceReferences
                    ids={list(e.evidence_ids).map(text)}
                    onInspect={inspect}
                  />
                </article>
              ))}
            </div>
            {relationships.map((r, index) => (
              <article className="iw-source" key={index}>
                <strong>
                  {text(r.subject)} → {text(r.predicate)} → {text(r.object)}
                </strong>
                <p>
                  {text(r.state)} · {text(r.semantics)}
                </p>
                <EvidenceReferences
                  ids={list(r.evidence_ids).map(text)}
                  onInspect={inspect}
                />
              </article>
            ))}
            {!entities.length && (
              <p>No source-backed historical context recorded.</p>
            )}
            <p className="iw-muted">
              Structural dependencies do not establish the cause of this event.
            </p>
          </Card>
          <Card title="Customer experience evidence">
            {reports.map((e) => {
              const p = obj(e.data.payload);
              return (
                <article className="iw-source" key={e.id}>
                  <Badge>{text(p.channel)}</Badge>
                  <blockquote>{text(p.text)}</blockquote>
                  <Metadata
                    items={[
                      ["Source", text(e.data.source_id)],
                      ["Native reference", text(e.data.native_record_id)],
                      ["Customer", text(p.customer_id)],
                      ["Transaction", text(p.transaction_id)],
                      ["Source event", time(text(p.occurred_at))],
                      ["Ingested", time(text(e.data.received_at))],
                      ["Classification", e.classification],
                    ]}
                  />
                  <EvidenceReferences ids={[e.id]} onInspect={inspect} />
                </article>
              );
            })}
            {!reports.length && (
              <p>
                No customer report linked in this revision. The investigation
                may have been initiated proactively.
              </p>
            )}
            <p className="iw-muted">
              Customer statements preserve the reported experience;
              authoritative financial status is reviewed separately.
            </p>
          </Card>
          <Card title="Impact and recovery">
            <h3>Potentially associated services and routes</h3>
            <p>
              {entities
                .map((e) => `${text(e.native_id)} (${text(e.kind)})`)
                .join(" · ") || "No authorized context supplied"}
            </p>
            <h3>Outstanding uncertainty</h3>
            <ul>
              {revision.unknowns.map((s, index) => (
                <li key={index}>{s}</li>
              ))}
            </ul>
            <h3>Source-backed status and reconciliation</h3>
            <Statements
              items={revision.findings.filter(
                (f) =>
                  f.details.kind === "recorded_status" ||
                  f.details.kind === "contradiction",
              )}
              onInspect={inspect}
            />
            <h3>Recommended next checks</h3>
            <Statements items={revision.recommendations} onInspect={inspect} />
          </Card>
          <ReviewActions data={data} refresh={refresh} />
        </div>
        <aside className="iw-side">
          <Card title="Evidence inspector" id="workspace-evidence">
            <p>
              {allowedEvidence.length} source records in revision{" "}
              {revision.number}
            </p>
            <label>
              Select evidence
              <select
                aria-label="Select evidence"
                value={selected?.id ?? ""}
                onChange={(e) => setEvidenceId(e.target.value)}
              >
                <option value="">Choose a source record</option>
                {allowedEvidence.map((e) => (
                  <option key={e.id} value={e.id}>
                    {text(e.data.record_type)} · {e.id.slice(0, 8)}
                  </option>
                ))}
              </select>
            </label>
            {selected ? (
              <>
                <Metadata
                  items={[
                    ["Evidence ID", selected.id],
                    ["Source ID", text(selected.data.source_id)],
                    ["Native reference", text(selected.data.native_record_id)],
                    ["Event time", time(text(selected.data.occurred_at))],
                    ["Ingested", time(text(selected.data.received_at))],
                    ["Classification", selected.classification],
                    ["Processing", text(selected.data.processing_state)],
                    [
                      "Review status",
                      data.reviews.some(
                        (r) => r.data.revision_id === revision.record.id,
                      )
                        ? "Revision reviewed"
                        : "No review recorded for revision",
                    ],
                  ]}
                />
                <h3>Original source content</h3>
                <Original value={selected.data.payload} />
                <details>
                  <summary>Full provenance</summary>
                  <Original value={selected} />
                </details>
              </>
            ) : (
              <p className="iw-muted">
                Choose a citation or source record to inspect its original
                content.
              </p>
            )}
          </Card>
          <Card title="AI task activity">
            {data.tasks.length ? (
              data.tasks.map((t) => (
                <article className="iw-source" key={t.task.id}>
                  <Badge>{text(t.task.data.state)}</Badge>
                  <p className="iw-mono">{t.task.id}</p>
                  <p>
                    {text(t.task.data.task)} · outcome{" "}
                    {text(
                      t.task.data.outcome ??
                        obj(t.task.data.adaptive_progress).outcome,
                    )}
                  </p>
                  <p>Revision {text(t.task.data.revision_id)}</p>
                  {t.redacted ? (
                    <p role="status">
                      {t.error ?? t.reason ?? "Tool trace redacted"}
                    </p>
                  ) : (
                    t.steps.map((s) => (
                      <details key={s.id}>
                        <summary>Step · {time(s.created_at)}</summary>
                        <Original value={s.data} />
                      </details>
                    ))
                  )}
                </article>
              ))
            ) : (
              <p>No visible AI tasks for this investigation.</p>
            )}
            <p className="iw-muted">
              Task completion does not establish reasoning quality or an
              accepted conclusion.
            </p>
          </Card>
          <Card title="Revision history">
            <ol className="iw-history">
              {[...data.revisions].reverse().map((r) => (
                <li key={r.record.id}>
                  <button
                    aria-pressed={revision.record.id === r.record.id}
                    onClick={() => {
                      setRevisionId(r.record.id);
                      setEvidenceId(null);
                    }}
                  >
                    Revision {r.number}
                    {r.record.id === data.investigation.latestRevisionId
                      ? " · latest"
                      : ""}
                  </button>
                  <small>
                    {time(r.record.created_at)} · {r.evidenceIds.length}{" "}
                    evidence records
                  </small>
                </li>
              ))}
            </ol>
          </Card>
        </aside>
      </div>
    </>
  );
}
