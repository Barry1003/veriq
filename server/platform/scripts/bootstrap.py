"""Generate private, separate development credentials. No built-in application passwords."""

import json
import os
from pathlib import Path
from secrets import token_urlsafe

from apps.cedar.backend.channels import CHANNEL_SOURCES
from apps.cedar.backend.service import SOURCE_POLICIES

ROOT = Path(__file__).resolve().parents[1]
SCOPE = "cedar:development"
AUTHORITIES = {
    "knowledge": "structure",
    "observation": "measurement",
    "interaction": "report",
    "transaction": "status",
    "document": "document",
}


def write_private(path, data):
    # Set owner-only permissions before writing secrets, including on an existing file.
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    os.fchmod(fd, 0o600)
    with os.fdopen(fd, "w") as stream:
        stream.write(data)


def bootstrap(var=None):
    var = var or ROOT / "var"
    var.mkdir(mode=0o700, exist_ok=True)
    if (var / "runtime.json").exists():
        if "--upgrade-channels" in __import__("sys").argv:
            upgrade_channels(var)
        else:
            print(
                "Existing private runtime configuration preserved; use --upgrade-channels for additive grants"
            )
        return
    tokens = {
        name: token_urlsafe(32)
        for name in (
            "veriq_admin",
            "veriq_internal",
            "cedar_operator",
            "customer1",
            "customer2",
            "cedar_feed",
            "cedar_simulator",
        )
    }

    def principal(subject, roles, clearance="internal", customer_id=None):
        return {
            "subject": subject,
            "scope": SCOPE,
            "roles": roles,
            "clearance": clearance,
            "customer_id": customer_id,
        }

    veriq_auth = {
        tokens["veriq_admin"]: principal("Daniel-development", ["admin"], "restricted"),
        tokens["veriq_internal"]: principal("Demo investigator", ["investigator"]),
    }
    cedar_auth = {
        tokens["cedar_operator"]: principal("Cedar operations", ["bank_operator"]),
        tokens["cedar_simulator"]: principal("Development scenario controller", ["simulator"]),
        tokens["customer1"]: principal("Synthetic customer C1", ["customer"], customer_id="C1"),
        tokens["customer2"]: principal("Synthetic customer C2", ["customer"], customer_id="C2"),
        tokens["cedar_feed"]: principal("Authorized Veriq connector", ["connector"], "restricted"),
    }
    sources = []
    connectors = {}
    for source, (kind, grant) in SOURCE_POLICIES.items():
        secret = token_urlsafe(32)
        sources.append(
            {
                "source_id": source,
                "name": source,
                "record_types": [kind],
                "authority": [AUTHORITIES[kind]],
                "max_classification": "internal",
                "authorization_ref": grant,
                "ingestion_secret": secret,
                **channel_metadata(source),
            }
        )
        connectors[source] = {
            "url": "http://127.0.0.1:8101",
            "token": tokens["cedar_feed"],
            "source_secret": secret,
        }
    runtime = {
        "synthetic_development_only": True,
        "tokens": tokens,
        "sources": sources,
        "cedar": {
            "AUTH_CREDENTIALS": json.dumps(cedar_auth),
            "INSTALLATION_SCOPE": SCOPE,
            "CEDAR_SIMULATOR_ENABLED": "true",
            "CEDAR_DATABASE_URL": "sqlite:///var/cedar.db",
        },
        "veriq": {
            "AUTH_CREDENTIALS": json.dumps(veriq_auth),
            "INSTALLATION_SCOPE": SCOPE,
            "VERIQ_DATABASE_URL": "sqlite:///var/veriq.db",
            "CEDAR_CONNECTORS": json.dumps(connectors),
        },
    }
    write_private(var / "runtime.json", json.dumps(runtime, indent=2) + "\n")
    # Compose env files use independent Postgres services and the internal Cedar hostname.
    for app in ("cedar", "veriq"):
        password = token_urlsafe(32)
        write_private(
            var / f"{app}-db.env",
            f"POSTGRES_DB={app}\nPOSTGRES_USER={app}\nPOSTGRES_PASSWORD={password}\n",
        )
        values = dict(runtime[app])
        values[f"{app.upper()}_DATABASE_URL"] = (
            f"postgresql+psycopg://{app}:{password}@{app}-db:5432/{app}"
        )
        values["CORS_ORIGINS"] = "http://localhost:5173"
        if app == "veriq":
            values["CEDAR_CONNECTORS"] = json.dumps(
                {k: {**v, "url": "http://cedar:8101"} for k, v in connectors.items()}
            )
        write_private(var / f"{app}.env", "".join(f"{k}={v}\n" for k, v in values.items()))
    print("Generated owner-only configuration in var/. No credentials printed.")


def channel_metadata(source):
    return next(
        (
            {"channel": channel, "adapter_id": adapter}
            for channel, (sid, _, adapter) in CHANNEL_SOURCES.items()
            if sid == source
        ),
        {},
    )


def upgrade_channels(var):
    runtime = json.loads((var / "runtime.json").read_text())
    existing = {source["source_id"] for source in runtime["sources"]}
    connectors = json.loads(runtime["veriq"]["CEDAR_CONNECTORS"])
    for channel, (source, grant, adapter) in CHANNEL_SOURCES.items():
        if source in existing:
            continue
        secret = token_urlsafe(32)
        runtime["sources"].append(
            {
                "source_id": source,
                "name": source,
                "record_types": ["interaction"],
                "authority": ["report"],
                "max_classification": "internal",
                "authorization_ref": grant,
                "ingestion_secret": secret,
                "channel": channel,
                "adapter_id": adapter,
            }
        )
        connectors[source] = {
            "url": "http://127.0.0.1:8101",
            "token": runtime["tokens"]["cedar_feed"],
            "source_secret": secret,
        }
    if "cedar-documents" not in existing:
        secret = token_urlsafe(32)
        runtime["sources"].append(
            {
                "source_id": "cedar-documents",
                "name": "Cedar authorized documents",
                "record_types": ["document"],
                "authority": ["document"],
                "max_classification": "internal",
                "authorization_ref": "cedar-documents-v1",
                "ingestion_secret": secret,
            }
        )
        connectors["cedar-documents"] = {
            "url": "http://127.0.0.1:8101",
            "token": runtime["tokens"]["cedar_feed"],
            "source_secret": secret,
        }
    runtime["veriq"]["CEDAR_CONNECTORS"] = json.dumps(connectors)
    write_private(var / "runtime.json", json.dumps(runtime, indent=2) + "\n")
    envpath = var / "veriq.env"
    if envpath.exists():
        values = dict(
            line.split("=", 1) for line in envpath.read_text().splitlines() if "=" in line
        )
        values["CEDAR_CONNECTORS"] = json.dumps(
            {k: {**v, "url": "http://cedar:8101"} for k, v in connectors.items()}
        )
        write_private(envpath, "".join(f"{k}={v}\n" for k, v in values.items()))
    print("Added missing channel grants; existing credentials and databases preserved")


if __name__ == "__main__":
    bootstrap()
