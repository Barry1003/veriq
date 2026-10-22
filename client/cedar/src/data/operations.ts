export const overviewCards = [
    { label: "G2 TIMEOUT OBSERVATION", value: "4.1%", detail: "Source event · OPS-00128", href: "/staff/payment-routes" },
    { label: "UNRESOLVED SOURCE STATES", value: "2 records", detail: "TX-10482 unknown · TX-10484 pending", href: "/staff/transactions" },
    { label: "SUPPORT INTERACTIONS", value: "9 contacts", detail: "3 channels · unique customers unknown", href: "/staff/support-channels" },
    { label: "AUTHORIZED FEED SCOPES", value: "4", detail: "Approved ≠ connected or current", href: "/staff/authorizations" },
];
export const attentionRecords = [
    { eyebrow: "01 · GATEWAY OBSERVATION", title: "Gateway G2 timeout increase", subtitle: "OPS-00128 · 14:06 WAT · measured 4.1%", caveat: "Technical observation; transfer failures unverified.", href: "/staff/payment-routes" },
    { eyebrow: "02 · FINANCIAL STATUS CHECK", title: "TX-10482 outcome still unknown", subtitle: "Bank reconciliation evidence not yet available", caveat: "A missing final outcome does not establish failure or refund.", href: "/staff/transactions" },
    { eyebrow: "03 · SUPPORT SOURCE REVIEW", title: "Nine interactions across three channels", subtitle: "CX-0081 and source peers · duplicates possible", caveat: "Customer reports remain claims, not diagnosed root causes.", href: "/staff/support-channels" },
];
export const feeds = [
    { id: "OPS-FEED-02", label: "Operational telemetry", detail: "G2 source update 14:07 WAT; ingestion unverified", href: "/staff/payment-routes" },
    { id: "RCN-FEED-04", label: "Reconciliation evidence", detail: "Case-scoped; TX-10482 outcome unresolved", href: "/staff/transactions" },
    { id: "CX-FEED-03", label: "Customer-service records", detail: "9 logged contacts; ingestion freshness unverified", href: "/staff/support-channels" },
    { id: "KNW-FEED-01", label: "Institutional knowledge", detail: "Route source v8 exists; freshness not verified", href: "/staff/institutional-sources" },
];
export const transactions = [
    { id: "TX-10482", status: "Outcome unknown", evidence: "Awaiting final record", amount: "₦50,000.00", route: "G2" },
    { id: "TX-10483", status: "Successful", evidence: "Settlement confirmed", amount: "₦25,000.00", route: "G3" },
    { id: "TX-10484", status: "Pending", evidence: "Processing record", amount: "₦10,000.00", route: "G2" },
];
export const interactions = [
    { id: "CX-0081", time: "14:08 WAT", channel: "In-app", title: "Customer reports a delayed transfer", detail: "View original channel record and any linked case.", caseId: "CASE-0192" },
    { id: "CX-0082", time: "14:16 WAT", channel: "Call centre", title: "Caller says debit is visible", detail: "Customer report only; bank outcome unknown.", caseId: "CASE-0192" },
    { id: "CX-0083", time: "14:31 WAT", channel: "Branch", title: "Staff records beneficiary concern", detail: "No independent recipient status provided.", caseId: "CASE-0192" },
];
export const institutionalSources = [
    { title: "Instant Transfer routing configuration", version: "v8 · Current", date: "Effective from 20 Oct 2026", owner: "Payments Engineering", current: true },
    { title: "Instant Transfer routing configuration", version: "v7 · Historical", date: "Valid until 20 Oct 2026", owner: "Payments Engineering", current: false },
    { title: "Transfer exception handling SOP", version: "v3 · Published", date: "Effective from 09 Sep 2026", owner: "Bank Operations", current: true },
    { title: "Gateway service dependency map", version: "v5 · Published", date: "Reviewed 01 Oct 2026", owner: "IT Operations", current: true },
];
export const authorizations = [
    { title: "Institutional knowledge", description: "Approved documentation and configuration sources", status: "Authorized" },
    { title: "Operational telemetry", description: "Scoped gateway observations · OPS-FEED-02", status: "Authorized" },
    { title: "Customer interactions", description: "Original reports from approved bank-side channels", status: "Authorized" },
    { title: "Investigation evidence", description: "Permissioned transaction and reconciliation records", status: "Authorized · case-scoped" },
];

