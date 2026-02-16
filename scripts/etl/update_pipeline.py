#!/usr/bin/env python3
"""
Combined update pipeline: Kaggle (primary) + salimt (fallback).

Merges data from both sources to update players_db_v1.json and career_paths.json.
Kaggle is used for active players (last_season >= 2024); salimt fills in gaps for
stale or retired players.

Usage:
    python3 scripts/etl/update_pipeline.py
    python3 scripts/etl/update_pipeline.py --dry-run    # preview without writing
    python3 scripts/etl/update_pipeline.py --verbose     # print every update
"""

import argparse
import json
import logging
import re
import shutil
import sys
from datetime import datetime
from pathlib import Path

# --- Dependency check -----------------------------------------------------------
_missing = []
for _mod in ("pandas", "unidecode", "kagglehub", "requests"):
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
import requests
from unidecode import unidecode

# --- Import club normalizer from same directory ---------------------------------
_etl_dir = str(Path(__file__).resolve().parent)
if _etl_dir not in sys.path:
    sys.path.insert(0, _etl_dir)

from club_normalizer import clubs_match, normalize_club

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

# Salimt raw GitHub URLs
SALIMT_PROFILES_URL = (
    "https://raw.githubusercontent.com/salimt/football-datasets/main/"
    "datalake/transfermarkt/player_profiles/player_profiles.csv"
)

REQUEST_TIMEOUT = 120
HEADERS = {"User-Agent": "football-etl/1.0"}

# Competition ID -> league name (Kaggle)
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
    "SA1": "Saudi Pro League",
    "MLS1": "MLS",
}

# Regex to strip salimt " (ID)" suffix from player names
_SALIMT_ID_RE = re.compile(r"\s*\(\d+\)\s*$")


def normalize_name(name) -> str:
    """Lowercase + strip diacritics for matching."""
    if not name or (isinstance(name, float) and pd.isna(name)):
        return ""
    return unidecode(str(name)).lower().strip()


def strip_salimt_id(name) -> str:
    """Remove trailing ' (ID)' from salimt player names."""
    if not name or (isinstance(name, float) and pd.isna(name)):
        return ""
    return _SALIMT_ID_RE.sub("", str(name)).strip()


def extract_year(date_str: str) -> int:
    """Extract the year from a YYYY-MM-DD date string."""
    try:
        return int(str(date_str)[:4])
    except (ValueError, IndexError, TypeError):
        return 0


# ============================================================================
# Phase 1: Load all data sources
# ============================================================================

def load_kaggle_dataset() -> Path:
    """Download/load the Kaggle dataset via kagglehub."""
    log.info("Loading Kaggle dataset via kagglehub ...")
    path = kagglehub.dataset_download("davidcariboo/player-scores")
    log.info(f"  Dataset path: {path}")
    return Path(path)


def load_salimt_profiles(skip_download: bool = False) -> pd.DataFrame:
    """Download salimt player_profiles.csv (or load from cache)."""
    cache_path = CACHE_DIR / "salimt_player_profiles.csv"

    if skip_download and cache_path.exists():
        log.info("Loading cached salimt player_profiles.csv ...")
        return pd.read_csv(cache_path, low_memory=False)

    log.info("Downloading salimt player_profiles.csv from GitHub ...")
    resp = requests.get(SALIMT_PROFILES_URL, headers=HEADERS, timeout=REQUEST_TIMEOUT)
    resp.raise_for_status()
    log.info(f"  Downloaded {len(resp.content):,} bytes")

    cache_path.parent.mkdir(parents=True, exist_ok=True)
    cache_path.write_bytes(resp.content)
    log.info(f"  Cached to {cache_path}")

    return pd.read_csv(cache_path, low_memory=False)


# ============================================================================
# Phase 2: Build unified player lookups
# ============================================================================

def build_kaggle_players_lookup(players_df: pd.DataFrame) -> dict[str, dict]:
    """Build lookup from Kaggle players.csv keyed by normalized name."""
    lookup: dict[str, dict] = {}

    for _, row in players_df.iterrows():
        name = row.get("name")
        norm = normalize_name(name)
        if not norm:
            continue

        pid = row.get("player_id")
        if pd.isna(pid):
            continue

        last_season = row.get("last_season", 0)
        if pd.isna(last_season):
            last_season = 0
        last_season = int(last_season)

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
            "last_season": last_season,
            "player_id": int(pid),
        }

    return lookup


def build_kaggle_transfers_lookup(transfers_df: pd.DataFrame) -> dict[str, list[dict]]:
    """Build lookup from Kaggle transfers.csv: normalized name -> sorted transfers."""
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


def build_salimt_lookup(profiles_df: pd.DataFrame) -> dict[str, dict]:
    """Build lookup from salimt player_profiles.csv keyed by normalized name."""
    lookup: dict[str, dict] = {}

    for _, row in profiles_df.iterrows():
        raw_name = row.get("player_name")
        clean_name = strip_salimt_id(raw_name)
        norm = normalize_name(clean_name)
        if not norm:
            continue

        pid = row.get("player_id")
        if pd.isna(pid):
            continue

        club = row.get("current_club_name", "")
        if pd.isna(club):
            club = ""
        club = str(club).strip()

        image_url = row.get("player_image_url", "")
        if pd.isna(image_url):
            image_url = ""
        image_url = str(image_url).strip()

        # Keep first occurrence (profiles are usually unique by player_id)
        if norm in lookup:
            continue

        lookup[norm] = {
            "current_club_name": club,
            "image_url": image_url,
            "player_id": int(pid),
        }

    return lookup


# ============================================================================
# Phase 3: Update players_db_v1.json
# ============================================================================

def update_players_db(
    players: list[dict],
    kaggle_lookup: dict[str, dict],
    salimt_lookup: dict[str, dict],
    verbose: bool = False,
) -> tuple[list[dict], dict]:
    """
    Update players_db entries. Kaggle is primary (if last_season >= 2024),
    salimt is fallback.

    Returns (updated_players, stats_dict).
    """
    stats = {
        "from_kaggle": 0,
        "from_salimt": 0,
        "unchanged": 0,
        "no_match": 0,
        "new_clubs": set(),
    }

    for player in players:
        norm = player.get("normalized_name", "")
        if not norm:
            norm = normalize_name(player.get("name"))

        source = None
        info = None

        # Try Kaggle first
        kaggle_info = kaggle_lookup.get(norm)
        if kaggle_info and kaggle_info["last_season"] >= 2024:
            source = "kaggle"
            info = kaggle_info
        else:
            # Fallback to salimt
            salimt_info = salimt_lookup.get(norm)
            if salimt_info:
                source = "salimt"
                info = salimt_info

        if info is None:
            stats["no_match"] += 1
            continue

        changed = False

        # Update current_team with normalized club name
        new_club_raw = info["current_club_name"]
        if new_club_raw and new_club_raw not in ("Retired", "Without Club"):
            new_club = normalize_club(new_club_raw)
            old_club = player.get("current_team", "")
            if not clubs_match(new_club, old_club) if old_club else True:
                if verbose:
                    log.info(
                        f"  [{source}] {player.get('name')}: "
                        f"team '{old_club}' -> '{new_club}'"
                    )
                player["current_team"] = new_club
                stats["new_clubs"].add(new_club)
                changed = True

        # Update market_value (prefer Kaggle if available)
        if source == "kaggle":
            new_mv = info.get("market_value", 0)
            if new_mv and new_mv > 0:
                old_mv = player.get("market_value") or 0
                if new_mv != old_mv:
                    player["market_value"] = new_mv
                    changed = True

        # Update image_url if new one exists and old is empty
        new_img = info.get("image_url", "")
        if new_img and not player.get("image_url"):
            player["image_url"] = new_img
            changed = True

        # Update league from Kaggle competition ID
        if source == "kaggle":
            new_league = info.get("league", "")
            if new_league:
                old_league = player.get("league", "")
                if new_league != old_league:
                    player["league"] = new_league
                    changed = True

        if changed:
            if source == "kaggle":
                stats["from_kaggle"] += 1
            else:
                stats["from_salimt"] += 1
        else:
            stats["unchanged"] += 1

    return players, stats


# ============================================================================
# Phase 4: Update career_paths.json
# ============================================================================

def update_career_paths(
    careers: list[dict],
    kaggle_lookup: dict[str, dict],
    kaggle_transfers: dict[str, list[dict]],
    salimt_lookup: dict[str, dict],
    verbose: bool = False,
) -> tuple[list[dict], dict]:
    """
    Update career_paths entries using Kaggle transfers (primary) + salimt (fallback).

    Returns (updated_careers, stats_dict).
    """
    stats = {
        "careers_extended": 0,
        "new_entries_added": 0,
        "details": [],
    }

    for entry in careers:
        norm = entry.get("normalized_name", "")
        if not norm:
            norm = normalize_name(entry.get("name"))

        career = entry.get("career", [])
        if not career:
            continue

        player_changed = False

        # --- Step 1: Append Kaggle transfers after the player's last career entry ---
        transfers = kaggle_transfers.get(norm, [])
        if transfers:
            last = career[-1]
            last_to_year = last.get("to", CURRENT_YEAR)

            for t in transfers:
                t_year = extract_year(t["transfer_date"])
                if t_year <= 0:
                    continue

                to_club_raw = t["to_club"]
                if not to_club_raw or to_club_raw in ("Retired", "Without Club", ""):
                    continue

                to_club = normalize_club(to_club_raw)

                # Only append transfers after the last career entry's end year
                if t_year > last_to_year:
                    current_last = career[-1]
                    current_last_club = current_last.get("club", "")

                    # Skip if same club (using normalizer)
                    if clubs_match(current_last_club, to_club):
                        continue

                    # Close out the previous entry
                    if current_last.get("to", CURRENT_YEAR) >= t_year:
                        current_last["to"] = t_year

                    career.append({
                        "club": to_club,
                        "from": t_year,
                        "to": CURRENT_YEAR,
                    })
                    stats["new_entries_added"] += 1
                    stats["details"].append(
                        f"{entry['name']}: +transfer to {to_club} ({t_year})"
                    )
                    player_changed = True

                    if verbose:
                        log.info(
                            f"  {entry['name']}: +transfer to {to_club} ({t_year})"
                        )

        # --- Step 2: Check current club vs last career entry ---
        # Use Kaggle if active, else salimt as fallback
        kaggle_info = kaggle_lookup.get(norm)
        current_club_raw = None

        if kaggle_info and kaggle_info["last_season"] >= 2024:
            current_club_raw = kaggle_info["current_club_name"]
        else:
            salimt_info = salimt_lookup.get(norm)
            if salimt_info:
                current_club_raw = salimt_info["current_club_name"]

        if current_club_raw and current_club_raw not in ("Retired", "Without Club"):
            current_club = normalize_club(current_club_raw)
            current_last = career[-1]
            current_last_club = current_last.get("club", "")

            if not clubs_match(current_last_club, current_club):
                current_last["to"] = CURRENT_YEAR
                career.append({
                    "club": current_club,
                    "from": CURRENT_YEAR,
                    "to": CURRENT_YEAR,
                })
                stats["new_entries_added"] += 1
                stats["details"].append(
                    f"{entry['name']}: current club -> {current_club}"
                )
                player_changed = True

                if verbose:
                    log.info(
                        f"  {entry['name']}: current club -> {current_club}"
                    )

        # Update image_url on career entry too
        if kaggle_info and kaggle_info.get("image_url") and not entry.get("image_url"):
            entry["image_url"] = kaggle_info["image_url"]

        entry["career"] = career
        if player_changed:
            stats["careers_extended"] += 1

    return careers, stats


# ============================================================================
# Phase 5: Report
# ============================================================================

def print_report(
    kaggle_players_count: int,
    kaggle_transfers_count: int,
    salimt_count: int,
    db_count: int,
    career_count: int,
    player_stats: dict,
    career_stats: dict,
    no_match_names: list[str],
) -> str:
    """Print and return comprehensive report."""
    lines = []

    def p(line: str = "") -> None:
        lines.append(line)
        log.info(line)

    p("")
    p("=" * 65)
    p("=== COMBINED UPDATE PIPELINE REPORT ===")
    p("=" * 65)
    p(f"Sources: Kaggle ({kaggle_players_count:,} players, "
      f"{kaggle_transfers_count:,} transfers) + salimt ({salimt_count:,} players)")
    p("")
    p(f"Players DB Updates ({db_count:,} players):")
    p(f"  - From Kaggle (primary): {player_stats['from_kaggle']} players")
    p(f"  - From salimt (fallback): {player_stats['from_salimt']} players")
    p(f"  - Unchanged: {player_stats['unchanged']} players")
    p(f"  - No match in either source: {player_stats['no_match']} players")

    new_clubs = sorted(player_stats["new_clubs"])
    if new_clubs:
        p(f"  - New clubs detected ({len(new_clubs)}):")
        for club in new_clubs[:20]:
            p(f"      {club}")
        if len(new_clubs) > 20:
            p(f"      ... and {len(new_clubs) - 20} more")

    p("")
    p(f"Career Path Updates ({career_count} players):")
    p(f"  - Careers extended: {career_stats['careers_extended']} of {career_count}")
    p(f"  - New entries added: {career_stats['new_entries_added']} total")
    if career_stats["details"]:
        p("  - Details:")
        for detail in career_stats["details"]:
            p(f"      {detail}")

    p("")
    p("Remaining gaps:")
    p(f"  - Players with no match in either source: {player_stats['no_match']}")
    if no_match_names:
        p(f"  - Top {min(10, len(no_match_names))} unmatched:")
        for name in no_match_names[:10]:
            p(f"      {name}")

    p("=" * 65)

    return "\n".join(lines)


# ============================================================================
# Main
# ============================================================================

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Combined Kaggle + salimt update pipeline"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview changes without writing to disk",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Print every player update",
    )
    parser.add_argument(
        "--skip-download",
        action="store_true",
        help="Use cached salimt CSV instead of downloading",
    )
    args = parser.parse_args()

    if args.verbose:
        log.setLevel(logging.DEBUG)

    log.info("=== Combined Update Pipeline (Kaggle primary + salimt fallback) ===")

    # ---------------------------------------------------------------
    # Phase 1: Load all data sources
    # ---------------------------------------------------------------
    log.info("Phase 1: Loading data sources ...")

    # Kaggle
    kaggle_path = load_kaggle_dataset()
    players_csv = kaggle_path / "players.csv"
    transfers_csv = kaggle_path / "transfers.csv"

    if not players_csv.exists():
        log.error(f"players.csv not found at {players_csv}")
        sys.exit(1)
    if not transfers_csv.exists():
        log.error(f"transfers.csv not found at {transfers_csv}")
        sys.exit(1)

    kaggle_players_df = pd.read_csv(players_csv, low_memory=False)
    log.info(f"  Kaggle players.csv: {len(kaggle_players_df):,} rows")

    kaggle_transfers_df = pd.read_csv(transfers_csv, low_memory=False)
    log.info(f"  Kaggle transfers.csv: {len(kaggle_transfers_df):,} rows")

    # Salimt
    try:
        salimt_df = load_salimt_profiles(skip_download=args.skip_download)
        log.info(f"  Salimt player_profiles: {len(salimt_df):,} rows")
    except Exception as exc:
        log.warning(f"Failed to load salimt data: {exc}")
        log.warning("Continuing with Kaggle only.")
        salimt_df = pd.DataFrame()

    # Our DB
    log.info(f"  Loading {PLAYERS_DB_PATH.name} ...")
    with open(PLAYERS_DB_PATH, "r", encoding="utf-8") as f:
        players_db = json.load(f)
    log.info(f"  Loaded {len(players_db):,} players")

    log.info(f"  Loading {CAREER_PATHS_PATH.name} ...")
    with open(CAREER_PATHS_PATH, "r", encoding="utf-8") as f:
        career_paths = json.load(f)
    log.info(f"  Loaded {len(career_paths):,} career paths")

    # Backups
    if not args.dry_run:
        backup_ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        players_backup = DATA_DIR / f"players_db_v1_backup_{backup_ts}.json"
        career_backup = DATA_DIR / f"career_paths_backup_{backup_ts}.json"
        shutil.copy2(PLAYERS_DB_PATH, players_backup)
        shutil.copy2(CAREER_PATHS_PATH, career_backup)
        log.info(f"  Backups: {players_backup.name}, {career_backup.name}")

    # ---------------------------------------------------------------
    # Phase 2: Build unified lookups
    # ---------------------------------------------------------------
    log.info("Phase 2: Building lookups ...")

    kaggle_lookup = build_kaggle_players_lookup(kaggle_players_df)
    log.info(f"  Kaggle player lookup: {len(kaggle_lookup):,} names")

    kaggle_transfers = build_kaggle_transfers_lookup(kaggle_transfers_df)
    log.info(f"  Kaggle transfer lookup: {len(kaggle_transfers):,} players")

    salimt_lookup: dict[str, dict] = {}
    if not salimt_df.empty:
        salimt_lookup = build_salimt_lookup(salimt_df)
        log.info(f"  Salimt player lookup: {len(salimt_lookup):,} names")

    # ---------------------------------------------------------------
    # Phase 3: Update players_db_v1.json
    # ---------------------------------------------------------------
    log.info("Phase 3: Updating players DB ...")

    players_db, player_stats = update_players_db(
        players_db, kaggle_lookup, salimt_lookup, verbose=args.verbose
    )

    if not args.dry_run:
        with open(PLAYERS_DB_PATH, "w", encoding="utf-8") as f:
            json.dump(players_db, f, ensure_ascii=False, indent=2)
        log.info(f"  Saved updated {PLAYERS_DB_PATH.name}")
    else:
        log.info("  [DRY RUN] Skipping write to players_db_v1.json")

    # ---------------------------------------------------------------
    # Phase 4: Update career_paths.json
    # ---------------------------------------------------------------
    log.info("Phase 4: Updating career paths ...")

    career_paths, career_stats = update_career_paths(
        career_paths, kaggle_lookup, kaggle_transfers, salimt_lookup,
        verbose=args.verbose,
    )

    if not args.dry_run:
        with open(CAREER_PATHS_PATH, "w", encoding="utf-8") as f:
            json.dump(career_paths, f, ensure_ascii=False, indent=2)
        log.info(f"  Saved updated {CAREER_PATHS_PATH.name}")
    else:
        log.info("  [DRY RUN] Skipping write to career_paths.json")

    # ---------------------------------------------------------------
    # Phase 5: Report
    # ---------------------------------------------------------------
    # Collect unmatched player names
    no_match_names = []
    for player in players_db:
        norm = player.get("normalized_name", "")
        if not norm:
            norm = normalize_name(player.get("name"))
        kaggle_info = kaggle_lookup.get(norm)
        salimt_info = salimt_lookup.get(norm)
        if not kaggle_info and not salimt_info:
            no_match_names.append(player.get("name", "???"))

    report_text = print_report(
        kaggle_players_count=len(kaggle_players_df),
        kaggle_transfers_count=len(kaggle_transfers_df),
        salimt_count=len(salimt_df),
        db_count=len(players_db),
        career_count=len(career_paths),
        player_stats=player_stats,
        career_stats=career_stats,
        no_match_names=no_match_names,
    )

    # Save report JSON
    report_data = {
        "timestamp": datetime.now().isoformat(),
        "dry_run": args.dry_run,
        "sources": {
            "kaggle_players": len(kaggle_players_df),
            "kaggle_transfers": len(kaggle_transfers_df),
            "salimt_profiles": len(salimt_df),
        },
        "players_db": {
            "total": len(players_db),
            "from_kaggle": player_stats["from_kaggle"],
            "from_salimt": player_stats["from_salimt"],
            "unchanged": player_stats["unchanged"],
            "no_match": player_stats["no_match"],
            "new_clubs": sorted(player_stats["new_clubs"]),
        },
        "career_paths": {
            "total": len(career_paths),
            "careers_extended": career_stats["careers_extended"],
            "new_entries_added": career_stats["new_entries_added"],
            "details": career_stats["details"],
        },
        "unmatched_players": no_match_names[:50],
    }

    report_path = DATA_DIR / "update_report.json"
    if not args.dry_run:
        with open(report_path, "w", encoding="utf-8") as f:
            json.dump(report_data, f, ensure_ascii=False, indent=2)
        log.info(f"Report saved to {report_path}")
    else:
        log.info("[DRY RUN] No files were modified.")
        # Still save report in dry-run mode for review
        with open(report_path, "w", encoding="utf-8") as f:
            json.dump(report_data, f, ensure_ascii=False, indent=2)
        log.info(f"Report saved to {report_path}")


if __name__ == "__main__":
    main()
