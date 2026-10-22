"use client";

import Link from "next/link";
import {
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  Activity,
  ChevronRight,
  CircleHelp,
  Database,
  Info,
  Network,
  X,
} from "lucide-react";
import type {
  ConnectorCategory,
  ConnectorDraft,
  ConnectorRecord,
  ConnectorRegistrySnapshot,
} from "@/types/connector-registry";

const categoryNames: Record<ConnectorCategory, string> = {
  knowledge: "Institutional Knowledge",
  operational: "Operational Monitoring",
  customer: "Customer Experience",
  investigation: "Investigation Evidence",
};

type CategoryFilter = "all" | ConnectorCategory;
type AccessFilter = "all" | "approved-example" | "draft";
type FlowFilter =
  | "all"
  | "connected-example"
  | "not-connected"
  | "receiving"
  | "review-required";
type VisibleRecord =
  | { kind: "fixture"; record: ConnectorRecord }
  | { kind: "draft"; record: ConnectorDraft };

function displayActivity(occurredAt: string | null) {
  if (!occurredAt) return "No source event";
  const parsed = new Date(occurredAt);
  if (Number.isNaN(parsed.getTime())) return "Unknown";
  const date = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "Africa/Lagos",
  }).format(parsed);
  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Africa/Lagos",
  }).format(parsed);
  return `${date} · ${time} WAT`;
}

function SectionHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="cr-section-heading">
      <h2>{title}</h2>
      {subtitle && <p>{subtitle}</p>}
    </header>
  );
}

function Panel({
  children,
  className = "",
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`cr-panel ${className}`.trim()}>
      {children}
    </section>
  );
}

function DraftDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (draft: Omit<ConnectorDraft, "id">) => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ConnectorCategory>("knowledge");
  const [owner, setOwner] = useState("");
  const [scope, setScope] = useState("");
  const [message, setMessage] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !owner.trim() || !scope.trim()) {
      setMessage(
        "Provide a source name, owner and proposed scope before recording a draft.",
      );
      return;
    }
    onCreate({
      sourceName: name.trim(),
      category,
      bankOwner: owner.trim(),
      proposedScope: scope.trim(),
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const controls = dialogRef.current?.querySelectorAll<HTMLElement>(
      "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])",
    );
    if (!controls?.length) return;
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      className="cr-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="cr-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cr-modal-title"
        onKeyDown={handleKeyDown}
      >
        <div className="cr-modal-header">
          <div>
            <p className="cr-overline">LOCAL CONFIGURATION DRAFT</p>
            <h2 id="cr-modal-title">Propose a connector</h2>
          </div>
          <button
            type="button"
            className="cr-icon-button"
            onClick={onClose}
            aria-label="Close connector draft"
          >
            <X size={20} />
          </button>
        </div>
        <p>
          This proposal exists only in this browser page. It does not create
          credentials, approve access, connect a source or send data to the
          bank.
        </p>
        <form className="cr-draft-form" onSubmit={handleSubmit}>
          <label>
            Source name
            <input
              autoFocus
              maxLength={80}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Example: Exception handling records"
            />
          </label>
          <label>
            Source class
            <select
              value={category}
              onChange={(event) =>
                setCategory(event.target.value as ConnectorCategory)
              }
            >
              {Object.entries(categoryNames).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Institutional owner
            <input
              maxLength={80}
              value={owner}
              onChange={(event) => setOwner(event.target.value)}
              placeholder="Bank-owned team"
            />
          </label>
          <label>
            Proposed permitted scope
            <textarea
              rows={3}
              maxLength={350}
              value={scope}
              onChange={(event) => setScope(event.target.value)}
              placeholder="Describe the required data classes and access boundary"
            />
          </label>
          {message && (
            <p className="cr-validation-message" role="alert">
              {message}
            </p>
          )}
          <div className="cr-form-actions">
            <button
              type="button"
              className="cr-btn cr-btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button type="submit" className="cr-btn cr-btn-primary">
              Keep local draft
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SelectionDetails({ selected }: { selected: VisibleRecord }) {
  const source =
    selected.kind === "draft" ? selected.record.sourceName : selected.record.id;
  const authorization =
    selected.kind === "draft"
      ? "Not requested · local draft"
      : `${selected.record.permissionLabel} · example`;
  const scope =
    selected.kind === "draft"
      ? selected.record.proposedScope
      : selected.record.sourceScope;
  const evidence =
    selected.kind === "draft"
      ? "No bank evidence linked"
      : selected.record.retainedSourceReferences.length
        ? selected.record.retainedSourceReferences.join(" · ")
        : "No source records ingested";
  const note =
    selected.kind === "draft"
      ? "This is not saved on a server and will disappear when the page is reloaded."
      : "These are synthetic historical references, not proof of current connection health, source freshness or transaction outcome.";
  return (
    <div
      className="cr-selected-details"
      role="region"
      aria-label="Selected connector evidence"
    >
      <div>
        <span className="cr-detail-label">SOURCE</span>
        <strong>{source}</strong>
      </div>
      <div>
        <span className="cr-detail-label">AUTHORIZATION</span>
        <span>{authorization}</span>
      </div>
      <div>
        <span className="cr-detail-label">BANK OWNER</span>
        <span>{selected.record.bankOwner}</span>
      </div>
      <div>
        <span className="cr-detail-label">PERMITTED SCOPE</span>
        <span>{scope}</span>
      </div>
      <div>
        <span className="cr-detail-label">EVIDENCE</span>
        <span>{evidence}</span>
      </div>
      <p>{note}</p>
    </div>
  );
}

function ConnectorRow({
  item,
  selected,
  detailsOpen,
  onInspect,
}: {
  item: VisibleRecord;
  selected: boolean;
  detailsOpen: boolean;
  onInspect: () => void;
}) {
  if (item.kind === "draft") {
    return (
      <tr className={selected ? "cr-selected" : undefined}>
        <td>
          <strong>{item.record.id}</strong>
          <small>{categoryNames[item.record.category]} · local proposal</small>
          <small>{item.record.bankOwner}</small>
        </td>
        <td>Not requested · draft</td>
        <td>Not connected</td>
        <td>Not started</td>
        <td className="cr-activity-cell">No source event</td>
        <td>
          <button
            type="button"
            className="cr-row-button"
            aria-label={`Inspect ${item.record.id}`}
            aria-expanded={selected && detailsOpen}
            onClick={onInspect}
          >
            <ChevronRight size={18} />
          </button>
        </td>
      </tr>
    );
  }

  const { record } = item;
  return (
    <tr className={selected ? "cr-selected" : undefined}>
      <td>
        <strong>{record.id}</strong>
        <small>{record.sourceDescription}</small>
        <small>{record.bankOwner}</small>
      </td>
      <td>{record.permissionLabel}</td>
      <td>
        {record.connection === "connected-example"
          ? "Connected · example"
          : "Not connected"}
      </td>
      <td>{record.processingLabel}</td>
      <td className="cr-activity-cell">
        {displayActivity(record.lastSourceEventAt)}
      </td>
      <td>
        <button
          type="button"
          className="cr-row-button"
          aria-label={`Inspect ${record.id}`}
          aria-expanded={selected && detailsOpen}
          onClick={onInspect}
        >
          <ChevronRight size={18} />
        </button>
      </td>
    </tr>
  );
}

export function ConnectorRegistryScreen({
  snapshot,
}: {
  snapshot: ConnectorRegistrySnapshot;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [access, setAccess] = useState<AccessFilter>("all");
  const [flow, setFlow] = useState<FlowFilter>("all");
  const [drafts, setDrafts] = useState<ConnectorDraft[]>([]);
  const [draftDialogOpen, setDraftDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>("OPS-FEED-02");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [draftNotice, setDraftNotice] = useState("");
  const addButtonRef = useRef<HTMLButtonElement>(null);

  const configured = snapshot.connectors.length;
  const approved = snapshot.connectors.filter(
    (item) => item.authorization === "approved-example",
  ).length;
  const connected = snapshot.connectors.filter(
    (item) => item.connection === "connected-example",
  ).length;
  const disconnected = snapshot.connectors.filter(
    (item) => item.connection === "not-connected",
  ).length;

  const visible = useMemo<VisibleRecord[]>(() => {
    const records: VisibleRecord[] = [
      ...snapshot.connectors.map((record) => ({
        kind: "fixture" as const,
        record,
      })),
      ...drafts.map((record) => ({ kind: "draft" as const, record })),
    ];
    const needle = query.toLocaleLowerCase().trim();

    return records.filter((item) => {
      if (item.kind === "draft") {
        const { record } = item;
        const matchesQuery =
          !needle ||
          [record.id, record.bankOwner, record.sourceName].some((value) =>
            value.toLocaleLowerCase().includes(needle),
          );
        const matchesCategory =
          category === "all" || record.category === category;
        const matchesAccess = access === "all" || access === "draft";
        const matchesFlow = flow === "all" || flow === "not-connected";
        return matchesQuery && matchesCategory && matchesAccess && matchesFlow;
      }

      const { record } = item;
      const matchesQuery =
        !needle ||
        [record.id, record.bankOwner, record.sourceDescription].some((value) =>
          value.toLocaleLowerCase().includes(needle),
        );
      const matchesCategory =
        category === "all" || record.category === category;
      const matchesAccess = access === "all" || access === record.authorization;
      const matchesFlow =
        flow === "all" ||
        (flow === "receiving" &&
          [
            "processed-example",
            "observations-received",
            "interactions-received",
            "review-required",
          ].includes(record.processing)) ||
        (flow === "review-required" &&
          record.processing === "review-required") ||
        (flow !== "receiving" &&
          flow !== "review-required" &&
          record.connection === flow);
      return matchesQuery && matchesCategory && matchesAccess && matchesFlow;
    });
  }, [access, category, drafts, flow, query, snapshot.connectors]);

  const selected =
    visible.find((item) => item.record.id === selectedId) ?? null;
  const summaries = [
    {
      label: "CONFIGURED FEEDS",
      value: String(configured),
      hint: "Across four source categories",
      icon: Database,
    },
    {
      label: "SCOPE AUTHORIZED",
      value: String(approved),
      hint: "Example bank-side approvals",
      icon: Network,
    },
    {
      label: "CONNECTED",
      value: String(connected),
      hint: "Connection not equal to ingestion",
      icon: Activity,
    },
    {
      label: "NOT CONNECTED",
      value: String(disconnected),
      hint: "Reconciliation evidence feed",
      icon: CircleHelp,
    },
  ];

  function closeDraftDialog() {
    setDraftDialogOpen(false);
    addButtonRef.current?.focus();
  }

  function createDraft(draft: Omit<ConnectorDraft, "id">) {
    const id = `DRAFT-${String(drafts.length + 1).padStart(2, "0")}`;
    setDrafts((previous) => [...previous, { ...draft, id }]);
    setSelectedId(id);
    setDetailsOpen(true);
    setDraftNotice(
      `${id} is a local unsent proposal. No authorization or connection was created.`,
    );
    closeDraftDialog();
    setQuery("");
    setCategory("all");
    setAccess("all");
    setFlow("all");
  }

  function showOperationalFeed() {
    setQuery("");
    setCategory("all");
    setAccess("all");
    setFlow("all");
    setSelectedId("OPS-FEED-02");
    setDetailsOpen(true);
    document
      .getElementById("cr-registry-details")
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <section className="cr-page" aria-labelledby="connector-registry-title">
      <header className="cr-page-heading">
        <div>
          <p className="cr-overline">ADMINISTRATION / V04 / INTEGRATIONS</p>
          <h1 id="connector-registry-title">Connector Registry</h1>
          <p>
            Manage approved feeds across institutional knowledge, operations,
            customer experience and investigation evidence.
          </p>
        </div>
        <div className="cr-creation-actions">
          <Link className="cr-btn cr-btn-primary" href="/administration/connectors/new">
            Add connector
          </Link>
          <button
            ref={addButtonRef}
            className="cr-btn cr-btn-secondary"
            type="button"
            onClick={() => setDraftDialogOpen(true)}
          >
            Quick draft
          </button>
        </div>
      </header>
      <div className="cr-disclosure" role="note">
        <Info size={20} strokeWidth={1.75} aria-hidden="true" />
        <div>
          <p>
            Bank-controlled connectors operate only within an approved
            self-hosted deployment and authorized source scope.
          </p>
          <p>
            Configured, approved, connected, receiving, and processing are
            different states. These are synthetic records—not live bank
            connections.
          </p>
        </div>
      </div>
      <SectionHeading title="Connection readiness" />
      <div className="cr-stats">
        {summaries.map(({ label, value, hint, icon: Icon }) => (
          <article className="cr-panel cr-stat" key={label}>
            <div className="cr-stat-label">
              <span>{label}</span>
              <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
            </div>
            <strong>{value}</strong>
            <small>{hint}</small>
          </article>
        ))}
      </div>
      <SectionHeading
        title="Authorized connector inventory"
        subtitle="Review source class, bank permissions, processing and evidence freshness without inferring health from approval."
      />
      <div className="cr-filters cr-panel">
        <label className="cr-filter-search">
          Find connectors
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Feed ID, name or bank owner"
          />
        </label>
        <label>
          Source class
          <select
            value={category}
            onChange={(event) =>
              setCategory(event.target.value as CategoryFilter)
            }
          >
            <option value="all">All source classes</option>
            {Object.entries(categoryNames).map(([key, value]) => (
              <option key={key} value={key}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label>
          Access
          <select
            value={access}
            onChange={(event) => setAccess(event.target.value as AccessFilter)}
          >
            <option value="all">All permissions</option>
            <option value="approved-example">Approved examples</option>
            <option value="draft">Local drafts only</option>
          </select>
        </label>
        <label>
          Data flow
          <select
            value={flow}
            onChange={(event) => setFlow(event.target.value as FlowFilter)}
          >
            <option value="all">All states</option>
            <option value="connected-example">Connected (example)</option>
            <option value="not-connected">Not connected</option>
            <option value="receiving">Records received</option>
            <option value="review-required">Review needed</option>
          </select>
        </label>
        <span className="cr-results-count" role="status">
          {visible.length} of {configured + drafts.length} records
        </span>
      </div>
      <Panel className="cr-inventory" id="cr-registry-details">
        <div className="cr-table-scroll">
          <table className="cr-table">
            <thead>
              <tr>
                <th scope="col">CONNECTOR / SOURCE CLASS</th>
                <th scope="col">APPROVED SCOPE</th>
                <th scope="col">CONNECTION</th>
                <th scope="col">PROCESSING</th>
                <th scope="col">SOURCE ACTIVITY</th>
                <th scope="col">
                  <span className="cr-sr-only">Inspect</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => (
                <ConnectorRow
                  key={item.record.id}
                  item={item}
                  selected={item.record.id === selectedId}
                  detailsOpen={detailsOpen}
                  onInspect={() => {
                    if (item.record.id === selectedId)
                      setDetailsOpen((value) => !value);
                    else {
                      setSelectedId(item.record.id);
                      setDetailsOpen(true);
                    }
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
        {!visible.length && (
          <div className="cr-empty-state" role="status">
            No connectors match these filters. Try another source class or clear
            the search.
          </div>
        )}
        <p className="cr-selection-note">
          {selected
            ? `Selected: ${selected.record.id} · Review permission boundaries and source references below.`
            : "Select a connector to inspect its evidence scope. Full V05 mapping is the next screen."}
        </p>
        {selected && detailsOpen && <SelectionDetails selected={selected} />}
        {selected?.kind === "fixture" &&
          selected.record.id === "KNW-ROUTE-01" &&
          detailsOpen && (
            <Link
              className="cr-btn cr-btn-secondary"
              href="/administration/connectors/KNW-ROUTE-01/validation?mode=example"
            >
              Inspect validation example
            </Link>
          )}
        {draftNotice && (
          <p className="cr-draft-notice" role="status">
            {draftNotice}
          </p>
        )}
      </Panel>
      <SectionHeading
        title="Bank-controlled integration boundaries"
        subtitle="Configure access without turning permission into evidence of a successful data flow."
      />
      <div className="cr-governance-grid">
        <Panel>
          <p className="cr-overline">
            SOURCE PERMISSIONS / VERIQ READ BOUNDARY
          </p>
          <dl className="cr-governance-list">
            <div>
              <dt>Institution-owned systems</dt>
              <dd>
                Core services, telemetry, documents and support feeds remain
                bank controlled
              </dd>
            </div>
            <div>
              <dt>Explicit authorization</dt>
              <dd>
                Scope and permitted data classes must be approved bank-side
              </dd>
            </div>
            <div>
              <dt>Credential protection</dt>
              <dd>
                References only · no plaintext secrets in the user interface
              </dd>
            </div>
            <div>
              <dt>Connector processing</dt>
              <dd>
                Ingested evidence retains source IDs, original timestamps and
                provenance
              </dd>
            </div>
          </dl>
          <p className="cr-footnote">
            Self-hosted Veriq stores only authorized source data and controls
            deployment-side inference.
          </p>
        </Panel>
        <Panel>
          <p className="cr-overline">INVESTIGATION EVIDENCE READINESS</p>
          <h3>Reconciliation source unavailable</h3>
          <div className="cr-muted-note">
            <strong>RCN-FEED-04 · Approved, not connected</strong>
            <p>
              Authorization exists in this example, but no settlement events
              have been ingested.
            </p>
          </div>
          <dl className="cr-side-details">
            <div>
              <dt>IMPACT ON INVESTIGATIONS</dt>
              <dd>Do not assert final transfer outcomes</dd>
            </div>
            <div>
              <dt>NEXT AUTHORIZED ACTION</dt>
              <dd>Verify feed connection and scope</dd>
            </div>
            <div>
              <dt>OBSERVED OPERATIONS</dt>
              <dd>OPS-FEED-02 has sample telemetry</dd>
            </div>
          </dl>
          <button
            type="button"
            className="cr-btn cr-btn-primary"
            onClick={showOperationalFeed}
          >
            Inspect operational feed
          </button>
        </Panel>
      </div>
      {draftDialogOpen && (
        <DraftDialog onClose={closeDraftDialog} onCreate={createDraft} />
      )}
    </section>
  );
}
