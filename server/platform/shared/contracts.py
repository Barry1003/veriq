"""Versioned trust-boundary contracts shared by both independent applications."""

from datetime import datetime, timezone
from typing import Annotated, Literal
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

Key = Annotated[str, StringConstraints(pattern=r"^[a-zA-Z0-9_.:-]{1,100}$")]
Namespace = Annotated[str, StringConstraints(pattern=r"^[a-zA-Z0-9_.:-]{1,180}$")]
Classification = Literal["internal", "restricted"]
RecordType = Literal["knowledge", "document", "observation", "interaction", "transaction"]


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def uid() -> str:
    return str(uuid4())


def instant(value: str) -> str:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError("Timestamp must include a timezone")
    return parsed.astimezone(timezone.utc).isoformat()


class Contract(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Timed(Contract):
    occurred_at: str = Field(default_factory=now)

    @model_validator(mode="after")
    def normalize_time(self):
        self.occurred_at = instant(self.occurred_at)
        return self


class EntityClaim(Contract):
    native_id: Key
    kind: Literal["route", "gateway", "service", "system", "process", "procedure"]
    name: str = Field(min_length=1, max_length=200)
    aliases: list[str] = Field(default_factory=list, max_length=20)


class RelationshipClaim(Contract):
    subject: Key
    predicate: Literal["uses_gateway", "depends_on", "belongs_to", "governed_by"]
    object: Key


class Knowledge(Contract):
    entities: list[EntityClaim] = Field(max_length=500)
    relationships: list[RelationshipClaim] = Field(max_length=1000)
    valid_from: str = Field(json_schema_extra={"format": "date-time"})
    valid_to: str | None = Field(default=None, json_schema_extra={"format": "date-time"})

    @model_validator(mode="after")
    def interval(self):
        self.valid_from = instant(self.valid_from)
        self.valid_to = instant(self.valid_to) if self.valid_to else None
        if self.valid_to and self.valid_to <= self.valid_from:
            raise ValueError("valid_to must follow valid_from")
        keys = [e.native_id for e in self.entities]
        if len(keys) != len(set(keys)):
            raise ValueError("Duplicate native entity identities")
        return self


class Document(Contract):
    text: str = Field(min_length=1, max_length=50000)


class Observation(Timed):
    route_id: Key
    gateway_id: Key
    attempts: int = Field(ge=1, le=10000000)
    timeouts: int = Field(ge=0)
    window_seconds: int = Field(default=300, ge=1, le=3600)

    @model_validator(mode="after")
    def counts(self):
        if self.timeouts > self.attempts:
            raise ValueError("Timeouts cannot exceed attempts")
        return self


class Interaction(Timed):
    channel: Literal["in_app", "email", "contact_centre", "branch"]
    text: str = Field(min_length=1, max_length=10000)
    customer_id: Key
    transaction_id: Key | None = None


class Transaction(Timed):
    transaction_id: Key
    customer_id: Key
    account_id: Key
    amount_minor: int = Field(gt=0)
    currency: Literal["NGN"] = "NGN"
    route_id: Key
    gateway_id: Key
    status: Literal["pending", "completed", "failed"]
    response: Literal["accepted", "timeout", "declined", "reconciled"]
    version: int = Field(ge=1)
    beneficiary_verified: bool = False


PAYLOADS = {
    "knowledge": Knowledge,
    "document": Document,
    "observation": Observation,
    "interaction": Interaction,
    "transaction": Transaction,
}


class ChannelOrigin(Contract):
    adapter_id: Key
    native_record_id: Key
    normalized_at: str

    @model_validator(mode="after")
    def normalize(self):
        self.normalized_at = instant(self.normalized_at)
        return self


class Envelope(Timed):
    institution_id: Key
    environment: Key = "development"
    source_id: Key
    native_record_id: Key
    record_type: RecordType
    schema_version: Literal["1.0", "1.1"] = "1.0"
    classification: Classification = "internal"
    correlation_id: Key | None = None
    authorization_ref: str = Field(min_length=1, max_length=200)
    payload: dict
    origin: ChannelOrigin | None = None

    def record(self):
        # Preserve v1.0 immutable digests when replaying old records without provenance.
        return self.model_dump(exclude={"origin"} if self.origin is None else set())

    @model_validator(mode="after")
    def validate_payload(self):
        if self.origin and (self.schema_version != "1.1" or self.record_type != "interaction"):
            raise ValueError("Channel origin requires an interaction envelope v1.1")
        self.payload = PAYLOADS[self.record_type].model_validate(self.payload).model_dump()
        return self


class SourceRegistration(Contract):
    source_id: Key
    name: str = Field(min_length=1, max_length=200)
    record_types: list[RecordType] = Field(min_length=1)
    authority: list[Literal["structure", "measurement", "report", "status", "document"]]
    max_classification: Classification = "internal"
    authorization_ref: str = Field(min_length=1, max_length=200)
    # Provision out of band to Cedar/connector; never returned by read APIs.
    ingestion_secret: str = Field(min_length=24, max_length=200)
    channel: Literal["in_app", "email", "contact_centre", "branch"] | None = None
    adapter_id: Key | None = None
    identity_namespace: Namespace | None = None
    identity_authority_ref: str | None = Field(default=None, max_length=200)
    ai_enabled: bool = True

    @model_validator(mode="after")
    def channel_grant(self):
        if bool(self.channel) != bool(self.adapter_id):
            raise ValueError("Channel source grants require both channel and adapter identity")
        if self.channel and self.record_types != ["interaction"]:
            raise ValueError("Channel sources authorize interaction records only")
        return self


class Review(Contract):
    decision: Literal["accepted", "rejected"]
    rationale: str = Field(min_length=5, max_length=2000)


class StateChange(Contract):
    state: Literal["open", "investigating", "resolved"]
    rationale: str = Field(min_length=5, max_length=2000)


class RowView(Contract):
    id: str
    kind: str
    classification: Classification
    created_at: str
    data: dict


class Health(Contract):
    application: str
    status: str
    version: str = "0.4.0"


class IngestResult(Contract):
    evidence_id: str
    duplicate: bool
    processing_state: str


class IdentityNamespace(Contract):
    namespace: Namespace
    authority_ref: str = Field(min_length=1, max_length=200)
    source_ids: list[Key] = Field(min_length=1, max_length=200)


class IdentityMapping(Contract):
    from_namespace: Namespace
    from_native_id: Key
    to_namespace: Namespace
    to_native_id: Key
    authority_ref: str = Field(min_length=1, max_length=200)
    evidence_ids: list[str] = Field(min_length=1, max_length=50)
    decision: Literal["accepted", "candidate"] = "candidate"
    rationale: str = Field(min_length=5, max_length=2000)
    valid_from: str

    @model_validator(mode="after")
    def normalize(self):
        self.valid_from = instant(self.valid_from)
        return self


class SourceAuthorization(Contract):
    state: Literal["active", "revoked"]
    rationale: str = Field(min_length=5, max_length=2000)


class ProcessingPolicy(Contract):
    enabled: bool
    rationale: str = Field(min_length=5, max_length=2000)
