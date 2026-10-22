"""Small development-only setup record; readiness is recomputed from real state."""

import os
from typing import Literal

from fastapi import Depends, HTTPException
from pydantic import Field

from apps.veriq.backend import runtime_status
from apps.veriq.backend.knowledge import context
from shared.contracts import Contract, RowView, now, uid
from shared.db import audit, get, lock_scope, put, rows, view


class DemoProfile(Contract):
    institution_name: str = Field(min_length=1, max_length=120)
    deployment_label: str = Field(min_length=1, max_length=120)
    synthetic_development: Literal[True]


class SetupView(Contract):
    scope: str
    profile: RowView | None
    administrator: dict
    identity_provider_verified: Literal[False]
    configuration_owner: Literal["deployment_administrator"]


class ReadinessView(Contract):
    checked_at: str
    scope: str
    synthetic_development: Literal[True]
    state: Literal["ready_unqualified", "ready_limited", "blocked"]
    activation_allowed: bool
    activation_valid: bool
    activation: RowView | None
    checks: dict[str, bool]
    sources: list[dict]
    ai: dict
    production_approved: Literal[False]
    limitations: list[str]


class ActivationView(Contract):
    activation: RowView
    readiness_state: str
    production_approved: Literal[False]


def enabled(scope):
    return os.getenv("VERIQ_DEMO_SETUP_ENABLED") == "true" and scope.endswith(":development")


def register_routes(app, db, scope, principal, inference):
    def administrator(p=Depends(principal)):
        if "admin" not in p.roles:
            raise HTTPException(403, "Deployment administrator required")
        if not enabled(scope):
            raise HTTPException(404, "Synthetic development setup is disabled")
        return p

    def readiness(p):
        # Probe outside the database transaction so slow inference never holds its lock.
        runtime = runtime_status.status(db, scope, inference, p)
        with db.session() as s:
            profile = get(s, scope, "demo_setup", "profile")
            sources = [r for r in rows(s, scope, "source") if p.can_read(r.classification)]
            evidence = [r for r in rows(s, scope, "evidence") if p.can_read(r.classification)]
            active = [r for r in sources if r.data.get("authorization_state") == "active"]
            kinds = {k for r in active for k in r.data["record_types"]}
            active_ids = {r.key for r in active}
            ai_kinds = {
                k for r in active if r.data.get("ai_enabled") for k in r.data["record_types"]
            }
            accepted = context(s, scope, now(), now(), p.clearance)
            checks = {
                "database": True,
                "profile_saved": profile is not None,
                "administrator_authenticated": True,
                "required_sources_authorized": {
                    "knowledge",
                    "observation",
                    "interaction",
                    "transaction",
                    "document",
                }
                <= kinds,
                "accepted_institutional_context": bool(accepted["relationships"]),
                "document_received": any(
                    e.data["record_type"] == "document" and e.data["source_id"] in active_ids
                    for e in evidence
                ),
            }
            activation = rows(s, scope, "demo_activation")
            latest = activation[-1] if activation else None
            source_states = [
                {
                    "source_id": r.key,
                    "authorization_state": r.data["authorization_state"],
                    "record_types": r.data["record_types"],
                    "ingested": r.data["ingested"],
                    "ai_enabled": r.data.get("ai_enabled", False),
                    "last_received_at": r.data.get("last_received_at"),
                    "last_pull_at": r.data.get("last_pull_at"),
                    "last_error": r.data.get("last_error"),
                    "delivery": "receiving"
                    if r.data["ingested"]
                    else "polled_empty"
                    if r.data.get("last_pull_at")
                    else "not_tested",
                }
                for r in sources
            ]
        core = all(checks.values())
        workers = runtime["active_workers"]
        compatible = bool(workers) and all(
            w.get("investigation_mode") == "adaptive"
            and w.get("model_config_version") == runtime["model_config_version"]
            and w.get("configured_model") == runtime["configured_model"]
            and w.get("max_output_tokens") == runtime["max_output_tokens"]
            and w.get("timeout_seconds") == runtime["timeout_seconds"]
            and w.get("declared_context_window") == runtime["declared_context_window"]
            for w in workers
        )
        ai_policy = {
            "knowledge",
            "observation",
            "interaction",
            "transaction",
            "document",
        } <= ai_kinds
        ai_available = (
            ai_policy
            and runtime["endpoint_reachable"]
            and runtime["adaptive_mode_enabled"]
            and compatible
        )
        return {
            "checked_at": now(),
            "scope": scope,
            "synthetic_development": True,
            "state": "ready_unqualified"
            if core and ai_available
            else "ready_limited"
            if core
            else "blocked",
            "activation_allowed": core,
            "activation_valid": bool(
                core and latest and latest.data["profile_version"] == profile.data["version"]
            ),
            "activation": view(latest) if latest else None,
            "checks": checks,
            "sources": source_states,
            "ai": {
                **runtime,
                "worker_configuration_consistent": compatible,
                "source_processing_policy_enabled": ai_policy,
                "available_for_experiment": ai_available,
            },
            "production_approved": False,
            "limitations": [
                "Synthetic setup only; no SSO or identity-provider binding",
                "Model is unqualified; availability is not reasoning acceptance",
                "Runtime/connector configuration is deployment-managed, not browser-editable",
            ],
        }

    @app.get("/v1/setup", response_model=SetupView)
    def read_setup(p=Depends(administrator)):
        with db.session() as s:
            profile = get(s, scope, "demo_setup", "profile")
            return {
                "scope": scope,
                "profile": view(profile) if profile else None,
                "administrator": {"subject": p.subject, "roles": p.roles, "clearance": p.clearance},
                "identity_provider_verified": False,
                "configuration_owner": "deployment_administrator",
            }

    @app.post("/v1/setup", response_model=RowView)
    def save_setup(request: DemoProfile, p=Depends(administrator)):
        with db.session() as s:
            lock_scope(s, scope)
            previous = get(s, scope, "demo_setup", "profile")
            values = request.model_dump()
            if previous and all(previous.data[k] == v for k, v in values.items()):
                return view(previous)
            data = {
                **values,
                "version": previous.data["version"] + 1 if previous else 1,
                "saved_by": p.subject,
            }
            if previous:
                previous.data = data
            else:
                previous = put(s, scope, "demo_setup", "profile", data)
            audit(s, scope, p.subject, "demo_setup.saved", previous.id)
            return view(previous)

    @app.get("/v1/setup/readiness", response_model=ReadinessView)
    def check_readiness(p=Depends(administrator)):
        return readiness(p)

    @app.post("/v1/setup/activate", response_model=ActivationView)
    def activate(p=Depends(administrator)):
        checked = readiness(p)
        if not checked["activation_allowed"]:
            raise HTTPException(
                409, {"message": "Core synthetic setup is incomplete", "checks": checked["checks"]}
            )
        with db.session() as s:
            lock_scope(s, scope)
            profile = get(s, scope, "demo_setup", "profile")
            # Recheck authoritative prerequisites under the activation write lock.
            active = [
                r for r in rows(s, scope, "source") if r.data.get("authorization_state") == "active"
            ]
            kinds = {k for r in active for k in r.data["record_types"]}
            if (
                not profile
                or not {"knowledge", "observation", "interaction", "transaction", "document"}
                <= kinds
            ):
                raise HTTPException(409, "Setup changed during readiness check; check again")
            if not context(s, scope, now(), now(), p.clearance)["relationships"] or not any(
                e.data["record_type"] == "document"
                and e.data["source_id"] in {source.key for source in active}
                for e in rows(s, scope, "evidence")
            ):
                raise HTTPException(409, "Evidence changed during readiness check")
            existing = get(s, scope, "demo_activation", str(profile.data["version"]))
            if not existing:
                existing = put(
                    s,
                    scope,
                    "demo_activation",
                    str(profile.data["version"]),
                    {
                        "profile_version": profile.data["version"],
                        "actor": p.subject,
                        "state_at_activation": checked["state"],
                        "checks": checked["checks"],
                        "production_approved": False,
                        "activation_id": uid(),
                    },
                )
                audit(s, scope, p.subject, "demo_setup.activated", existing.id)
            return {
                "activation": view(existing),
                "readiness_state": checked["state"],
                "production_approved": False,
            }
