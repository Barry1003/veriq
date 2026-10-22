"""Pull connector uses deployment-managed URLs and credentials, never user-supplied URLs."""

import os
from typing import Protocol
from urllib.parse import urlparse

import httpx
from fastapi import HTTPException

from apps.veriq.backend.ingestion import ingest, record_error
from shared.contracts import Envelope, now
from shared.db import audit, get, lock_scope


class SourceFeed(Protocol):
    def page(self, source_id: str, cursor: int) -> dict: ...


class CedarFeed:
    def __init__(self, url: str, token: str, client=None):
        parsed = urlparse(url)
        allowlist = os.getenv("CONNECTOR_ALLOWED_HOSTS", "127.0.0.1,localhost,cedar").split(",")
        if (
            parsed.scheme not in {"http", "https"}
            or parsed.hostname not in allowlist
            or parsed.username
        ):
            raise ValueError("Connector endpoint must be on approved host allowlist")
        self.url, self.token, self.client = url.rstrip("/"), token, client

    def page(self, source_id, cursor):
        params = {"source_id": source_id, "after": cursor, "limit": 100}
        headers = {"Authorization": "Bearer " + self.token}
        if self.client:
            response = self.client.get(self.url + "/v1/feed", params=params, headers=headers)
        else:
            with httpx.Client(timeout=15, trust_env=False, follow_redirects=False) as client:
                response = client.get(self.url + "/v1/feed", params=params, headers=headers)
        response.raise_for_status()
        return response.json()


def pull(db, scope, source_id, source_secret, feed: SourceFeed, actor):
    try:
        with db.session() as s:
            source = get(s, scope, "source", source_id)
            if not source:
                raise HTTPException(404, "Source not found")
            if source.data.get("authorization_state") == "revoked":
                raise HTTPException(403, "Source authorization revoked")
            cursor = source.data["cursor"]
        starting_cursor = cursor
        page = feed.page(source_id, cursor)
        results = []
        # Page is atomic; cursor advances only after every envelope validates and commits.
        with db.session() as s:
            lock_scope(s, scope)
            source = get(s, scope, "source", source_id)
            if source.data.get("authorization_state") == "revoked":
                raise HTTPException(403, "Source authorization revoked")
            if source.data["cursor"] != starting_cursor:
                raise HTTPException(409, "Another pull advanced this source; retry")
            for item in page["items"]:
                envelope = Envelope.model_validate(item["envelope"])
                if envelope.source_id != source_id or item["sequence"] <= cursor:
                    raise ValueError("Feed source or sequence mismatch")
                results.append(ingest(s, scope, envelope, source_secret, actor))
                cursor = item["sequence"]
            if page["next_cursor"] != cursor:
                raise ValueError("Feed cursor does not match acknowledged records")
            source.data = {
                **source.data,
                "cursor": cursor,
                "last_pull_at": now(),
                "last_error": None,
            }
            audit(
                s,
                scope,
                actor,
                "connector.pulled",
                source_id,
                source.classification,
                {"cursor": cursor, "received": len(results)},
            )
        return {"source_id": source_id, "received": len(results), "next_cursor": cursor}
    except (httpx.HTTPError, ValueError, KeyError, HTTPException) as exc:
        with db.session() as s:
            record_error(s, scope, source_id, "Pull failed; cursor unchanged")
        if isinstance(exc, HTTPException):
            raise
        raise HTTPException(502, "Pull failed; inspect ingestion activity") from exc
