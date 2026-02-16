#!/usr/bin/env python3
"""
Salimt football-datasets downloader and updater.

Downloads player_profiles.csv and player_latest_market_value.csv from
https://github.com/salimt/football-datasets, then updates players_db_v1.json
and career_paths.json by matching players on normalized name.

Usage:
    python3 scripts/etl/fetch_salimt_datasets.py
    python3 scripts/etl/fetch_salimt_datasets.py --skip-download   # use cached CSVs
"""

import argparse
import json
import logging
import shutil
import sys
from datetime import datetime
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
DATA_DIR = PROJECT_ROOT / "data"
CACHE_DIR = DATA_DIR / "cache"

PLAYERS_DB_PATH = DATA_DIR / "players_db_v1.json"
CAREER_PATHS_PATH = DATA_DIR / "career_paths.json"

CURRENT_YEAR = datetime.now().year

# Raw GitHub URLs for salimt/football-datasets
PROFILES_URL = (
    "https://raw.githubusercontent.com/salimt/football-datasets/main/"
    "datalake/transfermarkt/player_profiles/player_profiles.csv"
)
MARKET_VALUE_URL = (
    "https://raw.githubusercontent.com/salimt/football-datasets/main/"
    "datalake/transfermarkt/player_latest_market_value/"
    "player_latest_market_value.csv"
)

REQUEST_TIMEOUT = 120
HEADERS = {"User-Agent": "football-etl/1.0"}

# CSV columns (verified from actual file headers):
# player_profiles.csv: player_id, player_slug, player_name, player_image_url,
#   name_in_home_country, date_of_birth, place_of_birth, country_of_birth,
#   height, citizenship, is_eu, position, main_position, foot,
#   current_club_id, current_club_name, joined, contract_expires, ...
#
# player_latest_market_value.csv: player_id, date_unix, value

# Position normalization: main_position field contains values like
# "Attack", "Midfield", "Defender", "Goalkeeper"
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


def normalize_name(name: str | None) -> str:
    """Lowercase + strip diacritics for matching."""
    if not name or (isinstance(name, float) and pd.isna(name)):
        return ""
    return unidecode(str(name)).lower().strip()


def download_csv(url: str, cache_path: Path, skip_download: bool) -> pd.DataFrame:
    """Download a CSV or load from cache. Returns a DataFrame."""
    if skip_download and cache_path.exists():
        log.info(f"Loading cached {cache_path.name} ...")
        return pd.read_csv(cache_path, low_memory=False)

    log.info(f"Downloading {cache_path.name} from GitHub ...")
    resp = requests.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT)
    resp.raise_for_status()
    log.info(f"  Downloaded {len(resp.content):,} bytes")

    cache_path.parent.mkdir(parents=True, exist_ok=True)
    cache_path.write_bytes(resp.content)
    log.info(f"  Cached to {cache_path}")

    return pd.read_csv(cache_path, low_memory=False)


def build_salimt_lookup(
    profiles_df: pd.DataFrame, market_df: pd.DataFrame
) -> dict[str, dict]:
    """
    Build a lookup dict keyed by normalized player name.

    Each value contains: current_club_name, market_value, image_url, position.
    When multiple players share a name, the one with the highest market value wins.
    """
    # Build market value lookup by player_id (take most recent entry per player)
    market_df = market_df.sort_values("date_unix", ascending=False)
    market_by_id: dict[int, float] = {}
    for _, row in market_df.iterrows():
        pid = row.get("player_id")
        if pd.notna(pid) and int(pid) not in market_by_id:
            val = row.get("value")
            if pd.notna(val):
                market_by_id[int(pid)] = float(val)

    log.info(f"  Market values loaded for {len(market_by_id):,} players")

    lookup: dict[str, dict] = {}
    for _, row in profiles_df.iterrows():
        name = row.get("player_name")
        norm = normalize_name(name)
        if not norm:
            continue

        pid = row.get("player_id")
        if pd.isna(pid):
            continue
        pid = int(pid)

        club = row.get("current_club_name", "")
        if pd.isna(club):
            club = ""
        club = str(club).strip()

        image_url = row.get("player_image_url", "")
        if pd.isna(image_url):
            image_url = ""
        image_url = str(image_url).strip()

        position_raw = row.get("main_position", "")
        if pd.isna(position_raw):
            position_raw = ""
        position = POSITION_MAP.get(str(position_raw).strip(), "")

        mv = market_by_id.get(pid, 0.0)

        # If duplicate name, keep the one with higher market value
        if norm in lookup and lookup[norm]["market_value"] >= mv:
            continue

        lookup[norm] = {
            "current_club_name": club,
            "market_value": int(mv) if mv else 0,
            "image_url": image_url,
            "position": position,
            "player_id": pid,
        }

    return lookup


def update_players_db(
    players: list[dict], lookup: dict[str, dict]
) -> tuple[list[dict], int, int]:
    """
    Update players_db entries with salimt data.

    Returns (updated_players, matched_count, updated_count).
    """
    matched = 0
    updated = 0

    for player in players:
        norm = player.get("normalized_name", "")
        if not norm:
            norm = normalize_name(player.get("name"))

        info = lookup.get(norm)
        if not info:
            continue
        matched += 1

        changed = False

        # Update current_team if salimt has a non-empty value
        new_club = info["current_club_name"]
        if new_club and new_club not in ("Retired", "Without Club"):
            old_club = player.get("current_team", "")
            if new_club != old_club:
                player["current_team"] = new_club
                changed = True

        # Update market_value if salimt has a positive value
        new_mv = info["market_value"]
        if new_mv and new_mv > 0:
            old_mv = player.get("market_value") or 0
            if new_mv != old_mv:
                player["market_value"] = new_mv
                changed = True

        # Update image_url if we have one and existing is empty
        new_img = info["image_url"]
        if new_img and not player.get("image_url"):
            player["image_url"] = new_img
            changed = True

        if changed:
            updated += 1

    return players, matched, updated


def update_career_paths(
    careers: list[dict], lookup: dict[str, dict]
) -> tuple[list[dict], int, list[str]]:
    """
    Update career_paths entries: if current club changed, append a new career entry.

    Returns (updated_careers, update_count, change_descriptions).
    """
    update_count = 0
    changes: list[str] = []

    for entry in careers:
        norm = entry.get("normalized_name", "")
        if not norm:
            norm = normalize_name(entry.get("name"))

        info = lookup.get(norm)
        if not info:
            continue

        new_club = info["current_club_name"]
        if not new_club or new_club in ("Retired", "Without Club"):
            continue

        career = entry.get("career", [])
        if not career:
            continue

        last = career[-1]
        last_club = last.get("club", "")

        # Normalize both club names for comparison
        if normalize_name(last_club) != normalize_name(new_club):
            # Set end year on old entry
            if last.get("to", CURRENT_YEAR) >= CURRENT_YEAR - 1:
                last["to"] = CURRENT_YEAR - 1

            # Append new career entry
            career.append({
                "club": new_club,
                "from": CURRENT_YEAR,
                "to": CURRENT_YEAR,
            })
            entry["career"] = career
            update_count += 1
            changes.append(
                f"  {entry['name']}: {last_club} -> {new_club}"
            )

    return careers, update_count, changes


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Download salimt/football-datasets and update local data"
    )
    parser.add_argument(
        "--skip-download",
        action="store_true",
        help="Use cached CSVs from data/cache/ instead of downloading",
    )
    args = parser.parse_args()

    log.info("=== Salimt football-datasets ETL ===")

    # --- Step 1: Download CSVs ---
    profiles_cache = CACHE_DIR / "salimt_player_profiles.csv"
    market_cache = CACHE_DIR / "salimt_player_latest_market_value.csv"

    try:
        profiles_df = download_csv(PROFILES_URL, profiles_cache, args.skip_download)
        log.info(f"  Player profiles: {len(profiles_df):,} rows")
    except Exception as exc:
        log.error(f"Failed to download player_profiles.csv: {exc}")
        sys.exit(1)

    try:
        market_df = download_csv(MARKET_VALUE_URL, market_cache, args.skip_download)
        log.info(f"  Market values: {len(market_df):,} rows")
    except Exception as exc:
        log.error(f"Failed to download player_latest_market_value.csv: {exc}")
        sys.exit(1)

    # --- Step 2: Build lookup ---
    log.info("Building player lookup by normalized name ...")
    lookup = build_salimt_lookup(profiles_df, market_df)
    log.info(f"  Unique player names in lookup: {len(lookup):,}")

    # --- Step 3: Update players_db_v1.json ---
    log.info(f"Loading {PLAYERS_DB_PATH.name} ...")
    with open(PLAYERS_DB_PATH, "r", encoding="utf-8") as f:
        players = json.load(f)
    log.info(f"  Loaded {len(players):,} players")

    # Backup
    backup_path = DATA_DIR / "players_db_v1_backup.json"
    shutil.copy2(PLAYERS_DB_PATH, backup_path)
    log.info(f"  Backup saved to {backup_path.name}")

    players, p_matched, p_updated = update_players_db(players, lookup)

    with open(PLAYERS_DB_PATH, "w", encoding="utf-8") as f:
        json.dump(players, f, ensure_ascii=False, indent=2)
    log.info(f"  Saved updated {PLAYERS_DB_PATH.name}")

    # --- Step 4: Update career_paths.json ---
    log.info(f"Loading {CAREER_PATHS_PATH.name} ...")
    with open(CAREER_PATHS_PATH, "r", encoding="utf-8") as f:
        careers = json.load(f)
    log.info(f"  Loaded {len(careers):,} career paths")

    # Backup
    career_backup = DATA_DIR / "career_paths_backup.json"
    shutil.copy2(CAREER_PATHS_PATH, career_backup)
    log.info(f"  Backup saved to {career_backup.name}")

    careers, c_updated, c_changes = update_career_paths(careers, lookup)

    with open(CAREER_PATHS_PATH, "w", encoding="utf-8") as f:
        json.dump(careers, f, ensure_ascii=False, indent=2)
    log.info(f"  Saved updated {CAREER_PATHS_PATH.name}")

    # --- Step 5: Summary ---
    log.info("")
    log.info("=" * 60)
    log.info("SUMMARY")
    log.info("=" * 60)
    log.info(f"Salimt dataset: {len(profiles_df):,} player profiles, "
             f"{len(market_df):,} market value entries")
    log.info(f"Lookup built: {len(lookup):,} unique names")
    log.info("")
    log.info(f"players_db_v1.json ({len(players):,} players):")
    log.info(f"  Matched by name:  {p_matched:,}")
    log.info(f"  Actually updated: {p_updated:,}")
    log.info(f"  Not matched:      {len(players) - p_matched:,}")
    log.info("")
    log.info(f"career_paths.json ({len(careers):,} players):")
    log.info(f"  Club changes detected: {c_updated}")
    if c_changes:
        log.info("  Changes:")
        for change in c_changes:
            log.info(change)
    log.info("=" * 60)


if __name__ == "__main__":
    main()
