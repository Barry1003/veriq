import hashlib
import hmac
import json
import os
from dataclasses import dataclass

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

ROLE_PERMISSIONS = {
    "ai_service": {"knowledge", "customer", "investigation"},
    "admin": {
        "identity",
        "sources",
        "knowledge",
        "operations",
        "customer",
        "investigation",
        "review",
        "audit",
        "bank",
        "simulator",
        "feed",
    },
    "institution_admin": {"sources", "knowledge", "audit", "identity"},
    "operations": {"knowledge", "operations"},
    "customer_analyst": {"customer"},
    "investigator": {"knowledge", "operations", "customer", "investigation"},
    "reviewer": {"knowledge", "review", "investigation"},
    "customer": {"bank"},
    "bank_operator": {"bank", "operations", "knowledge", "customer"},
    "connector": {"feed"},
    "simulator": {"simulator"},
}


@dataclass(frozen=True)
class Principal:
    subject: str
    scope: str
    roles: tuple[str, ...]
    clearance: str = "internal"
    customer_id: str | None = None

    def require(self, permission: str):
        if not any(permission in ROLE_PERMISSIONS.get(r, set()) for r in self.roles):
            raise HTTPException(403, "Permission denied")

    def can_read(self, classification: str) -> bool:
        return classification == "internal" or self.clearance == "restricted"


class Auth:
    def __init__(self, credentials: dict[str, Principal] | None = None):
        self.credentials = (
            credentials
            if credentials is not None
            else {
                token: Principal(
                    p["subject"],
                    p["scope"],
                    tuple(p["roles"]),
                    p.get("clearance", "internal"),
                    p.get("customer_id"),
                )
                for token, p in json.loads(os.getenv("AUTH_CREDENTIALS", "{}")).items()
            }
        )

    def dependency(self):
        bearer = HTTPBearer(auto_error=False)

        def authenticate(credential: HTTPAuthorizationCredentials | None = Depends(bearer)):
            if credential:
                for token, principal in self.credentials.items():
                    if hmac.compare_digest(token, credential.credentials):
                        return principal
            raise HTTPException(401, "Valid bank-provisioned bearer credential required")

        return authenticate


def secret_hash(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()
