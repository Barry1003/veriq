"""Configure the two local demo frontends from a private named rehearsal."""

import argparse
import json
from pathlib import Path
from secrets import token_urlsafe

from scripts.bootstrap import write_private
from scripts.rehearsal import load


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run", required=True)
    parser.add_argument("--cedar-port", type=int, default=3000)
    parser.add_argument("--veriq-port", type=int, default=3001)
    args = parser.parse_args()
    if args.cedar_port == args.veriq_port or any(
        not 1024 <= port <= 65535 for port in (args.cedar_port, args.veriq_port)
    ):
        parser.error("Use distinct unprivileged frontend ports")
    private, manifest = load(args.run)
    runtime = json.loads((private / "runtime.json").read_text())
    root = Path(__file__).resolve().parents[3]
    accounts_file = private / "browser-logins.json"
    accounts = json.loads(accounts_file.read_text()) if accounts_file.exists() else {}
    for app, roles in (
        ("cedar", ("customer", "staff", "operator")),
        ("veriq", ("admin", "investigator")),
    ):
        directory = root / "client" / app
        target = directory / ".env.local"
        # Never overwrite another operator's environment or silently rotate recovery keys.
        if target.exists():
            raise SystemExit(
                f"Preserved existing {target}; move it aside explicitly before configuring a different rehearsal"
            )
        prefix = app.upper()
        accounts.setdefault(
            app,
            {role: {"username": f"{app}-{role}", "password": token_urlsafe(24)} for role in roles},
        )
        values = {
            "DEMO_AUTH_ENABLED": "true",
            f"{prefix}_DATA_SOURCE": "api",
            f"{prefix}_API_URL": f"http://127.0.0.1:{manifest[app + '_port']}",
            f"{prefix}_UI_ORIGIN": f"http://localhost:{getattr(args, app + '_port')}",
            f"{prefix}_SESSION_SECRET": token_urlsafe(48),
        }
        for role, user in accounts[app].items():
            values[f"{prefix}_{role.upper()}_USERNAME"] = user["username"]
            values[f"{prefix}_{role.upper()}_PASSWORD"] = user["password"]
        if app == "cedar":
            values.update(
                {
                    "CEDAR_CUSTOMER_TOKEN": runtime["tokens"]["customer1"],
                    "CEDAR_STAFF_TOKEN": runtime["tokens"]["cedar_operator"],
                    "CEDAR_CHANNEL_TOKEN": runtime["tokens"]["cedar_operator"],
                    "CEDAR_FEED_TOKEN": runtime["tokens"]["cedar_feed"],
                    "CEDAR_SIMULATOR_TOKEN": runtime["tokens"]["cedar_simulator"],
                    "CEDAR_REQUEST_COOKIE_SECRET": token_urlsafe(48),
                    "CEDAR_REQUEST_STORE": str(private / "browser-requests"),
                }
            )
        else:
            values.update(
                {
                    "VERIQ_ADMIN_TOKEN": runtime["tokens"]["veriq_admin"],
                    "VERIQ_INVESTIGATOR_TOKEN": runtime["tokens"]["veriq_internal"],
                }
            )
        write_private(target, "\n".join(f"{key}={value}" for key, value in values.items()) + "\n")
    write_private(accounts_file, json.dumps(accounts, indent=2) + "\n")
    print(
        "Configured server-only .env.local files. Separate browser logins are saved privately at",
        accounts_file,
    )


if __name__ == "__main__":
    main()
