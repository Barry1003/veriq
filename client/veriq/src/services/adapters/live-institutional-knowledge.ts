import type { InstitutionalKnowledgeDataset, KnowledgeEntityKind, RelationshipKind } from "@/types/institutional-knowledge";
import { array, object, string, VeriqApiError, type VeriqApi } from "../api/veriq";

const entityKinds: readonly string[] = ["route", "gateway", "service", "system", "process", "procedure"] satisfies readonly KnowledgeEntityKind[];
const relationshipKinds: readonly string[] = ["uses_gateway", "depends_on", "belongs_to", "governed_by"] satisfies readonly RelationshipKind[];

export async function getLiveInstitutionalKnowledge(api: VeriqApi): Promise<InstitutionalKnowledgeDataset> {
  const [context, evidence, assertions] = await Promise.all([api.snapshot("context"), api.rows("evidence"), api.rows("assertions")]);
  const assertionById = new Map(assertions.map(item => [item.id, item]));
  return {
    kind: "live", asOf: string(context.at).slice(0, 10), contextAt: string(context.at), knownAt: string(context.known_at),
    entities: array(context.entities, value => {
      const entity = object(value);
      const kind = string(entity.kind);
      if (!entityKinds.includes(kind)) throw new VeriqApiError("Unknown institutional entity kind.", null);
      const refs = array(entity.evidence_ids, string);
      const identityNeedsReview = entity.identity_state === "legacy_review_required";
      return {
        id: string(entity.canonical_id), name: array(entity.names, string).join(" / "), kind: kind as KnowledgeEntityKind,
        summary: `Native identity: ${string(entity.native_id)} · namespace: ${string(entity.namespace)}`,
        owner: "Owner not recorded", reviewStatus: identityNeedsReview ? "unverified" : "partial", reviewedAt: null,
        validFrom: null, sourceIds: refs,
      };
    }),
    relationships: array(context.relationships, (value) => {
      const edge = object(value);
      const kind = string(edge.predicate);
      if (!relationshipKinds.includes(kind)) throw new VeriqApiError("Unknown institutional relationship kind.", null);
      const assertionIds = array(edge.assertion_ids, string);
      const knowledge = assertionIds.map(id => {
        const assertion = assertionById.get(id);
        if (!assertion) throw new VeriqApiError("Relationship assertion provenance is unavailable.", null);
        return object(assertion.data.knowledge);
      });
      const validFrom = knowledge.map(item => string(item.valid_from)).sort().at(-1);
      if (!validFrom) throw new VeriqApiError("Relationship effective time is unavailable.", null);
      const validTo = knowledge.flatMap(item => typeof item.valid_to === "string" ? [item.valid_to] : []).sort()[0] ?? null;
      const from = string(edge.subject_id), to = string(edge.object_id);
      if (!["accepted", "contested", "identity_review_required"].includes(string(edge.state)))
        throw new VeriqApiError("Unknown institutional relationship state.", null);
      return {
        id: `${from}:${kind}:${to}`, fromId: from, toId: to, kind: kind as RelationshipKind,
        assessment: edge.state === "accepted" ? "reported" : edge.state === "contested" ? "contested" : "identity-review",
        description: `${string(edge.state)} structural assertion · ${assertionIds.join(", ")}`,
        validFrom, validTo,
        sourceIds: array(edge.evidence_ids, string),
      };
    }),
    sources: evidence.map(item => ({
      id: item.id, title: string(item.data.source_id), kind: "source-record",
      reference: string(item.data.native_record_id), recordedAt: item.created_at,
      description: `${string(item.data.record_type)} · source event ${string(item.data.occurred_at)}`,
    })),
    operationalReferences: evidence.filter(item => item.data.record_type === "observation").map(item => {
      const payload = object(item.data.payload);
      return { id: item.id, name: string(item.data.native_record_id), referencedEntityId: string(payload.gateway_id), observedAt: string(payload.occurred_at), description: `Source ${string(item.data.source_id)} · measurement, financial outcome not established` };
    }),
  };
}
