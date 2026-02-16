"""
Reconcile and merge player data from transfermarkt and football-data.org
updates into the master player database.
"""

import difflib
import json
import shutil
import sys
from datetime import datetime
from pathlib import Path

from unidecode import unidecode

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
MASTER_FILE = DATA_DIR / "players_db_v1.json"
TRANSFERMARKT_UPDATE = DATA_DIR / "transfermarkt_update.json"
FOOTBALL_API_UPDATE = DATA_DIR / "football_api_update.json"
OUTPUT_FILE = DATA_DIR / "players_db_v2.json"
REPORT_FILE = DATA_DIR / "merge_report.json"

# Match thresholds
PRIMARY_THRESHOLD = 1.0    # exact normalized name
SECONDARY_THRESHOLD = 0.90 # name similarity + same nationality
TERTIARY_THRESHOLD = 0.85  # name similarity + same position + same league


def normalize_name(name: str) -> str:
    if not isinstance(name, str):
        return ""
    return unidecode(name).lower().strip()


def name_similarity(a: str, b: str) -> float:
    return difflib.SequenceMatcher(None, a, b).ratio()


def load_json(path: Path) -> list[dict] | None:
    if not path.exists():
        print(f"  {path.name} not found, skipping.")
        return None
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    print(f"  Loaded {len(data):,} records from {path.name}")
    return data


def build_name_index(players: list[dict]) -> dict[str, list[int]]:
    """Build a map from normalized_name to list of indices."""
    index: dict[str, list[int]] = {}
    for i, p in enumerate(players):
        nname = p.get("normalized_name") or normalize_name(p.get("name", ""))
        if nname:
            index.setdefault(nname, []).append(i)
    return index


def find_match(
    update_record: dict,
    master: list[dict],
    name_index: dict[str, list[int]],
) -> int | None:
    """Find a matching player in master for an update record. Returns index or None."""
    u_name = normalize_name(update_record.get("name", ""))
    if not u_name:
        return None

    # Primary: exact normalized name
    candidates = name_index.get(u_name)
    if candidates:
        return candidates[0]

    # Secondary + Tertiary: fuzzy search (only scan subset for performance)
    u_nat = (update_record.get("nationality") or "").lower().strip()
    u_pos = (update_record.get("position") or "").lower().strip()
    u_league = (update_record.get("league") or "").lower().strip()

    best_idx = None
    best_score = 0.0

    for i, m in enumerate(master):
        m_name = m.get("normalized_name") or normalize_name(m.get("name", ""))
        sim = name_similarity(u_name, m_name)

        if sim < TERTIARY_THRESHOLD:
            continue

        m_nat = (m.get("nationality") or "").lower().strip()
        m_pos = (m.get("position") or "").lower().strip()
        m_league = (m.get("league") or "").lower().strip()

        # Secondary: high similarity + same nationality
        if sim >= SECONDARY_THRESHOLD and u_nat and u_nat == m_nat:
            if sim > best_score:
                best_score = sim
                best_idx = i
                if sim >= PRIMARY_THRESHOLD:
                    break
            continue

        # Tertiary: moderate similarity + same position + same league
        if sim >= TERTIARY_THRESHOLD and u_pos and u_pos == m_pos and u_league and u_league == m_league:
            if sim > best_score:
                best_score = sim
                best_idx = i

    return best_idx


def merge_updates(
    master: list[dict],
    updates: list[dict],
    source_name: str,
    report: dict,
) -> None:
    """Merge update records into master in-place."""
    name_index = build_name_index(master)
    matched = 0
    added = 0
    unmatched_records = []

    max_id = max((p.get("id", 0) for p in master), default=0)

    for u in updates:
        idx = find_match(u, master, name_index)

        if idx is not None:
            p = master[idx]
            # Update mutable fields only
            if u.get("current_team"):
                p["current_team"] = u["current_team"]
            if u.get("league"):
                p["league"] = u["league"]
            if u.get("market_value") is not None:
                p["market_value"] = u["market_value"]
            if u.get("image_url") and not p.get("image_url"):
                p["image_url"] = u["image_url"]
            matched += 1
        else:
            # Add as new entry
            max_id += 1
            new_player = {
                "id": max_id,
                "name": u.get("name", "Unknown"),
                "normalized_name": normalize_name(u.get("name", "")),
                "nationality": u.get("nationality"),
                "current_team": u.get("current_team"),
                "league": u.get("league"),
                "position": u.get("position"),
                "market_value": u.get("market_value"),
                "image_url": u.get("image_url"),
            }
            master.append(new_player)
            # Update index for new entry
            nname = new_player["normalized_name"]
            if nname:
                name_index.setdefault(nname, []).append(len(master) - 1)
            added += 1
            unmatched_records.append({"name": u.get("name"), "source": source_name})

    print(f"  {source_name}: {matched} matched, {added} added as new")
    report[f"{source_name}_matched"] = matched
    report[f"{source_name}_added"] = added
    report[f"{source_name}_unmatched"] = unmatched_records


def main() -> None:
    print("=== Reconcile and Merge ===")
    print(f"Timestamp: {datetime.now().isoformat()}\n")

    # Load master
    print("Loading data sources:")
    master_data = load_json(MASTER_FILE)
    if master_data is None:
        print("ERROR: Master database not found.", file=sys.stderr)
        sys.exit(1)

    count_before = len(master_data)

    # Backup master
    backup_path = DATA_DIR / f"players_db_v1.backup.json"
    shutil.copy2(MASTER_FILE, backup_path)
    print(f"  Backed up master to {backup_path.name}")

    transfermarkt_data = load_json(TRANSFERMARKT_UPDATE)
    football_api_data = load_json(FOOTBALL_API_UPDATE)

    if transfermarkt_data is None and football_api_data is None:
        print("\nNo update sources found. Nothing to merge.")
        sys.exit(0)

    report: dict = {
        "timestamp": datetime.now().isoformat(),
        "master_count_before": count_before,
    }

    # Merge football-data.org first, then transfermarkt (transfermarkt preferred,
    # so it overwrites football-data.org values for the same player)
    print("\nMerging updates:")
    if football_api_data:
        merge_updates(master_data, football_api_data, "football_api", report)

    if transfermarkt_data:
        merge_updates(master_data, transfermarkt_data, "transfermarkt", report)

    count_after = len(master_data)
    report["master_count_after"] = count_after

    # Flag issues
    zero_value = [p for p in master_data if p.get("market_value") == 0]
    empty_club = [p for p in master_data if not p.get("current_team") or p.get("current_team") == "Unknown"]
    report["flagged_zero_market_value"] = len(zero_value)
    report["flagged_empty_club"] = len(empty_club)

    # Sort by id
    master_data.sort(key=lambda r: r.get("id", 0))

    # Write output
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(master_data, f, ensure_ascii=False, indent=2)

    with open(REPORT_FILE, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    # Summary
    print(f"\n=== Merge Summary ===")
    print(f"Master before: {count_before:,}")
    print(f"Master after:  {count_after:,}")
    print(f"New players:   {count_after - count_before:,}")
    print(f"Flagged: {len(zero_value)} zero market_value, {len(empty_club)} empty/unknown club")
    print(f"\nOutput: {OUTPUT_FILE}")
    print(f"Report: {REPORT_FILE}")
    print("Merge complete.")


if __name__ == "__main__":
    main()
