import json
import os
from collections import Counter

from fastapi import Depends, FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import Field
from sqlalchemy.exc import IntegrityError

from apps.veriq.backend import adaptive, identity, lifecycle, orchestration, runtime_status
from apps.veriq.backend.connectors import CedarFeed, pull
from apps.veriq.backend.inference import LocalInference
from apps.veriq.backend.ingestion import ingest, record_error, register
from apps.veriq.backend.investigations import refresh_investigations
from apps.veriq.backend.knowledge import context, review_assertion
from shared.auth import Auth, Principal
from shared.contracts import (
    Contract,
    Envelope,
    Health,
    IdentityMapping,
    IdentityNamespace,
    IngestResult,
    ProcessingPolicy,
    Review,
    RowView,
    SourceAuthorization,
    SourceRegistration,
    StateChange,
    instant,
    now,
    uid,
)
from shared.db import Database, audit, get, lock_scope, put, rows, view

PERMISSIONS = {
    "evidence": "investigation",
    "assertion": "knowledge",
    "knowledge_review": "knowledge",
    "interaction": "customer",
    "issue": "customer",
    "incident": "operations",
    "investigation": "investigation",
    "investigation_revision": "investigation",
    "audit": "audit",
    "inference_run": "investigation",
    "ingestion_error": "sources",
}


class ContextView(Contract):
    at: str
    known_at: str
    entities: list[dict]
    relationships: list[dict]


class InvestigationWorkspace(Contract):
    investigation: RowView
    revisions: list[RowView]
    review_history: list[RowView]
    inference_runs: list[RowView]
    evidence: list[RowView]


class AdaptiveStepTrace(Contract):
    task_id: str
    state: str
    redacted: bool
    reason: str | None = None
    steps: list[RowView]


class ReviewNote(Contract):
    rationale: str = Field(min_length=5, max_length=2000)


def create_app(db=None, auth=None, scope=None, inference=None, feeds=None):
    db = db or Database(os.getenv("VERIQ_DATABASE_URL", "sqlite:///veriq.db"))
    scope = scope or os.getenv("INSTALLATION_SCOPE", "cedar:development")
    inference = inference or LocalInference()
    feeds = feeds if feeds is not None else json.loads(os.getenv("CEDAR_CONNECTORS", "{}"))
    app = FastAPI(title="Veriq institutional intelligence API", version="0.5.0")
    app.state.db, app.state.scope = db, scope
    app.add_middleware(
        CORSMiddleware,
        allow_origins=os.getenv("CORS_ORIGINS", "").split(","),
        allow_methods=["GET", "POST"],
        allow_headers=["Authorization", "Content-Type", "X-Source-Secret"],
    )
    auth = auth or Auth()
    authenticate = auth.dependency()

    def principal(p: Principal = Depends(authenticate)):
        if p.scope != scope:
            raise HTTPException(403, "Credential outside installation scope")
        return p

    def accessible(s, kind, identifier, p):
        row = next((r for r in rows(s, scope, kind) if r.id == identifier), None)
        if not row or not p.can_read(row.classification):
            raise HTTPException(404, "Record not found")
        return row

    @app.get("/health", response_model=Health)
    def health():
        return Health(application="veriq", status="alive", version="0.5.0")

    @app.get("/ready", response_model=Health)
    def ready():
        try:
            with db.session() as s:
                rows(s, scope, "source")
        except Exception as exc:
            raise HTTPException(503, "Database unavailable or migrations missing") from exc
        return Health(application="veriq", status="ready", version="0.5.0")

    @app.get("/v1/access/me")
    def me(p: Principal = Depends(principal)):
        return {"subject": p.subject, "scope": p.scope, "roles": p.roles, "clearance": p.clearance}

    @app.post("/v1/sources", response_model=RowView, status_code=201)
    def sources(request: SourceRegistration, p: Principal = Depends(principal)):
        p.require("sources")
        if not p.can_read(request.max_classification):
            raise HTTPException(403, "Source clearance exceeds administrator clearance")
        with db.session() as s:
            row = register(s, scope, request, p.subject)
            data = view(row)
            data["data"] = {k: v for k, v in row.data.items() if k != "secret_hash"}
            return data

    @app.get("/v1/connectors", response_model=list[RowView])
    @app.get("/v1/sources", response_model=list[RowView])
    def list_sources(p: Principal = Depends(principal)):
        p.require("sources")
        with db.session() as s:
            intents = [
                r for r in rows(s, scope, "processing_intent") if p.can_read(r.classification)
            ]
            return [
                {
                    **view(r),
                    "data": {
                        **{k: v for k, v in r.data.items() if k != "secret_hash"},
                        "automatic_processing": {
                            "enabled": lifecycle.enabled() and r.data.get("ai_enabled", False),
                            "intent_counts": dict(
                                Counter(
                                    i.data["state"]
                                    for i in intents
                                    if r.key in i.data["source_grants"]
                                )
                            ),
                        },
                    },
                }
                for r in rows(s, scope, "source")
                if p.can_read(r.classification)
            ]

    @app.post("/v1/ingest", response_model=IngestResult)
    def push(envelope: Envelope, x_source_secret: str = Header(min_length=24, max_length=200)):
        try:
            with db.session() as s:
                return ingest(s, scope, envelope, x_source_secret)
        except HTTPException as exc:
            if exc.status_code not in {401, 403}:
                with db.session() as s:
                    record_error(s, scope, envelope.source_id, str(exc.detail))
            raise
        except IntegrityError as exc:
            raise HTTPException(409, "Concurrent duplicate; retry immutable record") from exc

    @app.post("/v1/connectors/{source_id}/pull")
    def pull_source(source_id: str, p: Principal = Depends(principal)):
        p.require("sources")
        with db.session() as s:
            source = get(s, scope, "source", source_id)
            if not source or not p.can_read(source.classification):
                raise HTTPException(404, "Source not found")
        config = feeds.get(source_id)
        if not config:
            raise HTTPException(409, "Pull connector not configured by deployment administrator")
        feed = config.get("feed") or CedarFeed(config["url"], config["token"])
        return pull(db, scope, source_id, config["source_secret"], feed, p.subject)

    @app.post("/v1/sources/{source_id}/authorization", response_model=RowView)
    def source_authorization(
        source_id: str, request: SourceAuthorization, p: Principal = Depends(principal)
    ):
        p.require("sources")
        with db.session() as s:
            lock_scope(s, scope)
            source = get(s, scope, "source", source_id)
            if not source or not p.can_read(source.classification):
                raise HTTPException(404, "Source not found")
            source.data = {
                **source.data,
                "authorization_state": request.state,
                "grant_version": source.data.get("grant_version", 1) + 1,
            }
            if request.state == "active":
                lifecycle.restage(s, scope)
            audit(
                s,
                scope,
                p.subject,
                "source.authorization_" + request.state,
                source.id,
                source.classification,
                {"rationale": request.rationale},
            )
            return {
                **view(source),
                "data": {k: v for k, v in source.data.items() if k != "secret_hash"},
            }

    @app.post("/v1/sources/{source_id}/processing-policy", response_model=RowView)
    def processing_policy(
        source_id: str, request: ProcessingPolicy, p: Principal = Depends(principal)
    ):
        p.require("sources")
        with db.session() as s:
            lock_scope(s, scope)
            source = get(s, scope, "source", source_id)
            if not source or not p.can_read(source.classification):
                raise HTTPException(404, "Source not found")
            source.data = {
                **source.data,
                "ai_enabled": request.enabled,
                "grant_version": source.data.get("grant_version", 1) + 1,
            }
            audit(
                s,
                scope,
                p.subject,
                "source.processing_policy",
                source.id,
                source.classification,
                request.model_dump(),
            )
            if request.enabled:
                lifecycle.restage(s, scope)
            return {
                **view(source),
                "data": {k: v for k, v in source.data.items() if k != "secret_hash"},
            }

    @app.get("/v1/processing/intents", response_model=list[RowView])
    def processing_intents(
        offset: int = Query(0, ge=0),
        limit: int = Query(100, ge=1, le=500),
        p: Principal = Depends(principal),
    ):
        p.require("investigation")
        with db.session() as s:
            return [
                view(r) for r in rows(s, scope, "processing_intent") if p.can_read(r.classification)
            ][offset : offset + limit]

    @app.post("/v1/identity/namespaces", response_model=RowView)
    def namespace_grant(request: IdentityNamespace, p: Principal = Depends(principal)):
        with db.session() as s:
            lock_scope(s, scope)
            return view(identity.approve_namespace(s, scope, request, p))

    @app.post("/v1/identity/mappings", response_model=RowView, status_code=201)
    def identity_mapping(request: IdentityMapping, p: Principal = Depends(principal)):
        with db.session() as s:
            lock_scope(s, scope)
            row = identity.map_identity(s, scope, request, p)
            refresh_investigations(s, scope)
            return view(row)

    @app.get("/v1/identity/reconciliation", response_model=list[RowView])
    def identity_reconciliation(p: Principal = Depends(principal)):
        p.require("identity")
        with db.session() as s:
            return [
                view(r)
                for r in rows(s, scope, "identity_reconciliation")
                if p.can_read(r.classification)
            ]

    @app.get("/v1/identity/bindings", response_model=list[RowView])
    def identity_bindings(p: Principal = Depends(principal)):
        p.require("knowledge")
        with db.session() as s:
            return [
                view(r) for r in rows(s, scope, "identity_binding") if p.can_read(r.classification)
            ]

    @app.get("/v1/identity/mappings", response_model=list[RowView])
    def identity_mappings(p: Principal = Depends(principal)):
        p.require("knowledge")
        with db.session() as s:
            return [
                view(r) for r in rows(s, scope, "identity_mapping") if p.can_read(r.classification)
            ]

    @app.get("/v1/processing/evidence/{evidence_id}")
    def evidence_processing(evidence_id: str, p: Principal = Depends(principal)):
        with db.session() as s:
            evidence = accessible(s, "evidence", evidence_id, p)
            task_type = {
                "document": "extract_knowledge",
                "interaction": "interpret_interaction",
            }.get(evidence.data["record_type"])
            p.require("customer" if task_type == "interpret_interaction" else "knowledge")
            return {
                "evidence_id": evidence_id,
                "source_id": evidence.data["source_id"],
                "identity_namespace": evidence.data.get("identity_namespace"),
                "intents": [
                    view(r)
                    for r in rows(s, scope, "processing_intent")
                    if r.data["task"] == task_type
                    and evidence_id in r.data["evidence_ids"]
                    and p.can_read(r.classification)
                ],
                "tasks": [
                    orchestration.public(r)
                    for r in rows(s, scope, "ai_task")
                    if r.data["task"] == task_type
                    and evidence_id in r.data["evidence_ids"]
                    and orchestration.may_read(r, p)
                ],
                "runs": [
                    adaptive.public_run(s, scope, r, p)
                    for r in rows(s, scope, "inference_run")
                    if r.data["task"] == task_type
                    and evidence_id in r.data["evidence_ids"]
                    and p.can_read(r.classification)
                ],
            }

    @app.get("/v1/knowledge/context", response_model=ContextView)
    def knowledge_context(
        at: str | None = None, known_at: str | None = None, p: Principal = Depends(principal)
    ):
        p.require("knowledge")
        try:
            effective = instant(at) if at else now()
            known = instant(known_at) if known_at else now()
        except ValueError as exc:
            raise HTTPException(422, str(exc)) from exc
        with db.session() as s:
            return context(s, scope, effective, known, p.clearance)

    @app.get("/v1/knowledge/resolve")
    def resolve(
        name: str = Query(min_length=1, max_length=200),
        namespace: str | None = None,
        p: Principal = Depends(principal),
    ):
        p.require("knowledge")
        with db.session() as s:
            entities = context(s, scope, now(), now(), p.clearance)["entities"]
            candidates = [
                e
                for e in entities
                if (
                    name.casefold() in {n.casefold() for n in e["names"]}
                    or any(i["native_id"] == name for i in e.get("source_identities", []))
                )
                and (
                    namespace is None
                    or any(i["namespace"] == namespace for i in e.get("source_identities", []))
                )
            ]
            return {
                "state": "ambiguous"
                if len(candidates) > 1
                else "matched"
                if candidates
                else "unknown",
                "candidates": candidates,
            }

    @app.post("/v1/knowledge/assertions/{assertion_id}/review", response_model=RowView)
    def review_knowledge(assertion_id: str, request: Review, p: Principal = Depends(principal)):
        p.require("review")
        with db.session() as s:
            lock_scope(s, scope)
            result = review_assertion(s, scope, assertion_id, request, p)
            refresh_investigations(s, scope)
            return view(result)

    @app.get("/v1/observations", response_model=list[RowView])
    def observations(
        offset: int = Query(0, ge=0),
        limit: int = Query(100, ge=1, le=500),
        p: Principal = Depends(principal),
    ):
        p.require("operations")
        with db.session() as s:
            return [
                view(r)
                for r in rows(s, scope, "evidence")
                if r.data["record_type"] == "observation" and p.can_read(r.classification)
            ][offset : offset + limit]

    @app.get("/v1/inference/status")
    def inference_status(p: Principal = Depends(principal)):
        p.require("investigation")
        return runtime_status.status(db, scope, inference, p)

    @app.post("/v1/inference/evidence/{evidence_id}", response_model=RowView)
    def inference_task(evidence_id: str, p: Principal = Depends(principal)):
        return orchestration.synchronous(db, scope, evidence_id, p, inference, auth)

    @app.post("/v1/investigations/{investigation_id}/analyze", response_model=RowView)
    def analyze(investigation_id: str, p: Principal = Depends(principal)):
        p.require("investigation")
        return orchestration.synchronous(
            db, scope, investigation_id, p, inference, auth, investigation=True
        )

    @app.post("/v1/inference/tasks/evidence/{evidence_id}", response_model=RowView, status_code=202)
    def queue_evidence(evidence_id: str, p: Principal = Depends(principal)):
        return orchestration.enqueue(db, scope, evidence_id, p)

    @app.post(
        "/v1/inference/tasks/investigations/{investigation_id}",
        response_model=RowView,
        status_code=202,
    )
    def queue_analysis(investigation_id: str, p: Principal = Depends(principal)):
        return orchestration.enqueue(db, scope, investigation_id, p, investigation=True)

    @app.post(
        "/v1/investigations/{investigation_id}/adaptive", response_model=RowView, status_code=202
    )
    def queue_adaptive(investigation_id: str, p: Principal = Depends(principal)):
        p.require("investigation")
        return orchestration.enqueue(
            db, scope, investigation_id, p, investigation=True, adaptive=True
        )

    @app.get("/v1/inference/tasks/{task_id}/steps", response_model=AdaptiveStepTrace)
    def investigative_steps(task_id: str, p: Principal = Depends(principal)):
        with db.session() as s:
            task = get(s, scope, "ai_task", task_id)
            if not task or task.data["task"] != adaptive.TASK:
                raise HTTPException(404, "Adaptive task not found")
            return adaptive.visible_trace(s, scope, task, p)

    @app.post("/v1/inference/tasks/{task_id}/cancel", response_model=RowView)
    def cancel_adaptive(task_id: str, p: Principal = Depends(principal)):
        p.require("investigation")
        with db.session() as s:
            lock_scope(s, scope)
            task = get(s, scope, "ai_task", task_id)
            if (
                not task
                or task.data["task"] != adaptive.TASK
                or not orchestration.may_read(task, p)
            ):
                raise HTTPException(404, "Adaptive task not found")
            if task.data["state"] not in {"queued", "running", "retryable", "unavailable"}:
                raise HTTPException(409, "Task already terminal")
            task.data = {
                **task.data,
                "state": "failed",
                "outcome": "cancelled",
                "lease_token": None,
                "lease_until": 0,
                "history": task.data["history"]
                + [{"state": "failed", "outcome": "cancelled", "at": now()}],
            }
            audit(s, scope, p.subject, "adaptive.cancelled", task.id, task.classification)
            return orchestration.public(task)

    @app.get("/v1/inference/tasks", response_model=list[RowView])
    def list_tasks(
        offset: int = Query(0, ge=0),
        limit: int = Query(100, ge=1, le=500),
        p: Principal = Depends(principal),
    ):
        with db.session() as s:
            return orchestration.list_public(s, scope, p, offset, limit)

    @app.get("/v1/inference/tasks/{task_id}", response_model=RowView)
    def read_task(task_id: str, p: Principal = Depends(principal)):
        with db.session() as s:
            row = get(s, scope, "ai_task", task_id)
            if not row or not orchestration.may_read(row, p):
                raise HTTPException(404, "Task not found")
            return orchestration.public(row)

    @app.post("/v1/inference/tasks/{task_id}/retry", response_model=RowView)
    def retry_task(task_id: str, p: Principal = Depends(principal)):
        return orchestration.retry(db, scope, task_id, p)

    @app.get(
        "/v1/investigations/{investigation_id}/workspace", response_model=InvestigationWorkspace
    )
    def workspace(investigation_id: str, p: Principal = Depends(principal)):
        p.require("investigation")
        with db.session() as s:
            investigation = accessible(s, "investigation", investigation_id, p)
            revisions = [
                r
                for r in rows(s, scope, "investigation_revision")
                if r.data["investigation_id"] == investigation_id
            ]
            evidence_ids = {e for r in revisions for e in r.data["evidence_ids"]}
            evidence = [r for r in rows(s, scope, "evidence") if r.id in evidence_ids]
            # Fail closed if any old revision has stronger restrictions.
            if any(not p.can_read(r.classification) for r in revisions + evidence):
                raise HTTPException(403, "Workspace contains restricted evidence")
            return {
                "investigation": view(investigation),
                "revisions": [view(r) for r in revisions],
                "review_history": [
                    view(r)
                    for r in rows(s, scope, "investigation_review")
                    if r.data["investigation_id"] == investigation_id
                    and p.can_read(r.classification)
                ],
                "inference_runs": [
                    adaptive.public_run(s, scope, r, p)
                    for r in rows(s, scope, "inference_run")
                    if r.data.get("investigation_id") == investigation_id
                    and p.can_read(r.classification)
                ],
                "evidence": [view(r) for r in evidence],
            }

    @app.post("/v1/investigations/{investigation_id}/review", response_model=RowView)
    def review_investigation(
        investigation_id: str, request: ReviewNote, p: Principal = Depends(principal)
    ):
        p.require("review")
        with db.session() as s:
            lock_scope(s, scope)
            investigation = accessible(s, "investigation", investigation_id, p)
            result = put(
                s,
                scope,
                "investigation_review",
                uid(),
                {
                    "investigation_id": investigation_id,
                    "revision_id": investigation.data["latest_revision_id"],
                    "actor": p.subject,
                    "rationale": request.rationale,
                },
                investigation.classification,
            )
            investigation.data = {**investigation.data, "review_required": False}
            audit(
                s,
                scope,
                p.subject,
                "investigation.reviewed",
                investigation_id,
                investigation.classification,
            )
            return view(result)

    @app.post("/v1/{collection}/{identifier}/state", response_model=RowView)
    def change_state(
        collection: str, identifier: str, request: StateChange, p: Principal = Depends(principal)
    ):
        kind = {"incidents": "incident", "investigations": "investigation"}.get(collection)
        if not kind:
            raise HTTPException(404, "Collection not found")
        p.require("operations" if kind == "incident" else "review")
        with db.session() as s:
            lock_scope(s, scope)
            row = accessible(s, kind, identifier, p)
            row.data = {**row.data, "state": request.state}
            audit(
                s,
                scope,
                p.subject,
                kind + ".state_changed",
                row.id,
                row.classification,
                request.model_dump(),
            )
            return view(row)

    # Explicit, versioned collection routes with shared, honest flexible domain response envelope.
    for path, kind in {
        "evidence": "evidence",
        "knowledge/assertions": "assertion",
        "knowledge/reviews": "knowledge_review",
        "interactions": "interaction",
        "issues": "issue",
        "incidents": "incident",
        "investigations": "investigation",
        "audit": "audit",
        "inference/runs": "inference_run",
        "ingestion/errors": "ingestion_error",
    }.items():

        def handler_factory(record_kind):
            def handler(
                offset: int = Query(0, ge=0),
                limit: int = Query(100, ge=1, le=500),
                p: Principal = Depends(principal),
            ):
                p.require(PERMISSIONS[record_kind])
                with db.session() as s:
                    return [
                        adaptive.public_run(s, scope, r, p)
                        if record_kind == "inference_run"
                        else view(r)
                        for r in rows(s, scope, record_kind)
                        if p.can_read(r.classification)
                    ][offset : offset + limit]

            return handler

        app.add_api_route(
            "/v1/" + path,
            handler_factory(kind),
            methods=["GET"],
            response_model=list[RowView],
            name="list_" + kind,
        )
    from apps.veriq.backend.setup import register_routes

    register_routes(app, db, scope, principal, inference)
    return app


app = create_app()
