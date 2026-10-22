import { connectorRegistryFixture } from "@/data/connector-registry";
import { knowledgeSourcesFixture } from "@/data/knowledge-sources";
import { customerInteractionFixture } from "@/data/customer-interactions";
import type {
  KnowledgeConnectorVariant,
  CustomerConnectorVariant,
  KnowledgeOriginalRecord,
} from "@/types/connector-variants";
import type { ConnectorRecord } from "@/types/connector-registry";

function connectorById(id: string): ConnectorRecord {
  const connector = connectorRegistryFixture.connectors.find((c) => c.id === id);
  if (!connector) throw new Error(`V05 fixture requires connector ${id}`);
  return connector;
}
const routingCollection = knowledgeSourcesFixture.collections.find((c) => c.id === "SRC-ROUTE-01");
if (!routingCollection) throw new Error("V05 fixture requires SRC-ROUTE-01");

const routeRecords: readonly KnowledgeOriginalRecord[] = [
  { id: "ROUTE-0297", version: "v8", description: "Original G3 relationship; effective date present", validation: "validated", knowledgeState: "Policy-accepted relation", gateway: "G3", effectiveFrom: "2026-10-20T09:20:00+01:00", originalEventAt: "2026-10-20T09:20:00+01:00", ingestedAt: "2026-10-21T14:03:00+01:00", schema: "routing_config.v8" },
  { id: "ROUTE-0298", version: "v8", description: "Original preserved; effective_from missing", validation: "invalid", knowledgeState: "Not promoted", gateway: "G3", effectiveFrom: null, originalEventAt: "2026-10-21T14:06:00+01:00", ingestedAt: null, schema: "routing_config.v8" },
  { id: "ROUTE-0195", version: "v7", description: "G2 relationship valid before revision v8", validation: "historic", knowledgeState: "Historical relation", gateway: "G2", effectiveFrom: null, originalEventAt: null, ingestedAt: null, schema: "routing_config.v7" },
];

export const knowledgeConnectorVariantFixture: KnowledgeConnectorVariant = {
  kind: "synthetic-preview", variant: "knowledge", connector: connectorById("KNW-ROUTE-01"),
  sourceCollectionId: routingCollection.id,
  routingRevisions: routingCollection.revisions.map((r) => r.version),
  owner: routingCollection.inspectorOwner,
  metrics: [
    { label: "SOURCE AUTHORIZATION", value: "Approved · example", detail: "Read-only routing scope" },
    { label: "CONNECTIVITY", value: "Connected · example", detail: "Current health unverified" },
    { label: "VALID RECORD", value: "ROUTE-0297", detail: "Accepted under source policy" },
    { label: "INVALID RECORD", value: "ROUTE-0298", detail: "Held · schema validation failed" },
  ],
  records: routeRecords,
  mappings: [
    { source: "source_route_id", target: "original_source_id", handling: "Immutable identifier" },
    { source: "gateway_id", target: "relationship.target_id", handling: "Map as source claim" },
    { source: "effective_from", target: "valid_from", handling: "Bank valid time" },
    { source: "source_revision", target: "source_version", handling: "Retain v7 and v8" },
    { source: "observed_at", target: "bank_source_event_at", handling: "Separate from ingestion" },
  ],
};

const cxStatuses: Record<string, string> = {
  "CX-0081": "Source retained", "CX-0087": "Reviewable", "CX-0090": "Normalized",
};
export const customerConnectorVariantFixture: CustomerConnectorVariant = {
  kind: "synthetic-preview", variant: "customer", connector: connectorById("CX-FEED-03"),
  contactTotal: customerInteractionFixture.receivedCount,
  channelTotal: customerInteractionFixture.channelSummaries.length,
  uniqueCustomers: customerInteractionFixture.uniqueCustomers,
  sourceOwner: "Cedar Service",
  emergingIssueId: customerInteractionFixture.emergingIssueId,
  metrics: [
    { label: "SOURCE AUTHORIZATION", value: "Approved · example", detail: "Scoped case records" },
    { label: "CONNECTED CHANNELS", value: String(customerInteractionFixture.channelSummaries.length), detail: "In-app, call centre, branch" },
    { label: "INGESTED CONTACTS", value: String(customerInteractionFixture.receivedCount), detail: "Not unique customers" },
    { label: "AI CLASSIFICATION", value: "Reviewable", detail: "Original claim retained" },
  ],
  contacts: customerInteractionFixture.listedContacts
    .filter((c) => ["CX-0081", "CX-0087", "CX-0090"].includes(c.id))
    .map((c) => ({
      id: c.id,
      channel: c.channel === "in-app" ? "Cedar in-app" : c.channel === "call-centre" ? "Call centre" : "Branch support",
      receivedAt: c.receivedAt,
      status: cxStatuses[c.id] ?? "Source retained",
      summary: c.summary,
      caseId: c.caseId,
      originalStatement: c.originalStatement,
      suggestedCategory: c.id === "CX-0081" ? "Reported transfer delay" : null,
      claimedOutcome: c.id === "CX-0081" ? "Debit reported; receipt unconfirmed" : null,
      transactionLink: c.transferReference,
    })),
  mappings: [
    { source: "message_id", target: "original_source_id", handling: "Preserve raw channel ID" },
    { source: "created_at", target: "source_event_at", handling: "Separate from ingestion time" },
    { source: "customer_reference", target: "authorized_subject_ref", handling: "Scoped and pseudonymized" },
    { source: "message_content", target: "original_report_text", handling: "Keep source content unmodified" },
    { source: "category_candidate", target: "reviewable_issue_label", handling: "AI task and evidence reference" },
  ],
};

