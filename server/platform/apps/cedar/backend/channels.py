"""Distinct synthetic channel adapters with native schemas, not relabelled aggregate feeds."""

from fastapi import HTTPException
from pydantic import Field

from shared.contracts import Contract, Interaction, Key, instant, now, uid
from shared.db import audit, get, lock_scope, put, rows, view

CHANNEL_SOURCES = {
    "in_app": ("cedar-channel-in-app", "cedar-in-app-v1", "in-app-message-v1"),
    "email": ("cedar-channel-email", "cedar-email-v1", "email-message-v1"),
    "contact_centre": (
        "cedar-channel-contact-centre",
        "cedar-contact-centre-v1",
        "call-transcript-v1",
    ),
    "branch": ("cedar-channel-branch", "cedar-branch-v1", "branch-visit-v1"),
}


class InAppMessage(Contract):
    message_id: Key
    customer_id: Key
    message: str = Field(min_length=1, max_length=10000)
    transaction_id: Key | None = None
    sent_at: str = Field(default_factory=now)


class EmailMessage(Contract):
    message_id: Key
    customer_id: Key
    subject: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1, max_length=9000)
    transaction_reference: Key | None = None
    sent_at: str = Field(default_factory=now)


class CallTranscript(Contract):
    call_id: Key
    customer_id: Key
    transcript: str = Field(min_length=1, max_length=10000)
    transaction_reference: Key | None = None
    started_at: str = Field(default_factory=now)


class BranchVisit(Contract):
    visit_id: Key
    customer_id: Key
    notes: str = Field(min_length=1, max_length=10000)
    transaction_reference: Key | None = None
    recorded_at: str = Field(default_factory=now)


def normalize(channel, native):
    if channel == "in_app":
        key, text, tx, occurred_at = (
            native.message_id,
            native.message,
            native.transaction_id,
            native.sent_at,
        )
    elif channel == "email":
        key, text, tx, occurred_at = (
            native.message_id,
            native.subject + "\n" + native.body,
            native.transaction_reference,
            native.sent_at,
        )
    elif channel == "contact_centre":
        key, text, tx, occurred_at = (
            native.call_id,
            native.transcript,
            native.transaction_reference,
            native.started_at,
        )
    else:
        key, text, tx, occurred_at = (
            native.visit_id,
            native.notes,
            native.transaction_reference,
            native.recorded_at,
        )
    return key, Interaction(
        customer_id=native.customer_id,
        channel=channel,
        text=text,
        transaction_id=tx,
        occurred_at=instant(occurred_at),
    )


def receive(s, scope, channel, native, principal):
    from apps.cedar.backend.service import emit

    lock_scope(s, scope)
    try:
        native_id, normalized = normalize(channel, native)
    except ValueError as exc:
        raise HTTPException(422, "Native channel timestamp must include a timezone") from exc
    if "customer" in principal.roles and (
        not principal.customer_id or normalized.customer_id != principal.customer_id
    ):
        raise HTTPException(403, "Channel customer does not match credential")
    if normalized.transaction_id:
        tx = get(s, scope, "transaction", normalized.transaction_id)
        if not tx or tx.data["customer_id"] != normalized.customer_id:
            raise HTTPException(422, "Transaction reference does not belong to customer")
    source, _, adapter = CHANNEL_SOURCES[channel]
    key = f"{source}:{native_id}"
    existing = get(s, scope, "channel_record", key)
    original = native.model_dump()
    if existing:
        if existing.data["native"] != original:
            raise HTTPException(409, "Channel native identity reused with different content")
        return get(s, scope, "interaction", existing.data["interaction_key"])
    record_id = uid()
    origin = {"adapter_id": adapter, "native_record_id": native_id, "normalized_at": now()}
    row = put(
        s,
        scope,
        "interaction",
        record_id,
        {
            **normalized.model_dump(),
            "source_id": source,
            "source_native_record_id": native_id,
            "origin": origin,
        },
    )
    put(
        s,
        scope,
        "channel_record",
        key,
        {
            "channel": channel,
            "source_id": source,
            "adapter_id": adapter,
            "native_record_id": native_id,
            "native": original,
            "interaction_key": record_id,
            "customer_id": normalized.customer_id,
            "normalized": normalized.model_dump(),
            "origin": origin,
        },
    )
    emit(s, scope, source, native_id, normalized.model_dump(), origin=origin)
    audit(
        s,
        scope,
        principal.subject,
        "channel.normalized",
        row.id,
        detail={"source_id": source, "adapter_id": adapter},
    )
    return row


def register_routes(app, db, scope, authenticate):
    from fastapi import Depends

    from shared.auth import Principal
    from shared.contracts import RowView

    def intake(channel, request, p):
        p.require("bank")
        if channel != "in_app":
            p.require(
                "customer"
            )  # Bank-authorized native channel recorder, not a customer browser.

        with db.session() as s:
            return view(receive(s, scope, channel, request, p))

    @app.post("/v1/channels/in-app/messages", response_model=RowView, status_code=201)
    def in_app(request: InAppMessage, p: Principal = Depends(authenticate)):
        return intake("in_app", request, p)

    @app.post("/v1/channels/email/messages", response_model=RowView, status_code=201)
    def email(request: EmailMessage, p: Principal = Depends(authenticate)):
        return intake("email", request, p)

    @app.post("/v1/channels/contact-centre/transcripts", response_model=RowView, status_code=201)
    def call(request: CallTranscript, p: Principal = Depends(authenticate)):
        return intake("contact_centre", request, p)

    @app.post("/v1/channels/branch/visits", response_model=RowView, status_code=201)
    def branch(request: BranchVisit, p: Principal = Depends(authenticate)):
        return intake("branch", request, p)

    @app.get("/v1/channels")
    def status(p: Principal = Depends(authenticate)):
        p.require("customer")
        with db.session() as s:
            records = rows(s, scope, "channel_record")
            return [
                {
                    "channel": channel,
                    "source_id": source,
                    "adapter_id": adapter,
                    "received": sum(r.data["channel"] == channel for r in records),
                    "last_received_at": max(
                        (r.created_at for r in records if r.data["channel"] == channel),
                        default=None,
                    ),
                    "state": "receiving"
                    if any(r.data["channel"] == channel for r in records)
                    else "configured",
                    "transport": "synthetic_native_intake_api",
                }
                for channel, (source, _, adapter) in CHANNEL_SOURCES.items()
            ]
