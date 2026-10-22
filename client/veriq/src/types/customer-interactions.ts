export type CustomerChannel = "in-app" | "call-centre" | "branch" | "email";
export type CustomerIssueCategory = "delay" | "confirmation" | "status-inquiry" | "unclassified";
export type CustomerCaseStatus = "Review" | "Open" | "New" | "Not tracked";

export type CustomerContact = {
  readonly id: string;
  readonly channel: CustomerChannel;
  readonly receivedAt: string;
  readonly ingestedAt: string | null;
  readonly issueCategory: CustomerIssueCategory;
  readonly claim: string;
  readonly summary: string;
  readonly sourceNote: string;
  readonly originalStatement: string | null;
  readonly customerReference?: string | null;
  readonly evidenceId?: string | null;
  readonly classification?: string;
  readonly nativeChannel?: string;
  readonly caseId: string | null;
  readonly caseStatus: CustomerCaseStatus;
  readonly transferReference: string | null;
  readonly transferOutcome: "unknown";
};

export type CustomerChannelSummary = {
  readonly channel: CustomerChannel;
  readonly name: string;
  readonly contacts: number;
};

export type CustomerInteractionSnapshot = {
  readonly kind: "synthetic-preview" | "live";
  readonly receivedCount: number;
  readonly uniqueCustomers: number | null;
  readonly emergingIssueId: string | null;
  readonly emergingIssueTitle: string;
  readonly issueCount: number;
  readonly channelSummaries: readonly CustomerChannelSummary[];

  readonly listedContacts: readonly CustomerContact[];
  readonly linkedOperationalIncident: string | null;
};

