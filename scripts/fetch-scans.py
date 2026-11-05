#!/usr/bin/env python3
"""Downloads the user's own scans of the printed game from their Google Drive folder into .local-data/scans.

Every file is checked against docs/sources/base-scans-manifest.json (size and SHA-256), so a finished run holds
byte-for-byte the originals that were catalogued. Files already present and valid are kept.

    pip install gdown
    python3 scripts/fetch-scans.py            # everything, about 1 GB
    python3 scripts/fetch-scans.py "Tokens"   # only paths starting with this prefix

Afterwards: npm run scans:prepare
"""
import hashlib, json, os, sys, time
from concurrent.futures import ThreadPoolExecutor

try:
    import gdown
except ImportError:
    sys.exit("This needs gdown: pip install gdown")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST = os.path.join(ROOT, "docs", "sources", "base-scans-manifest.json")
DEST = os.path.join(ROOT, ".local-data", "scans")
prefix = sys.argv[1] if len(sys.argv) > 1 else ""
files = [f for f in json.load(open(MANIFEST))["files"] if f["path"].startswith(prefix)]


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def valid(path, f):
    return os.path.exists(path) and os.path.getsize(path) == f["bytes"] and sha256(path) == f["sha256"]


def fetch(f):
    out = os.path.join(DEST, f["path"])
    if valid(out, f):
        return "cached", f["path"]
    os.makedirs(os.path.dirname(out), exist_ok=True)
    for attempt in range(3):
        try:
            gdown.download(id=f["id"], output=out, quiet=True, use_cookies=False, resume=False)
        except Exception:
            pass
        if valid(out, f):
            return "ok", f["path"]
        if os.path.exists(out):
            os.remove(out)
        time.sleep(2 * (attempt + 1))
    return "failed", f["path"]


started = time.time()
with ThreadPoolExecutor(8) as pool:
    results = list(pool.map(fetch, files))
count = lambda s: sum(1 for status, _ in results if status == s)
print(f"{len(files)} files: {count('ok')} downloaded, {count('cached')} already present, {count('failed')} failed, {time.time() - started:.0f}s")
for status, path in results:
    if status == "failed":
        print("FAILED", path)
sys.exit(1 if count("failed") else 0)
