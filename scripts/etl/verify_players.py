"""
Verification script for players_db_v1.json.
Samples 50 players and runs integrity checks.
"""

import json
import random
import sys
from pathlib import Path

DATA_FILE = Path(__file__).resolve().parent.parent.parent / "data" / "players_db_v1.json"

REQUIRED_FIELDS = ["id", "name", "normalized_name", "league"]


def load_players() -> list[dict]:
    with open(DATA_FILE, encoding="utf-8") as f:
        return json.load(f)


def check_no_null_required_fields(players: list[dict]) -> list[str]:
    errors = []
    for p in players:
        for field in REQUIRED_FIELDS:
            if p.get(field) is None or p.get(field) == "":
                errors.append(f"Player id={p.get('id')}: missing required field '{field}'")
    return errors


def check_no_duplicate_ids(players: list[dict]) -> list[str]:
    seen = {}
    errors = []
    for p in players:
        pid = p["id"]
        if pid in seen:
            errors.append(f"Duplicate id={pid}: '{seen[pid]}' and '{p['name']}'")
        seen[pid] = p["name"]
    return errors


def check_team_name_consistency(players: list[dict]) -> list[str]:
    """Check that teams within a league are consistently named."""
    league_teams: dict[str, set[str]] = {}
    for p in players:
        league = p.get("league")
        team = p.get("current_team")
        if league and team:
            league_teams.setdefault(league, set()).add(team)

    errors = []
    for league, teams in sorted(league_teams.items()):
        # Dataset spans multiple seasons, so promoted/relegated clubs inflate count.
        # Allow up to 50 distinct team names per league.
        if len(teams) > 50:
            errors.append(
                f"League '{league}' has {len(teams)} distinct team names "
                f"(expected <= 50 for a top-flight league across seasons)"
            )
    return errors


def sample_and_print(players: list[dict], n: int = 50) -> None:
    sample = random.sample(players, min(n, len(players)))
    print(f"\n--- Sample of {len(sample)} players ---")
    print(f"{'Name':<30} {'Team':<35} {'Nationality':<20} {'League'}")
    print("-" * 110)
    for p in sample:
        print(
            f"{p['name']:<30} "
            f"{(p.get('current_team') or 'N/A'):<35} "
            f"{(p.get('nationality') or 'N/A'):<20} "
            f"{p['league']}"
        )


def main() -> None:
    if not DATA_FILE.exists():
        print(f"ERROR: {DATA_FILE} not found. Run ingest_players.py first.")
        sys.exit(1)

    players = load_players()
    print(f"Loaded {len(players):,} players from {DATA_FILE}")

    all_errors = []

    # Integrity checks
    print("\nRunning integrity checks...")

    errors = check_no_null_required_fields(players)
    all_errors.extend(errors)
    print(f"  Required fields check: {'PASS' if not errors else f'FAIL ({len(errors)} issues)'}")

    errors = check_no_duplicate_ids(players)
    all_errors.extend(errors)
    print(f"  Duplicate ID check:    {'PASS' if not errors else f'FAIL ({len(errors)} issues)'}")

    errors = check_team_name_consistency(players)
    all_errors.extend(errors)
    print(f"  Team consistency check: {'PASS' if not errors else f'FAIL ({len(errors)} issues)'}")

    # League distribution
    league_counts: dict[str, int] = {}
    for p in players:
        league_counts[p["league"]] = league_counts.get(p["league"], 0) + 1
    print("\nLeague distribution:")
    for league, count in sorted(league_counts.items(), key=lambda x: -x[1]):
        print(f"  {league:<20} {count:>5} players")

    # Sample
    sample_and_print(players)

    # Summary
    if all_errors:
        print(f"\nVERIFICATION FAILED: {len(all_errors)} error(s)")
        for e in all_errors[:20]:
            print(f"  - {e}")
        sys.exit(1)
    else:
        print("\nVERIFICATION PASSED: All checks OK")


if __name__ == "__main__":
    main()
