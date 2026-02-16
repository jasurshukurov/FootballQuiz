"""
Verification script for matches_db.json integrity.
Checks required fields, lineup sizes, date formats, and duplicates.
"""

import json
import sys
from datetime import datetime
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
MATCHES_DB = ROOT_DIR / "data" / "matches_db.json"

REQUIRED_FIELDS = [
    "match_id", "date", "competition", "season",
    "opponent_a", "opponent_b", "score",
    "lineup_a_ids", "lineup_b_ids",
    "lineup_a_names", "lineup_b_names",
]


def main() -> None:
    if not MATCHES_DB.exists():
        print(f"ERROR: {MATCHES_DB} not found")
        sys.exit(1)

    with open(MATCHES_DB, "r", encoding="utf-8") as f:
        matches = json.load(f)

    errors = []
    warnings = []
    match_ids = set()
    competitions = set()
    teams = set()
    total_players_matched = 0
    total_players_unmatched = 0

    for i, m in enumerate(matches):
        prefix = f"Match [{i}] ({m.get('match_id', 'UNKNOWN')})"

        # Check required fields
        for field in REQUIRED_FIELDS:
            if field not in m:
                errors.append(f"{prefix}: missing field '{field}'")

        # Check duplicate match_ids
        mid = m.get("match_id")
        if mid in match_ids:
            errors.append(f"{prefix}: duplicate match_id '{mid}'")
        match_ids.add(mid)

        # Check date format
        date_str = m.get("date", "")
        try:
            datetime.strptime(date_str, "%Y-%m-%d")
        except ValueError:
            errors.append(f"{prefix}: invalid date format '{date_str}'")

        # Check lineups have exactly 11 entries
        for key in ["lineup_a_ids", "lineup_b_ids", "lineup_a_names", "lineup_b_names"]:
            arr = m.get(key, [])
            if len(arr) != 11:
                errors.append(f"{prefix}: {key} has {len(arr)} entries (expected 11)")

        # Check ids and names arrays match in length
        if len(m.get("lineup_a_ids", [])) != len(m.get("lineup_a_names", [])):
            errors.append(f"{prefix}: lineup_a_ids and lineup_a_names length mismatch")
        if len(m.get("lineup_b_ids", [])) != len(m.get("lineup_b_names", [])):
            errors.append(f"{prefix}: lineup_b_ids and lineup_b_names length mismatch")

        # Count matched/unmatched players
        for pid in m.get("lineup_a_ids", []) + m.get("lineup_b_ids", []):
            if pid >= 0:
                total_players_matched += 1
            else:
                total_players_unmatched += 1

        # Track competitions and teams
        competitions.add(m.get("competition", ""))
        teams.add(m.get("opponent_a", ""))
        teams.add(m.get("opponent_b", ""))

    # Print results
    print("=" * 60)
    print("MATCHES_DB VERIFICATION REPORT")
    print("=" * 60)
    print(f"Total matches: {len(matches)}")
    print(f"Unique match IDs: {len(match_ids)}")
    print(f"Competitions: {len(competitions)}")
    for c in sorted(competitions):
        count = sum(1 for m in matches if m["competition"] == c)
        print(f"  - {c}: {count}")
    print(f"Teams: {len(teams)}")
    print(f"Players matched to DB: {total_players_matched}")
    print(f"Players with negative IDs: {total_players_unmatched}")
    total = total_players_matched + total_players_unmatched
    if total > 0:
        print(f"Match rate: {total_players_matched / total * 100:.1f}%")

    if errors:
        print(f"\nERRORS ({len(errors)}):")
        for e in errors:
            print(f"  {e}")
    else:
        print("\nNo errors found.")

    if warnings:
        print(f"\nWARNINGS ({len(warnings)}):")
        for w in warnings:
            print(f"  {w}")

    print("=" * 60)

    if errors:
        sys.exit(1)
    print("VERIFICATION PASSED")


if __name__ == "__main__":
    main()
