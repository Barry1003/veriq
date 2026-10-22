import os
from typing import Literal

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import Field, model_validator
from sqlalchemy import select, text

from apps.cedar.backend import service
from shared.auth import Auth, Principal
from shared.contracts import Contract, Document, Health, Interaction, Key, Knowledge, RowView, uid
from shared.db import Database, Feed, audit, get, put, rows, view


class TransferRequest(Contract):
    account_id: Key
    amount_minor: int = Field(gt=0, le=10000000000)
    route_id: Key
    idempotency_key: Key


class Reconciliation(Contract):
    outcome: Literal["completed", "failed"]
    beneficiary_verified: bool = False
    rationale: str = Field(min_length=5, max_length=2000)

    @model_validator(mode="after")
    def receipt(self):
        if self.outcome == "failed" and self.beneficiary_verified:
            raise ValueError("Failed outcome cannot verify beneficiary receipt")
        return self


class Condition(Contract):
    gateway_id: Key
    timeout: bool


class FeedItem(Contract):
    sequence: int
    envelope: dict


class FeedPage(Contract):
    items: list[FeedItem]
    next_cursor: int
    synthetic: bool = True


def create_app(db=None, auth=None, scope=None, simulator=None):
    db = db or Database(os.getenv("CEDAR_DATABASE_URL", "sqlite:///cedar.db"))
    scope = scope or os.getenv("INSTALLATION_SCOPE", "cedar:development")
    simulator = (
        simulator if simulator is not None else os.getenv("CEDAR_SIMULATOR_ENABLED") == "true"
    )
    app = FastAPI(title="Cedar Bank synthetic banking API", version="0.4.0")
    app.state.db = db
    app.state.scope = scope
    app.add_middleware(
        CORSMiddleware,
        allow_origins=os.getenv("CORS_ORIGINS", "").split(","),
        allow_methods=["GET", "POST"],
        allow_headers=["Authorization", "Content-Type"],
    )
    authenticate = (auth or Auth()).dependency()

    def principal(p: Principal = Depends(authenticate)):
        if p.scope != scope:
            raise HTTPException(403, "Credential outside installation scope")
        return p

    @app.get("/health", response_model=Health)
    def health():
        return Health(application="cedar", status="alive")

    @app.get("/ready", response_model=Health)
    def ready():
        try:
            with db.session() as s:
                s.execute(text("SELECT id FROM domain_records LIMIT 1"))
        except Exception as exc:
            raise HTTPException(503, "Database unavailable or migrations missing") from exc
        return Health(application="cedar", status="ready")

    @app.post("/v1/simulator/seed")
    def seed(p: Principal = Depends(principal)):
        p.require("simulator")
        if not simulator:
            raise HTTPException(404, "Development simulator is disabled")
        with db.session() as s:
            return service.seed(s, scope, p.subject)

    @app.post("/v1/simulator/conditions", response_model=RowView)
    def conditions(request: Condition, p: Principal = Depends(principal)):
        p.require("simulator")
        if not simulator:
            raise HTTPException(404, "Development simulator is disabled")
        with db.session() as s:
            row = get(s, scope, "condition", request.gateway_id)
            if row:
                row.data = request.model_dump()
            else:
                row = put(s, scope, "condition", request.gateway_id, request.model_dump())
            audit(s, scope, p.subject, "simulator.condition", row.id)
            return view(row)

    @app.get("/v1/accounts", response_model=list[RowView])
    def accounts(p: Principal = Depends(principal)):
        p.require("bank")
        if "customer" in p.roles and not p.customer_id:
            raise HTTPException(403, "Customer identity missing")
        with db.session() as s:
            return [
                view(r)
                for r in rows(s, scope, "account")
                if not p.customer_id or r.data["customer_id"] == p.customer_id
            ]

    @app.post("/v1/transfers", response_model=RowView, status_code=201)
    def transfers(request: TransferRequest, p: Principal = Depends(principal)):
        p.require("bank")
        with db.session() as s:
            return view(service.transfer(s, scope, request, p))

    @app.get("/v1/transactions", response_model=list[RowView])
    def transactions(p: Principal = Depends(principal)):
        p.require("bank")
        if "customer" in p.roles and not p.customer_id:
            raise HTTPException(403, "Customer identity missing")
        with db.session() as s:
            return [
                view(r)
                for r in rows(s, scope, "transaction")
                if not p.customer_id or r.data["customer_id"] == p.customer_id
            ]

    @app.post("/v1/transactions/{transaction_id}/reconcile", response_model=RowView)
    def reconcile(transaction_id: str, request: Reconciliation, p: Principal = Depends(principal)):
        p.require("operations")
        p.require("bank")
        with db.session() as s:
            return view(service.reconcile(s, scope, transaction_id, request, p))

    @app.post("/v1/interactions", response_model=RowView, status_code=201)
    def interactions(request: Interaction, p: Principal = Depends(principal)):
        p.require("bank")
        if "customer" in p.roles and (not p.customer_id or request.customer_id != p.customer_id):
            raise HTTPException(403, "Interaction customer does not match credential")
        with db.session() as s:
            if request.transaction_id:
                tx = get(s, scope, "transaction", request.transaction_id)
                if not tx or tx.data["customer_id"] != request.customer_id:
                    raise HTTPException(422, "Transaction reference does not belong to customer")
            row = put(s, scope, "interaction", uid(), request.model_dump())
            service.emit(s, scope, "cedar-service", row.id, request.model_dump())
            audit(s, scope, p.subject, "interaction.created", row.id)
            return view(row)

    @app.get("/v1/interactions", response_model=list[RowView])
    def list_interactions(p: Principal = Depends(principal)):
        p.require("bank")
        if "customer" in p.roles and not p.customer_id:
            raise HTTPException(403, "Customer identity missing")
        with db.session() as s:
            return [
                view(r)
                for r in rows(s, scope, "interaction")
                if not p.customer_id or r.data["customer_id"] == p.customer_id
            ]

    @app.post("/v1/institutional/configurations", response_model=RowView, status_code=201)
    def configurations(request: Knowledge, p: Principal = Depends(principal)):
        p.require("knowledge")
        p.require("bank")
        with db.session() as s:
            return view(service.configure(s, scope, request, p.subject))

    @app.get("/v1/institutional/configurations", response_model=list[RowView])
    def list_configurations(p: Principal = Depends(principal)):
        p.require("knowledge")
        with db.session() as s:
            return [
                view(r) for r in rows(s, scope, "configuration") if p.can_read(r.classification)
            ]

    @app.post("/v1/institutional/documents", response_model=RowView, status_code=201)
    def documents(request: Document, p: Principal = Depends(principal)):
        p.require("knowledge")
        p.require("bank")
        with db.session() as s:
            row = put(s, scope, "document", uid(), request.model_dump())
            service.emit(s, scope, "cedar-documents", row.id, request.model_dump())
            audit(s, scope, p.subject, "document.created", row.id)
            return view(row)

    @app.get("/v1/institutional/documents", response_model=list[RowView])
    def list_documents(p: Principal = Depends(principal)):
        p.require("knowledge")
        with db.session() as s:
            return [view(r) for r in rows(s, scope, "document") if p.can_read(r.classification)]

    @app.get("/v1/feed", response_model=FeedPage)
    def feed(
        source_id: str,
        after: int = Query(0, ge=0),
        limit: int = Query(100, ge=1, le=500),
        p: Principal = Depends(principal),
    ):
        p.require("feed")
        if source_id not in service.SOURCE_POLICIES:
            raise HTTPException(404, "Source not found")
        with db.session() as s:
            # Source filter before LIMIT preserves per-source durable cursors.
            all_items = s.scalars(
                select(Feed)
                .where(Feed.scope == scope, Feed.sequence > after)
                .order_by(Feed.sequence)
            )
            selected = []
            for item in all_items:
                if item.envelope["source_id"] != source_id:
                    continue
                if not p.can_read(item.envelope["classification"]):
                    raise HTTPException(403, "Feed clearance insufficient")
                selected.append({"sequence": item.sequence, "envelope": item.envelope})
                if len(selected) == limit:
                    break
            return {
                "items": selected,
                "next_cursor": selected[-1]["sequence"] if selected else after,
            }

    from apps.cedar.backend.channels import register_routes

    register_routes(app, db, scope, principal)
    return app


app = create_app()
