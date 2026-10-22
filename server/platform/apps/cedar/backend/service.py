"""Synthetic bank state. Veriq has no write access to these domain operations."""

from fastapi import HTTPException
from sqlalchemy import select

from apps.cedar.backend.channels import CHANNEL_SOURCES
from shared.contracts import Envelope, Knowledge, Observation, Transaction, now, uid
from shared.db import Feed, Row, audit, get, lock_scope, put, rows

SOURCE_POLICIES = {
    "cedar-institutional": ("knowledge", "cedar-config-v1"),
    "cedar-operations": ("observation", "cedar-monitoring-v1"),
    "cedar-service": ("interaction", "cedar-support-v1"),
    "cedar-status": ("transaction", "cedar-status-v1"),
    "cedar-documents": ("document", "cedar-documents-v1"),
}
SOURCE_POLICIES.update(
    {source: ("interaction", grant) for source, grant, _ in CHANNEL_SOURCES.values()}
)


def emit(s, scope, source_id, native_record_id, payload, classification="internal", origin=None):
    lock_scope(s, scope)
    institution, environment = scope.split(":", 1)
    kind, authorization = SOURCE_POLICIES[source_id]
    envelope = Envelope(
        institution_id=institution,
        environment=environment,
        source_id=source_id,
        native_record_id=native_record_id,
        record_type=kind,
        classification=classification,
        authorization_ref=authorization,
        payload=payload,
        origin=origin,
        schema_version="1.1" if origin else "1.0",
    )
    s.add(Feed(scope=scope, envelope=envelope.record()))
    s.flush()
    return envelope


def seed(s, scope, actor):
    lock_scope(s, scope)
    if get(s, scope, "account", "A1"):
        return {"seeded": False}
    put(
        s,
        scope,
        "account",
        "A1",
        {
            "account_id": "A1",
            "customer_id": "C1",
            "currency": "NGN",
            "balance_minor": 100000000,
            "reserved_minor": 0,
        },
    )
    put(
        s,
        scope,
        "account",
        "A2",
        {
            "account_id": "A2",
            "customer_id": "C2",
            "currency": "NGN",
            "balance_minor": 100000000,
            "reserved_minor": 0,
        },
    )
    knowledge = Knowledge(
        entities=[
            {"native_id": "R1", "kind": "route", "name": "Domestic transfers"},
            {"native_id": "R2", "kind": "route", "name": "Alternative transfers"},
            {"native_id": "G1", "kind": "gateway", "name": "Primary gateway"},
            {"native_id": "G2", "kind": "gateway", "name": "Secondary gateway"},
            {"native_id": "S1", "kind": "service", "name": "Payment processor"},
        ],
        relationships=[
            {"subject": "R1", "predicate": "uses_gateway", "object": "G1"},
            {"subject": "R2", "predicate": "uses_gateway", "object": "G2"},
            {"subject": "G1", "predicate": "depends_on", "object": "S1"},
            {"subject": "G2", "predicate": "depends_on", "object": "S1"},
        ],
        valid_from=now(),
    )
    configure(s, scope, knowledge, actor)
    audit(s, scope, actor, "simulator.seed", "synthetic-bank")
    return {"seeded": True, "synthetic": True}


def configure(s, scope, knowledge, actor):
    lock_scope(s, scope)
    # Validate bank structure with the same public relationship contract, not Veriq storage.
    kinds = {e.native_id: e.kind for e in knowledge.entities}
    routes = {}
    for edge in knowledge.relationships:
        if edge.predicate == "uses_gateway":
            if kinds.get(edge.subject) != "route" or kinds.get(edge.object) != "gateway":
                raise HTTPException(422, "Invalid payment route")
            if edge.subject in routes:
                raise HTTPException(422, "A Cedar route has one gateway per configuration")
            routes[edge.subject] = edge.object
    if knowledge.valid_to is not None or knowledge.valid_from > now():
        raise HTTPException(
            422, "Cedar currently accepts immediately effective open-ended configurations"
        )
    existing = rows(s, scope, "configuration")
    if existing and knowledge.valid_from <= existing[-1].data["knowledge"]["valid_from"]:
        raise HTTPException(409, "Configuration time must advance")
    result = put(
        s, scope, "configuration", uid(), {"knowledge": knowledge.model_dump(), "routes": routes}
    )
    emit(s, scope, "cedar-institutional", result.id, knowledge.model_dump())
    audit(s, scope, actor, "configuration.created", result.id)
    return result


def owned_account(s, scope, account_id, principal):
    # Row-level locking serializes reservations/reconciliation in PostgreSQL.
    row = s.scalar(
        select(Row)
        .where(Row.scope == scope, Row.kind == "account", Row.key == account_id)
        .with_for_update()
    )
    if not row or (principal.customer_id and row.data["customer_id"] != principal.customer_id):
        raise HTTPException(404, "Account not found")
    if "customer" in principal.roles and not principal.customer_id:
        raise HTTPException(403, "Customer identity missing")
    return row


def transfer(s, scope, request, principal):
    lock_scope(s, scope)
    account = owned_account(s, scope, request.account_id, principal)
    existing = get(s, scope, "transfer_request", request.idempotency_key)
    if existing:
        if existing.data["request"] != request.model_dump():
            raise HTTPException(409, "Idempotency key reused with different request")
        tx = get(s, scope, "transaction", existing.data["transaction_id"])
        if tx.data["account_id"] != account.key:
            raise HTTPException(404, "Transaction not found")
        return tx
    configs = rows(s, scope, "configuration")
    gateway = configs[-1].data["routes"].get(request.route_id) if configs else None
    if not gateway:
        raise HTTPException(422, "Unknown configured route")
    if request.amount_minor > account.data["balance_minor"] - account.data["reserved_minor"]:
        raise HTTPException(409, "Insufficient available funds")
    condition = get(s, scope, "condition", gateway)
    timeout = bool(condition and condition.data["timeout"])
    txid = uid()
    tx = Transaction(
        transaction_id=txid,
        customer_id=account.data["customer_id"],
        account_id=request.account_id,
        amount_minor=request.amount_minor,
        route_id=request.route_id,
        gateway_id=gateway,
        status="pending" if timeout else "completed",
        response="timeout" if timeout else "accepted",
        version=1,
    )
    data = dict(account.data)
    data["reserved_minor" if timeout else "balance_minor"] += (
        request.amount_minor if timeout else -request.amount_minor
    )
    account.data = data
    row = put(s, scope, "transaction", txid, tx.model_dump())
    put(
        s,
        scope,
        "transfer_request",
        request.idempotency_key,
        {"request": request.model_dump(), "transaction_id": txid},
    )
    put(
        s,
        scope,
        "ledger_entry",
        uid(),
        {
            "transaction_id": txid,
            "account_id": account.key,
            "action": "reserve" if timeout else "debit",
            "amount_minor": request.amount_minor,
        },
    )
    emit(s, scope, "cedar-status", f"{txid}:1", tx.model_dump())
    emit(
        s,
        scope,
        "cedar-operations",
        uid(),
        Observation(
            route_id=request.route_id,
            gateway_id=gateway,
            attempts=1,
            timeouts=int(timeout),
            window_seconds=1,
        ).model_dump(),
    )
    audit(s, scope, principal.subject, "transfer.created", txid)
    return row


def reconcile(s, scope, txid, request, principal):
    lock_scope(s, scope)
    # Consistent account -> transaction lock ordering with transfer initiation.
    tx = get(s, scope, "transaction", txid)
    if not tx:
        raise HTTPException(404, "Transaction not found")
    account = owned_account(s, scope, tx.data["account_id"], principal)
    s.refresh(tx)
    if tx.data["status"] != "pending":
        raise HTTPException(409, "Only pending transfers can be reconciled")
    tx.data = {
        **tx.data,
        "status": request.outcome,
        "response": "reconciled",
        "version": tx.data["version"] + 1,
        "beneficiary_verified": request.beneficiary_verified,
    }
    account.data = {
        **account.data,
        "reserved_minor": account.data["reserved_minor"] - tx.data["amount_minor"],
        "balance_minor": account.data["balance_minor"]
        - (tx.data["amount_minor"] if request.outcome == "completed" else 0),
    }
    put(
        s,
        scope,
        "ledger_entry",
        uid(),
        {
            "transaction_id": txid,
            "account_id": account.key,
            "action": "settle" if request.outcome == "completed" else "release",
            "amount_minor": tx.data["amount_minor"],
            "rationale": request.rationale,
        },
    )
    emit(s, scope, "cedar-status", f"{txid}:{tx.data['version']}", tx.data)
    audit(s, scope, principal.subject, "transfer.reconciled", txid, detail=request.model_dump())
    return tx
