#!/usr/bin/env python3
"""
Transfermarkt-datasets downloader and parser.

Downloads player CSVs from the transfermarkt-datasets DVC storage (Cloudflare R2),
parses them, and outputs a standardized JSON matching the players_db schema.

Usage:
    python3 scripts/etl/fetch_transfermarkt_datasets.py
"""

import gzip
import io
import json
import logging
import sys
from pathlib import Path

# --- Dependency check -----------------------------------------------------------
_missing = []
for _mod in ("pandas", "unidecode", "requests"):
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
from unidecode import unidecode

# --- Configuration --------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parents[2]
OUTPUT_PATH = PROJECT_ROOT / "data" / "transfermarkt_update.json"

# DVC remote base URL (public R2 bucket)
DVC_BASE = "https://pub-e682421888d945d684bcae8890b0ec20.r2.dev/dvc/"
DVC_DIR_PATH = "files/md5/0f/72998dde02fc0ca9a9a172f92c609e.dir"

REQUEST_TIMEOUT = 60
HEADERS = {"User-Agent": "football-etl/1.0"}

# Competition ID → league name mapping
COMPETITION_MAP: dict[str, str] = {
    "GB1": "Premier League",
    "ES1": "La Liga",
    "L1": "Bundesliga",
    "IT1": "Serie A",
    "FR1": "Ligue 1",
    "NL1": "Eredivisie",
    "PO1": "Liga Portugal",
    "TR1": "Super Lig",
    "RU1": "Russian Premier League",
    "SC1": "Scottish Premiership",
    "BE1": "Jupiler Pro League",
    "GR1": "Super League Greece",
    "UKR1": "Ukrainian Premier League",
    "A1": "Austrian Bundesliga",
    "DK1": "Danish Superliga",
    "SE1": "Allsvenskan",
    "NO1": "Eliteserien",
    "C1": "Swiss Super League",
    "MX1": "Liga MX",
    "AR1N": "Argentine Primera Division",
    "BRA1": "Brasileirao",
    "US1": "MLS",
    "SA1": "Saudi Pro League",
    "JA1": "J1 League",
    "KO1": "K League 1",
    "CN1": "Chinese Super League",
}

# Position normalization
POSITION_MAP: dict[str, str] = {
    "Attack": "Attack",
    "attack": "Attack",
    "Midfield": "Midfield",
    "midfield": "Midfield",
    "Defender": "Defender",
    "defender": "Defender",
    "Goalkeeper": "Goalkeeper",
    "goalkeeper": "Goalkeeper",
}


def _dvc_url(md5_hash: str) -> str:
    """Build a DVC file URL from its md5 hash."""
    return f"{DVC_BASE}files/md5/{md5_hash[:2]}/{md5_hash[2:]}"


def fetch_dvc_directory() -> dict[str, str]:
    """Fetch the DVC directory listing and return {filename: md5_hash}."""
    url = DVC_BASE + DVC_DIR_PATH
    log.info("Fetching DVC directory listing from R2...")
    resp = requests.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT)
    resp.raise_for_status()
    return {entry["relpath"]: entry["md5"] for entry in resp.json()}


def download_csv(name: str, md5_hash: str) -> pd.DataFrame:
    """Download a gzipped CSV from DVC storage and return a DataFrame."""
    url = _dvc_url(md5_hash)
    log.info(f"Downloading {name} ...")
    resp = requests.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT)
    resp.raise_for_status()
    raw = gzip.decompress(resp.content)
    log.info(f"  {name}: {len(raw):,} bytes decompressed")
    return pd.read_csv(io.BytesIO(raw), low_memory=False)


def normalize_position(pos: str | None) -> str:
    """Map transfermarkt position to our schema categories."""
    if not pos or pd.isna(pos):
        return "Unknown"
    return POSITION_MAP.get(str(pos).strip(), "Unknown")


def normalize_name(name: str | None) -> str:
    """Lowercase + strip diacritics."""
    if not name or pd.isna(name):
        return ""
    return unidecode(str(name)).lower().strip()


def build_player_records(players_df: pd.DataFrame) -> list[dict]:
    """Transform the players DataFrame into our standardized schema."""
    records: list[dict] = []

    for _, row in players_df.iterrows():
        name = row.get("name")
        if not name or pd.isna(name):
            continue

        player_id = row.get("player_id")
        if pd.isna(player_id):
            continue

        comp_id = str(row.get("current_club_domestic_competition_id", ""))
        league = COMPETITION_MAP.get(comp_id, comp_id if comp_id and comp_id != "nan" else "")

        market_value = row.get("market_value_in_eur")
        if pd.isna(market_value):
            market_value = None
        else:
            market_value = int(market_value)

        image_url = row.get("image_url", "")
        if pd.isna(image_url):
            image_url = ""

        current_club = row.get("current_club_name", "")
        if pd.isna(current_club):
            current_club = ""

        nationality = row.get("country_of_citizenship", "")
        if pd.isna(nationality):
            nationality = ""

        records.append({
            "id": int(player_id),
            "name": str(name).strip(),
            "normalized_name": normalize_name(name),
            "nationality": str(nationality).strip(),
            "current_team": str(current_club).strip(),
            "league": league,
            "position": normalize_position(row.get("position")),
            "market_value": market_value,
            "image_url": str(image_url).strip(),
        })

    return records


def main() -> None:
    log.info("=== Transfermarkt-datasets ETL ===")

    # Step 1: get file listing from DVC
    try:
        file_index = fetch_dvc_directory()
    except Exception as exc:
        log.error(f"Failed to fetch DVC directory: {exc}")
        log.error(
            "Fallback: download the dataset manually from Kaggle:\n"
            "  kaggle datasets download -d davidcariboo/player-scores\n"
            "Then extract players.csv into data/ and re-run."
        )
        sys.exit(1)

    log.info(f"Found {len(file_index)} files in DVC storage")

    # Step 2: download players.csv
    players_hash = file_index.get("players.csv.gz")
    if not players_hash:
        log.error("players.csv.gz not found in DVC directory listing")
        sys.exit(1)

    try:
        players_df = download_csv("players.csv.gz", players_hash)
    except Exception as exc:
        log.error(f"Failed to download players.csv.gz: {exc}")
        log.error(
            "Fallback: download the dataset manually from Kaggle:\n"
            "  kaggle datasets download -d davidcariboo/player-scores\n"
            "Then extract players.csv into data/ and re-run."
        )
        sys.exit(1)

    log.info(f"Loaded {len(players_df):,} player rows")

    # Step 3: transform into our schema
    records = build_player_records(players_df)
    log.info(f"Produced {len(records):,} player records")

    # Step 4: basic stats
    with_value = sum(1 for r in records if r["market_value"] is not None)
    with_league = sum(1 for r in records if r["league"])
    log.info(f"  Players with market value: {with_value:,}")
    log.info(f"  Players with mapped league: {with_league:,}")

    # Step 5: write output
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)
    log.info(f"Wrote {len(records):,} records to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
