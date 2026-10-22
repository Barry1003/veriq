"""Provision pinned official llama.cpp/Qwen artifacts; resumable downloads, verified hashes."""

import argparse
import hashlib
import json
import shutil
import tarfile
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def digest(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def download(url, target, size, expected, workers=6):
    if target.exists() and target.stat().st_size == size and digest(target) == expected:
        print(target.name, "already SHA-256 verified", flush=True)
        return
    cache = target.parent / (target.name + ".parts")
    cache.mkdir(exist_ok=True)
    # Resolve the public artifact redirect once. Signed storage URLs are used only
    # during provisioning and are not written into user-facing reports.
    probe = urllib.request.Request(url, headers={"Range": "bytes=0-0"})
    with urllib.request.urlopen(probe, timeout=30) as response:
        url = response.url
    block = (size + workers - 1) // workers

    def part(index):
        begin, end = index * block, min(size - 1, (index + 1) * block - 1)
        path = cache / str(index)
        for attempt in range(8):
            done = path.stat().st_size if path.exists() else 0
            if done == end - begin + 1:
                return path
            try:
                request = urllib.request.Request(
                    url, headers={"Range": f"bytes={begin + done}-{end}"}
                )
                with urllib.request.urlopen(request, timeout=60) as response:
                    if (
                        response.status != 206
                        or response.headers.get("Content-Range")
                        != f"bytes {begin + done}-{end}/{size}"
                    ):
                        raise RuntimeError("Artifact server did not honor resumable byte range")
                    with path.open("ab") as out:
                        while chunk := response.read(1024 * 1024):
                            out.write(chunk)
                if path.stat().st_size != end - begin + 1:
                    raise RuntimeError("Incomplete artifact range")
                print(target.name, "range", index + 1, "received", flush=True)
                return path
            except Exception:
                if attempt == 7:
                    raise
                time.sleep(min(attempt + 1, 5))
        raise RuntimeError("Artifact download exhausted retries")

    with ThreadPoolExecutor(max_workers=workers) as pool:
        pieces = list(pool.map(part, range(workers)))
    temporary = target.with_suffix(target.suffix + ".verified-download")
    with temporary.open("wb") as stream:
        for path in pieces:
            with path.open("rb") as piece:
                shutil.copyfileobj(piece, stream)
    if digest(temporary) != expected:
        raise RuntimeError("Artifact SHA-256 mismatch; refusing model execution")
    temporary.replace(target)
    print(target.name, "full published SHA-256 verified", flush=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--workers", type=int, default=6)
    parser.add_argument(
        "--manifest", type=Path, default=ROOT / "deploy/local-ai-small-manifest.json"
    )
    args = parser.parse_args()
    manifest = json.loads(args.manifest.read_text())
    runtime = ROOT / "var/llama-runtime"
    models = ROOT / "var/models"
    runtime.mkdir(parents=True, exist_ok=True)
    models.mkdir(parents=True, exist_ok=True)
    asset = manifest["runtime_assets"][0]
    archive = runtime / "runtime.tar.gz"
    download(
        asset["browser_download_url"],
        archive,
        asset["size"],
        asset["digest"].split(":")[1],
        args.workers,
    )
    with tarfile.open(archive) as package:
        package.extractall(runtime, filter="data")
    weight = manifest["model_files"][0]
    url = (
        "https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/"
        + manifest["model_revision"]
        + "/"
        + weight["rfilename"]
    )
    url = weight.get("url", url)
    download(
        url, models / weight["rfilename"], weight["size"], weight["lfs"]["sha256"], args.workers
    )
    print("Pinned local model and runtime ready. See ticket002 deployment guide.", flush=True)


if __name__ == "__main__":
    main()
