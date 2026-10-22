"""Restartable worker; one remote runtime, default one request, no in-process weights."""

import argparse
import os
import signal
from concurrent.futures import ThreadPoolExecutor
from threading import Event, Thread

from apps.veriq.backend.inference import LocalInference
from apps.veriq.backend.maintenance import maintain
from apps.veriq.backend.orchestration import run_one, settings
from shared.auth import Auth
from shared.contracts import uid
from shared.db import Database


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--once", action="store_true")
    args = parser.parse_args()
    db = Database(os.environ["VERIQ_DATABASE_URL"])
    scope = os.getenv("INSTALLATION_SCOPE", "cedar:development")
    inference, auth = LocalInference(), Auth()
    worker_id = "worker:" + uid()
    stop = Event()
    signal.signal(signal.SIGTERM, lambda *_: stop.set())
    maintenance = Thread(target=maintain, args=(db, scope, worker_id, inference, stop), daemon=True)
    if not args.once:
        maintenance.start()
    try:
        with ThreadPoolExecutor(max_workers=settings()["concurrency"]) as pool:
            while not stop.is_set():
                jobs = [
                    pool.submit(run_one, db, scope, inference, auth, worker_id=worker_id)
                    for _ in range(settings()["concurrency"])
                ]
                for job in jobs:
                    result = job.result()
                    if result:
                        print(result["id"], result["data"]["state"], flush=True)
                if args.once:
                    break
                stop.wait(1)
    finally:
        stop.set()
        if maintenance.is_alive():
            maintenance.join(timeout=20)


if __name__ == "__main__":
    main()
