import type { CustomerInteractionSnapshot } from "@/types/customer-interactions";

export const customerInteractionFixture: CustomerInteractionSnapshot = {
  kind: "synthetic-preview",
  receivedCount: 9,
  uniqueCustomers: null,
  emergingIssueId: "EMG-009",
  emergingIssueTitle: "Similar delayed-transfer reports",
  issueCount: 1,
  linkedOperationalIncident: "INC-042",
  channelSummaries: [
    { channel: "in-app", name: "Cedar in-app support", contacts: 4 },
    { channel: "call-centre", name: "Contact centre", contacts: 3 },
    { channel: "branch", name: "Branch service desk", contacts: 2 },
  ],
  listedContacts: [
    {
      id: "CX-0081", channel: "in-app", receivedAt: "2026-10-21T14:08:00+01:00",
      ingestedAt: "2026-10-21T14:08:09+01:00", issueCategory: "delay",
      claim: "Transfer seems delayed", summary: "Customer reports debit; outcome unconfirmed",
      sourceNote: "TX-10482 optional link",
      originalStatement: "I was debited, but the recipient hasn't confirmed receiving it.",
      caseId: "CASE-0192", caseStatus: "Review", transferReference: "TX-10482", transferOutcome: "unknown",
    },
    {
      id: "CX-0087", channel: "call-centre", receivedAt: "2026-10-21T14:16:00+01:00",
      ingestedAt: null, issueCategory: "confirmation",
      claim: "Recipient has not confirmed", summary: "Original caller statement preserved",
      sourceNote: "Transaction not linked", originalStatement: null,
      caseId: "CASE-0195", caseStatus: "Open", transferReference: null, transferOutcome: "unknown",
    },
    {
      id: "CX-0090", channel: "branch", receivedAt: "2026-10-21T14:31:00+01:00",
      ingestedAt: null, issueCategory: "status-inquiry",
      claim: "Transfer status inquiry", summary: "Staff records beneficiary concern",
      sourceNote: "Reference uncertain", originalStatement: null,
      caseId: "CASE-0199", caseStatus: "Open", transferReference: null, transferOutcome: "unknown",
    },
    {
      id: "CX-0091", channel: "in-app", receivedAt: "2026-10-21T14:42:00+01:00",
      ingestedAt: null, issueCategory: "delay",
      claim: "Payment pending longer", summary: "Customer describes a delay",
      sourceNote: "No source payment proof", originalStatement: null,
      caseId: "CASE-0201", caseStatus: "New", transferReference: null, transferOutcome: "unknown",
    },
    {
      id: "CX-0094", channel: "call-centre", receivedAt: "2026-10-21T14:55:00+01:00",
      ingestedAt: null, issueCategory: "status-inquiry",
      claim: "Asked for transfer update", summary: "Original contact record retained",
      sourceNote: "Transaction link pending", originalStatement: null,
      caseId: "CASE-0204", caseStatus: "New", transferReference: null, transferOutcome: "unknown",
    },
  ],
};

