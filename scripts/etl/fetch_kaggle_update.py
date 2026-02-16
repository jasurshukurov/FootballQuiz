#!/usr/bin/env python3
"""
Kaggle dataset updater for football project.

Downloads the davidcariboo/player-scores dataset via kagglehub, then updates
players_db_v1.json and career_paths.json with fresh transfer and market data.

Usage:
    python3 scripts/etl/fetch_kaggle_update.py
    python3 scripts/etl/fetch_kaggle_update.py --dry-run   # preview changes without writing
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
for _mod in ("pandas", "unidecode", "kagglehub"):
    try:
        __import__(_mod)
    except ImportError:
        _missing.append(_mod)
if _missing:
    print(f"Missing required packages: {', '.join(_missing)}")
    print(f"Install them with:\n  pip install {' '.join(_missing)}")
    sys.exit(1)

import kagglehub
import pandas as pd
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

PLAYERS_DB_PATH = DATA_DIR / "players_db_v1.json"
CAREER_PATHS_PATH = DATA_DIR / "career_paths.json"

CURRENT_YEAR = datetime.now().year

# Competition ID -> league name mapping
COMPETITION_MAP: dict[str, str] = {
    "GB1": "Premier League",
    "ES1": "La Liga",
    "L1": "Bundesliga",
    "IT1": "Serie A",
    "FR1": "Ligue 1",
    "NL1": "Eredivisie",
    "PO1": "Primeira Liga",
    "TR1": "Super Lig",
    "RU1": "Russian Premier League",
    "BE1": "Belgian Pro League",
    "SC1": "Scottish Premiership",
    "GR1": "Super League Greece",
    "UKR1": "Ukrainian Premier League",
    "DK1": "Danish Superliga",
}


def normalize_name(name) -> str:
    """Lowercase + strip diacritics for matching."""
    if not name or (isinstance(name, float) and pd.isna(name)):
        return ""
    return unidecode(str(name)).lower().strip()


def load_kaggle_dataset() -> Path:
    """Download/load the Kaggle dataset via kagglehub. Returns the dataset path."""
    log.info("Loading Kaggle dataset via kagglehub ...")
    path = kagglehub.dataset_download("davidcariboo/player-scores")
    log.info(f"  Dataset path: {path}")
    return Path(path)


def build_players_lookup(players_df: pd.DataFrame) -> dict[str, dict]:
    """
    Build a lookup dict keyed by normalized player name from players.csv.

    Each value contains: current_club_name, market_value, image_url, league,
    position, player_id.
    When multiple players share a name, the one with the highest market value wins.
    """
    lookup: dict[str, dict] = {}

    for _, row in players_df.iterrows():
        name = row.get("name")
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

        image_url = row.get("image_url", "")
        if pd.isna(image_url):
            image_url = ""
        image_url = str(image_url).strip()

        comp_id = row.get("current_club_domestic_competition_id", "")
        if pd.isna(comp_id):
            comp_id = ""
        league = COMPETITION_MAP.get(str(comp_id).strip(), "")

        mv = row.get("market_value_in_eur", 0)
        if pd.isna(mv):
            mv = 0
        mv = int(mv)

        # If duplicate name, keep the one with higher market value
        if norm in lookup and lookup[norm]["market_value"] >= mv:
            continue

        lookup[norm] = {
            "current_club_name": club,
            "market_value": mv,
            "image_url": image_url,
            "league": league,
            "player_id": pid,
        }

    return lookup


def build_transfers_by_name(transfers_df: pd.DataFrame) -> dict[str, list[dict]]:
    """
    Build a dict mapping normalized player name -> sorted list of transfers.

    Each transfer has: transfer_date, transfer_season, from_club, to_club.
    Sorted by transfer_date ascending.
    """
    transfers_df = transfers_df.sort_values("transfer_date", ascending=True)

    by_name: dict[str, list[dict]] = {}
    for _, row in transfers_df.iterrows():
        name = row.get("player_name")
        norm = normalize_name(name)
        if not norm:
            continue

        date_str = row.get("transfer_date", "")
        if pd.isna(date_str):
            continue

        from_club = row.get("from_club_name", "")
        if pd.isna(from_club):
            from_club = ""
        to_club = row.get("to_club_name", "")
        if pd.isna(to_club):
            to_club = ""

        season = row.get("transfer_season", "")
        if pd.isna(season):
            season = ""

        by_name.setdefault(norm, []).append({
            "transfer_date": str(date_str),
            "transfer_season": str(season),
            "from_club": str(from_club).strip(),
            "to_club": str(to_club).strip(),
        })

    return by_name


def extract_year(date_str: str) -> int:
    """Extract the year from a YYYY-MM-DD date string."""
    try:
        return int(date_str[:4])
    except (ValueError, IndexError):
        return 0


def update_players_db(
    players: list[dict], lookup: dict[str, dict]
) -> tuple[list[dict], int, int]:
    """
    Update players_db entries with Kaggle data.

    Updates: current_team, market_value, image_url, league.
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

        # Update current_team
        new_club = info["current_club_name"]
        if new_club and new_club not in ("Retired", "Without Club"):
            old_club = player.get("current_team", "")
            if new_club != old_club:
                player["current_team"] = new_club
                changed = True

        # Update market_value
        new_mv = info["market_value"]
        if new_mv and new_mv > 0:
            old_mv = player.get("market_value") or 0
            if new_mv != old_mv:
                player["market_value"] = new_mv
                changed = True

        # Update image_url if existing is empty
        new_img = info["image_url"]
        if new_img and not player.get("image_url"):
            player["image_url"] = new_img
            changed = True

        # Update league if Kaggle has one
        new_league = info["league"]
        if new_league:
            old_league = player.get("league", "")
            if new_league != old_league:
                player["league"] = new_league
                changed = True

        if changed:
            updated += 1

    return players, matched, updated


def update_career_paths(
    careers: list[dict],
    lookup: dict[str, dict],
    transfers_by_name: dict[str, list[dict]],
) -> tuple[list[dict], int, list[str]]:
    """
    Update career_paths entries using transfers.csv and players.csv.

    For each career player:
    1. Find transfers after the player's last career entry year and append them.
    2. If players.csv current_club differs from the (now) last career entry, append it.

    Returns (updated_careers, update_count, change_descriptions).
    """
    update_count = 0
    changes: list[str] = []

    for entry in careers:
        norm = entry.get("normalized_name", "")
        if not norm:
            norm = normalize_name(entry.get("name"))

        career = entry.get("career", [])
        if not career:
            continue

        player_changed = False

        # --- Phase 1: Append transfers after last career entry ---
        transfers = transfers_by_name.get(norm, [])
        if transfers:
            last = career[-1]
            last_to_year = last.get("to", CURRENT_YEAR)

            for t in transfers:
                t_year = extract_year(t["transfer_date"])
                if t_year <= 0:
                    continue

                to_club = t["to_club"]
                if not to_club or to_club in ("Retired", "Without Club", ""):
                    continue

                # Only append transfers after the last career entry's end year
                if t_year > last_to_year:
                    current_last = career[-1]
                    current_last_club_norm = normalize_name(current_last.get("club", ""))
                    to_club_norm = normalize_name(to_club)

                    # Skip if same club as current last entry
                    if current_last_club_norm == to_club_norm:
                        continue

                    # Close out the previous entry
                    if current_last.get("to", CURRENT_YEAR) >= t_year:
                        current_last["to"] = t_year

                    career.append({
                        "club": to_club,
                        "from": t_year,
                        "to": CURRENT_YEAR,
                    })
                    changes.append(
                        f"  {entry['name']}: +transfer to {to_club} ({t_year})"
                    )
                    player_changed = True

        # --- Phase 2: Check players.csv current club ---
        info = lookup.get(norm)
        if info:
            new_club = info["current_club_name"]
            if new_club and new_club not in ("Retired", "Without Club"):
                current_last = career[-1]
                if normalize_name(current_last.get("club", "")) != normalize_name(new_club):
                    # Only append if no transfer already added this club
                    current_last["to"] = CURRENT_YEAR
                    career.append({
                        "club": new_club,
                        "from": CURRENT_YEAR,
                        "to": CURRENT_YEAR,
                    })
                    changes.append(
                        f"  {entry['name']}: current club -> {new_club}"
                    )
                    player_changed = True

            # Update image_url on career entry too
            new_img = info["image_url"]
            if new_img and not entry.get("image_url"):
                entry["image_url"] = new_img

        entry["career"] = career
        if player_changed:
            update_count += 1

    return careers, update_count, changes


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Download Kaggle player-scores dataset and update local data"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview changes without writing to disk",
    )
    args = parser.parse_args()

    log.info("=== Kaggle player-scores ETL ===")

    # --- Step 1: Load dataset via kagglehub ---
    dataset_path = load_kaggle_dataset()

    players_csv = dataset_path / "players.csv"
    transfers_csv = dataset_path / "transfers.csv"

    if not players_csv.exists():
        log.error(f"players.csv not found at {players_csv}")
        sys.exit(1)
    if not transfers_csv.exists():
        log.error(f"transfers.csv not found at {transfers_csv}")
        sys.exit(1)

    players_df = pd.read_csv(players_csv, low_memory=False)
    log.info(f"  Kaggle players.csv: {len(players_df):,} rows")

    transfers_df = pd.read_csv(transfers_csv, low_memory=False)
    log.info(f"  Kaggle transfers.csv: {len(transfers_df):,} rows")

    # --- Step 2: Build lookups ---
    log.info("Building player lookup from players.csv ...")
    lookup = build_players_lookup(players_df)
    log.info(f"  Unique player names in lookup: {len(lookup):,}")

    log.info("Building transfer history lookup from transfers.csv ...")
    transfers_by_name = build_transfers_by_name(transfers_df)
    log.info(f"  Players with transfer records: {len(transfers_by_name):,}")

    # --- Step 3: Update players_db_v1.json ---
    log.info(f"Loading {PLAYERS_DB_PATH.name} ...")
    with open(PLAYERS_DB_PATH, "r", encoding="utf-8") as f:
        players = json.load(f)
    log.info(f"  Loaded {len(players):,} players")

    players, p_matched, p_updated = update_players_db(players, lookup)

    if not args.dry_run:
        backup_path = DATA_DIR / "players_db_v1_backup.json"
        shutil.copy2(PLAYERS_DB_PATH, backup_path)
        log.info(f"  Backup saved to {backup_path.name}")

        with open(PLAYERS_DB_PATH, "w", encoding="utf-8") as f:
            json.dump(players, f, ensure_ascii=False, indent=2)
        log.info(f"  Saved updated {PLAYERS_DB_PATH.name}")
    else:
        log.info("  [DRY RUN] Skipping write to players_db_v1.json")

    # --- Step 4: Update career_paths.json ---
    log.info(f"Loading {CAREER_PATHS_PATH.name} ...")
    with open(CAREER_PATHS_PATH, "r", encoding="utf-8") as f:
        careers = json.load(f)
    log.info(f"  Loaded {len(careers):,} career paths")

    careers, c_updated, c_changes = update_career_paths(
        careers, lookup, transfers_by_name
    )

    if not args.dry_run:
        career_backup = DATA_DIR / "career_paths_backup.json"
        shutil.copy2(CAREER_PATHS_PATH, career_backup)
        log.info(f"  Backup saved to {career_backup.name}")

        with open(CAREER_PATHS_PATH, "w", encoding="utf-8") as f:
            json.dump(careers, f, ensure_ascii=False, indent=2)
        log.info(f"  Saved updated {CAREER_PATHS_PATH.name}")
    else:
        log.info("  [DRY RUN] Skipping write to career_paths.json")

    # --- Step 5: Summary ---
    log.info("")
    log.info("=" * 60)
    log.info("SUMMARY")
    log.info("=" * 60)
    log.info(f"Kaggle dataset: {len(players_df):,} players, "
             f"{len(transfers_df):,} transfers")
    log.info(f"Player lookup: {len(lookup):,} unique names")
    log.info(f"Transfer lookup: {len(transfers_by_name):,} players with transfers")
    log.info("")
    log.info(f"players_db_v1.json ({len(players):,} players):")
    log.info(f"  Matched by name:  {p_matched:,}")
    log.info(f"  Actually updated: {p_updated:,}")
    log.info(f"  Not matched:      {len(players) - p_matched:,}")
    log.info("")
    log.info(f"career_paths.json ({len(careers):,} players):")
    log.info(f"  Players with new career entries: {c_updated}")
    if c_changes:
        log.info("  Changes:")
        for change in c_changes:
            log.info(change)
    log.info("=" * 60)

    if args.dry_run:
        log.info("[DRY RUN] No files were modified.")


if __name__ == "__main__":
    main()
