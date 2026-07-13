#!/usr/bin/env python3
"""
Fetch date_of_birth for the 56 famous players from transfermarkt-datasets.

Downloads the players CSV from the same DVC storage used by
scripts/etl/fetch_transfermarkt_datasets.py, matches by player_id,
and writes data/player_ages.json.
"""

import gzip
import io
import json
import logging
import sys
from pathlib import Path

_missing = []
for _mod in ("pandas", "requests"):
    try:
        __import__(_mod)
    except ImportError:
        _missing.append(_mod)
if _missing:
    print(f"Missing required packages: {', '.join(_missing)}")
    print(f"Install them with:\n  pip install {' '.join(_missing)}")
    sys.exit(1)

import pandas as pd
import requests

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parents[1]

# DVC remote base URL (public R2 bucket) — same as fetch_transfermarkt_datasets.py
DVC_BASE = "https://pub-e682421888d945d684bcae8890b0ec20.r2.dev/dvc/"
DVC_DIR_PATH = "files/md5/0f/72998dde02fc0ca9a9a172f92c609e.dir"
REQUEST_TIMEOUT = 60
HEADERS = {"User-Agent": "football-etl/1.0"}


def _dvc_url(md5_hash: str) -> str:
    return f"{DVC_BASE}files/md5/{md5_hash[:2]}/{md5_hash[2:]}"


def get_famous_player_ids() -> dict[int, str]:
    """Return {player_id: name} for all famous players (fame_score >= 55)."""
    players_db = json.loads((PROJECT_ROOT / "data" / "players_db_v1.json").read_text())
    fame_scores = json.loads((PROJECT_ROOT / "data" / "fame_scores.json").read_text())

    db_ids = {p["id"] for p in players_db}
    player_names = {p["id"]: p["name"] for p in players_db}

    famous = {}
    for entry in fame_scores:
        if entry["fame_score"] >= 55 and entry["global_id"] in db_ids:
            pid = entry["global_id"]
            famous[pid] = player_names.get(pid, entry.get("name", ""))
    return famous


def main() -> None:
    famous = get_famous_player_ids()
    log.info(f"Found {len(famous)} famous players to look up")

    # Step 1: fetch DVC directory listing
    try:
        url = DVC_BASE + DVC_DIR_PATH
        log.info("Fetching DVC directory listing...")
        resp = requests.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT)
        resp.raise_for_status()
        file_index = {entry["relpath"]: entry["md5"] for entry in resp.json()}
    except Exception as exc:
        log.error(f"Failed to fetch DVC directory: {exc}")
        sys.exit(1)

    # Step 2: download players.csv
    players_hash = file_index.get("players.csv.gz")
    if not players_hash:
        log.error("players.csv.gz not found in DVC directory")
        sys.exit(1)

    try:
        csv_url = _dvc_url(players_hash)
        log.info("Downloading players.csv.gz...")
        resp = requests.get(csv_url, headers=HEADERS, timeout=REQUEST_TIMEOUT)
        resp.raise_for_status()
        raw = gzip.decompress(resp.content)
        log.info(f"Decompressed {len(raw):,} bytes")
        df = pd.read_csv(io.BytesIO(raw), low_memory=False)
    except Exception as exc:
        log.error(f"Failed to download players CSV: {exc}")
        sys.exit(1)

    log.info(f"Loaded {len(df):,} rows, columns: {list(df.columns)}")

    # Step 3: match by player_id and extract date_of_birth
    dob_col = None
    for candidate in ("date_of_birth", "dateOfBirth", "dob", "birth_date"):
        if candidate in df.columns:
            dob_col = candidate
            break

    if dob_col is None:
        log.error(f"No date_of_birth column found. Available columns: {list(df.columns)}")
        sys.exit(1)

    log.info(f"Using column '{dob_col}' for date of birth")

    # Build lookup: player_id -> date_of_birth
    id_col = "player_id" if "player_id" in df.columns else "id"
    df_lookup = df[[id_col, dob_col]].dropna(subset=[id_col, dob_col])
    df_lookup[id_col] = df_lookup[id_col].astype(int)
    dob_map = dict(zip(df_lookup[id_col], df_lookup[dob_col]))

    result = {}
    missing = []
    for pid, name in sorted(famous.items()):
        dob = dob_map.get(pid)
        if dob and not pd.isna(dob):
            # Normalize to YYYY-MM-DD
            result[str(pid)] = str(dob)[:10]
        else:
            missing.append((pid, name))

    log.info(f"Matched {len(result)} / {len(famous)} players")
    if missing:
        log.warning(f"Missing DOB for {len(missing)} players:")
        for pid, name in missing:
            log.warning(f"  {pid}: {name}")

    # Step 4: write output
    output_path = PROJECT_ROOT / "data" / "player_ages.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    log.info(f"Wrote {len(result)} entries to {output_path}")


if __name__ == "__main__":
    main()
