"""Worker maintenance: heartbeat and optional approved feed polling, independent of inference."""

import json
import os
import time

from apps.veriq.backend.connectors import CedarFeed, pull
from apps.veriq.backend.orchestration import heartbeat
from shared.db import get


def maintain(db, scope, worker_id, inference, stop):
    from shared.contracts import now

    feeds = json.loads(os.getenv("CEDAR_CONNECTORS", "{}"))
    interval = max(1, float(os.getenv("AUTO_CONNECTOR_POLL_SECONDS", "5")))
    polling = os.getenv("AUTO_CONNECTOR_POLL_ENABLED", "false").lower() == "true"
    next_poll = 0
    while not stop.is_set():
        heartbeat(db, scope, worker_id, inference)
        if polling and time.monotonic() >= next_poll:
            for source_id, config in feeds.items():
                if stop.is_set():
                    break
                with db.session() as s:
                    source = get(s, scope, "source", source_id)
                    eligible = source and source.data.get("authorization_state") != "revoked"
                if not eligible:
                    continue
                try:
                    pull(
                        db,
                        scope,
                        source_id,
                        config["source_secret"],
                        CedarFeed(config["url"], config["token"]),
                        "approved-connector-worker",
                    )
                except Exception:
                    # pull() records a sanitized durable connector error. Retry at the
                    # next bounded poll; inference availability has no bearing on it.
                    pass
            next_poll = time.monotonic() + interval
        stop.wait(1)
    # No model or network request is used to stop the heartbeat.
    with db.session() as s:
        row = get(s, scope, "worker_heartbeat", worker_id)
        if row:
            row.data = {**row.data, "state": "stopped", "last_seen_at": now()}
