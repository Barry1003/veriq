import type { CustomerChannel, CustomerContact, CustomerInteractionSnapshot } from "@/types/customer-interactions";
import { string, VeriqApiError, type VeriqApi } from "../api/veriq";

const channels: Record<string, { id: CustomerChannel; name: string }> = {
  in_app: { id: "in-app", name: "In-app" },
  contact_centre: { id: "call-centre", name: "Call centre" },
  branch: { id: "branch", name: "Branch" },
  email: { id: "email", name: "Email" },
};

export async function getLiveCustomerInteractions(api: VeriqApi): Promise<CustomerInteractionSnapshot> {
  const [interactions, issues] = await Promise.all([api.rows("interactions"), api.rows("issues")]);
  const contacts: CustomerContact[] = interactions.map(({ id, created_at, data }) => {
    const channel = channels[string(data.channel)];
    if (!channel) throw new VeriqApiError("Unknown customer interaction channel.", null);
    const statement = string(data.text);
    return {
      id, channel: channel.id, receivedAt: string(data.occurred_at), ingestedAt: created_at,
      issueCategory: data.category === "transfer_delay" ? "delay" : "unclassified",
      claim: statement, summary: `Classification: ${string(data.category)}`,
      sourceNote: `${string(data.source_id)} / ${string(data.source_native_record_id)}`,
      originalStatement: statement, caseId: null, caseStatus: "Not tracked",
      transferReference: typeof data.transaction_id === "string" ? data.transaction_id : null,
      transferOutcome: "unknown",
    };
  });
  return {
    kind: "live", receivedCount: contacts.length, uniqueCustomers: null,
    emergingIssueId: null, emergingIssueTitle: issues.length ? "Recorded customer patterns" : "No emerging issues returned",
    issueCount: issues.length,
    channelSummaries: Object.values(channels).flatMap(channel => {
      const count = contacts.filter(contact => contact.channel === channel.id).length;
      return count ? [{ channel: channel.id, name: channel.name, contacts: count }] : [];
    }),
    listedContacts: contacts, linkedOperationalIncident: null,
  };
}
