"""Independent application runner with migrations and bank-provisioned credentials."""

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path

import uvicorn


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("application", choices=["cedar", "veriq"])
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int)
    parser.add_argument("--container", action="store_true")
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    os.chdir(root)
    if not args.container:
        config_path = root / "var/runtime.json"
        if not config_path.exists():
            raise SystemExit("Run python -m scripts.bootstrap first")
        values = json.loads(config_path.read_text())[args.application]
        for name, value in values.items():
            os.environ.setdefault(name, value)
    database_url = os.environ[f"{args.application.upper()}_DATABASE_URL"]
    env = {**os.environ, "DATABASE_URL": database_url}
    subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"], cwd=root, env=env, check=True
    )
    uvicorn.run(
        f"apps.{args.application}.backend.api:app",
        host=args.host,
        port=args.port or (8101 if args.application == "cedar" else 8100),
    )


if __name__ == "__main__":
    main()
