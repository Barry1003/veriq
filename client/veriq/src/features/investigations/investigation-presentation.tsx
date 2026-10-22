import type { ReactNode } from "react";
import type { JsonObject } from "@/services/api/veriq";
import type { Statement } from "@/types/investigations";
import { FileSearch } from "lucide-react";
export const text = (v: unknown) =>
  typeof v === "string"
    ? v
    : typeof v === "number" || typeof v === "boolean"
      ? String(v)
      : "Not recorded";
export const list = (v: unknown) => (Array.isArray(v) ? v : []);
export const obj = (v: unknown): JsonObject =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as JsonObject) : {};
export function time(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? value
    : date.toLocaleString("en-GB", {
        timeZone: "Africa/Lagos",
        dateStyle: "medium",
        timeStyle: "medium",
      }) + " WAT";
}
export function Badge({ children }: { children: ReactNode }) {
  return <span className="iw-badge">{children}</span>;
}
export function Card({
  title,
  children,
  id,
}: {
  title: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section className="iw-card" id={id}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}
export function Metadata({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="iw-metadata">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
export function Original({ value }: { value: unknown }) {
  return <pre className="iw-original">{JSON.stringify(value, null, 2)}</pre>;
}
export function EvidenceReferences({
  ids,
  onInspect,
}: {
  ids: string[];
  onInspect: (id: string) => void;
}) {
  return (
    <div className="iw-refs">
      {ids.map((id) => (
        <button key={id} onClick={() => onInspect(id)} title={id}>
          <FileSearch size={13} /> {id.slice(0, 8)}
        </button>
      ))}
    </div>
  );
}
export function Statements({
  items,
  onInspect,
}: {
  items: Statement[];
  onInspect: (id: string) => void;
}) {
  return items.length ? (
    <div className="iw-statements">
      {items.map((item, index) => (
        <article key={index}>
          <p>
            {text(
              item.details.text ??
                item.details.summary ??
                item.details.conclusion ??
                item.details.label ??
                item.details.basis ??
                item.details.rule ??
                item.details.field,
            )}
          </p>
          {item.details.value !== undefined && (
            <p>
              <strong>Source value:</strong>{" "}
              {item.details.value === null ? "null" : text(item.details.value)}
            </p>
          )}
          {item.details.scope !== undefined && (
            <p>
              Source scope: {text(item.details.scope)} ·{" "}
              {text(item.details.source_id)}
            </p>
          )}
          {item.details.explanation !== undefined && (
            <p>{text(item.details.explanation)}</p>
          )}
          {Array.isArray(item.details.supports) && (
            <>
              <p>Model-proposed supporting evidence</p>
              <EvidenceReferences
                ids={item.details.supports.map(text)}
                onInspect={onInspect}
              />
            </>
          )}
          {Array.isArray(item.details.weakens) && (
            <>
              <p>Model-proposed contradicting evidence</p>
              <EvidenceReferences
                ids={item.details.weakens.map(text)}
                onInspect={onInspect}
              />
            </>
          )}
          {item.details.next_check !== undefined && (
            <p>Next check: {text(item.details.next_check)}</p>
          )}
          {item.details.kind !== undefined && (
            <Badge>{text(item.details.kind)}</Badge>
          )}
          {item.details.transaction_id !== undefined && (
            <p className="iw-mono">
              Transaction {text(item.details.transaction_id)}
            </p>
          )}
          {item.details.beneficiary_verified !== undefined && (
            <p>
              Beneficiary receipt:{" "}
              <strong>
                {item.details.beneficiary_verified === true
                  ? "Verified by recorded source"
                  : "Not independently verified"}
              </strong>
            </p>
          )}
          <EvidenceReferences ids={item.evidenceIds} onInspect={onInspect} />
          <details>
            <summary>Inspect structured finding</summary>
            <Original value={item.details} />
          </details>
        </article>
      ))}
    </div>
  ) : (
    <p className="iw-muted">None recorded for this revision.</p>
  );
}
