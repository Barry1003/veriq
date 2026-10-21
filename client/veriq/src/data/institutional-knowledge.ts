import type { InstitutionalKnowledgeDataset } from "@/types/institutional-knowledge";

export const institutionalKnowledgeFixture: InstitutionalKnowledgeDataset = {
  asOf: "2026-10-20",
  sources: [
    { id: "src-catalog", title: "Service ownership catalog", kind: "catalog", reference: "SYN-CAT-001", recordedAt: "2026-10-18", description: "Synthetic inventory of banking services and accountable units." },
    { id: "src-topology", title: "Payments dependency diagram", kind: "diagram", reference: "SYN-DGM-014", recordedAt: "2026-10-16", description: "Synthetic documented links between transfer services and processing systems." },
    { id: "src-runbook", title: "Transfer operations runbook", kind: "runbook", reference: "SYN-RBK-003", recordedAt: "2026-10-17", description: "Synthetic operational reference for transfer orchestration." },
    { id: "src-channels", title: "Channel inventory", kind: "catalog", reference: "SYN-CAT-008", recordedAt: "2026-10-15", description: "Synthetic view of digital banking access channels." },
    { id: "src-change", title: "Routing change note", kind: "change-record", reference: "SYN-CHG-022", recordedAt: "2026-09-02", description: "Synthetic change record describing retirement of an earlier gateway route." },
  ],
  entities: [
    { id: "service-transfers", kind: "service", name: "Instant Transfers", summary: "Customer-facing instant funds transfer capability.", owner: "Payments Operations", reviewStatus: "verified", reviewedAt: "2026-10-18", validFrom: "2025-02-01", sourceIds: ["src-catalog", "src-runbook"] },
    { id: "service-atm", kind: "service", name: "ATM Withdrawals", summary: "Cash withdrawal service accessed through the ATM network.", owner: "Channels Operations", reviewStatus: "partial", reviewedAt: "2026-10-15", validFrom: "2025-04-15", sourceIds: ["src-catalog"] },
    { id: "system-orchestrator", kind: "system", name: "Payment Orchestrator", summary: "Coordinates transfer processing and routing within the simulated bank.", owner: "Payments Engineering", reviewStatus: "verified", reviewedAt: "2026-10-16", validFrom: "2025-02-01", sourceIds: ["src-topology", "src-runbook"] },
    { id: "system-ledger", kind: "system", name: "Ledger Posting Service", summary: "Records simulated account postings following processing decisions.", owner: "Core Banking Engineering", reviewStatus: "verified", reviewedAt: "2026-10-16", validFrom: "2025-02-01", sourceIds: ["src-topology"] },
    { id: "system-nip", kind: "system", name: "NIP Connectivity Adapter", summary: "Simulated integration boundary for external interbank transfer messages.", owner: "Payments Engineering", reviewStatus: "partial", reviewedAt: "2026-10-14", validFrom: "2025-06-01", sourceIds: ["src-topology"] },
    { id: "system-atm", kind: "system", name: "ATM Switching Layer", summary: "Routes simulated withdrawal instructions from connected ATMs.", owner: "Channels Engineering", reviewStatus: "unverified", reviewedAt: null, validFrom: "2025-04-15", sourceIds: ["src-catalog"] },
    { id: "channel-mobile", kind: "channel", name: "Mobile Banking", summary: "Retail banking mobile application channel.", owner: "Digital Channels", reviewStatus: "verified", reviewedAt: "2026-10-15", validFrom: "2025-01-01", sourceIds: ["src-channels"] },
    { id: "channel-web", kind: "channel", name: "Internet Banking", summary: "Browser-based digital banking channel.", owner: "Digital Channels", reviewStatus: "partial", reviewedAt: "2026-10-15", validFrom: "2025-01-01", sourceIds: ["src-channels"] },
    { id: "team-payments", kind: "team", name: "Payments Operations", summary: "Institutional unit accountable for transfer service operations.", owner: "Operations Division", reviewStatus: "verified", reviewedAt: "2026-10-18", validFrom: "2025-01-01", sourceIds: ["src-catalog"] },
    { id: "team-channels", kind: "team", name: "Channels Operations", summary: "Institutional unit coordinating banking channel operations.", owner: "Operations Division", reviewStatus: "partial", reviewedAt: "2026-10-15", validFrom: "2025-01-01", sourceIds: ["src-catalog"] },
  ],
  relationships: [
    { id: "rel-transfer-orchestrator", fromId: "service-transfers", toId: "system-orchestrator", kind: "depends_on", assessment: "verified", description: "Transfer instructions pass through the payment orchestration service.", validFrom: "2025-02-01", validTo: null, sourceIds: ["src-topology", "src-runbook"] },
    { id: "rel-transfer-mobile", fromId: "service-transfers", toId: "channel-mobile", kind: "exposed_via", assessment: "verified", description: "Transfers are available from the mobile banking channel.", validFrom: "2025-02-01", validTo: null, sourceIds: ["src-channels"] },
    { id: "rel-transfer-web", fromId: "service-transfers", toId: "channel-web", kind: "exposed_via", assessment: "reported", description: "Internet banking transfer entry point requires confirmation against the current channel catalog.", validFrom: "2025-02-01", validTo: null, sourceIds: ["src-channels"] },
    { id: "rel-transfer-team", fromId: "service-transfers", toId: "team-payments", kind: "operated_by", assessment: "verified", description: "Payments Operations is the accountable service unit.", validFrom: "2025-02-01", validTo: null, sourceIds: ["src-catalog"] },
    { id: "rel-orchestrator-ledger", fromId: "system-orchestrator", toId: "system-ledger", kind: "depends_on", assessment: "verified", description: "Orchestration relies on the ledger posting service.", validFrom: "2025-02-01", validTo: null, sourceIds: ["src-topology"] },
    { id: "rel-orchestrator-nip", fromId: "system-orchestrator", toId: "system-nip", kind: "routes_through", assessment: "verified", description: "Interbank instructions can route through the connectivity adapter.", validFrom: "2025-06-01", validTo: null, sourceIds: ["src-topology"] },
    { id: "rel-atm-switch", fromId: "service-atm", toId: "system-atm", kind: "depends_on", assessment: "reported", description: "The switching relationship is listed but has not been independently verified.", validFrom: "2025-04-15", validTo: null, sourceIds: ["src-catalog"] },
    { id: "rel-atm-team", fromId: "service-atm", toId: "team-channels", kind: "operated_by", assessment: "verified", description: "Channels Operations is the recorded accountable team.", validFrom: "2025-04-15", validTo: null, sourceIds: ["src-catalog"] },
    { id: "rel-atm-ledger-candidate", fromId: "system-atm", toId: "system-ledger", kind: "depends_on", assessment: "hypothesis", description: "Potential posting dependency requiring documentation and verification; not established as fact.", validFrom: "2026-10-15", validTo: null, sourceIds: [] },
    { id: "rel-old-route", fromId: "system-orchestrator", toId: "system-atm", kind: "routes_through", assessment: "reported", description: "Legacy synthetic routing association; no longer effective.", validFrom: "2025-03-01", validTo: "2026-08-31", sourceIds: ["src-change"] },
  ],
};