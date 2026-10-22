"""Package reviewable source and frontend contracts, excluding private runtime files."""

import hashlib
import json
import subprocess
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parents[1]


def main():
    names = (
        subprocess.check_output(
            ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"], cwd=ROOT
        )
        .decode()
        .split("\0")
    )
    files = [ROOT / name for name in names if name and (ROOT / name).is_file()]
    forbidden = {".venv", "var", ".git", "__pycache__", ".pytest_cache", ".ruff_cache"}
    assert all(not forbidden.intersection(p.relative_to(ROOT).parts) for p in files)
    assert all(p.name != ".env" and not p.name.endswith(".db") for p in files)
    runtime_path = ROOT / "var/runtime.json"
    if runtime_path.exists():
        runtime = json.loads(runtime_path.read_text())
        secrets = list(runtime["tokens"].values()) + [
            s["ingestion_secret"] for s in runtime["sources"]
        ]
        for path in files:
            content = path.read_bytes()
            assert all(value.encode() not in content for value in secrets), (
                f"Private credential in {path}"
            )
    source = ROOT.parent / "veriq-platform-source-v0.5.0.zip"
    with ZipFile(source, "w", ZIP_DEFLATED) as archive:
        for path in sorted(files):
            archive.write(path, Path("veriq-platform") / path.relative_to(ROOT))
    contracts = ROOT.parent / "veriq-frontend-contracts-v0.5.0.zip"
    with ZipFile(contracts, "w", ZIP_DEFLATED) as archive:
        for path in sorted((ROOT / "contracts").rglob("*")):
            if path.is_file():
                archive.write(
                    path, Path("veriq-contracts-v0.5.0") / path.relative_to(ROOT / "contracts")
                )
    report = {}
    for path in (source, contracts):
        report[path.name] = {
            "bytes": path.stat().st_size,
            "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        }
    (ROOT.parent / "veriq-delivery-manifest-v0.5.0.json").write_text(
        json.dumps(report, indent=2) + "\n"
    )
    print(
        json.dumps(
            {"source_files": len(files), "credential_scan": "passed", "archives": report}, indent=2
        )
    )


if __name__ == "__main__":
    main()
