import { institutionalKnowledgeFixture } from "@/data/institutional-knowledge";
import type { SystemHealthSnapshot } from "@/types/system-health";

const knowledgeSourceCount = institutionalKnowledgeFixture.sources.length;

export const systemHealthFixture: SystemHealthSnapshot = {
  kind: "synthetic-preview",
  institution: "Cedar Bank",
  environment: "Cedar Bank demo environment",
  hostingLabel: "Bank-held",
  inferenceStatus: "Test pending",
  healthCertainty: "Unverified",
  services: [
    {
      id: "veriq-api",
      name: "Veriq API",
      purpose: "Bank-controlled application service",
      evidence: "No authenticated health probe has run",
      state: "unknown",
      statusLabel: "Unknown",
    },
    {
      id: "knowledge-processing",
      name: "Knowledge processing",
      purpose: "Document extraction and review",
      evidence: `${knowledgeSourceCount} synthetic source records in local fixture`,
      state: "historical",
      statusLabel: "Historical sample",
    },
    {
      id: "operations",
      name: "Operational monitoring",
      purpose: "Source-backed detector",
      evidence: "OPS-00128 · sample observed at 14:06 WAT",
      state: "historical",
      statusLabel: "Historical sample",
    },
    {
      id: "audit",
      name: "Audit service",
      purpose: "Records institutional events and reviews",
      evidence: "No authenticated audit write/read test",
      state: "unknown",
      statusLabel: "Not verified live",
    },
    {
      id: "local-inference",
      name: "Local inference runtime",
      purpose: "Approved on-prem model slot",
      evidence: "Readiness test not executed",
      state: "pending",
      statusLabel: "Test pending",
    },
  ],
  sources: [
    {
      id: "KNW-ROUTE-01",
      description: "Knowledge · route configuration",
      lastEvent: "14:03 WAT",
      freshness: "Current freshness unknown",
      state: "historical",
    },
    {
      id: "OPS-FEED-02",
      description: "Operational · gateway telemetry",
      lastEvent: "14:07 WAT",
      freshness: "Current freshness unknown",
      state: "historical",
    },
    {
      id: "CX-FEED-03",
      description: "Customer · service contacts",
      lastEvent: "14:55 WAT",
      freshness: "Current freshness unknown",
      state: "historical",
    },
    {
      id: "RCN-FEED-04",
      description: "Investigation · settlement",
      lastEvent: null,
      freshness: "Not connected in synthetic scenario",
      state: "not-connected",
    },
  ],
  requiredChecks: [
    {
      id: "api",
      title: "API reachability",
      requirement: "Authenticated service probe",
      state: "not-tested",
    },
    {
      id: "worker",
      title: "Worker heartbeat",
      requirement: "Signed worker heartbeat",
      state: "not-tested",
    },
    {
      id: "freshness",
      title: "Source freshness",
      requirement: "Compare ingested event lag with bank policy",
      state: "not-tested",
    },
    {
      id: "audit",
      title: "Audit write/read",
      requirement: "Verify persisted, attributable audit entry",
      state: "not-tested",
    },
    {
      id: "inference",
      title: "Local AI inference",
      requirement: "Approved model and scope-specific response test",
      state: "not-tested",
    },
  ],
};
