"""
ETL script to fetch current squad data from football-data.org API
for the Big 5 European leagues and output normalized JSON.
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

API_BASE = "https://api.football-data.org/v4"

COMPETITIONS = {
    "PL": "Premier League",
    "PD": "La Liga",
    "BL1": "Bundesliga",
    "SA": "Serie A",
    "FL1": "Ligue 1",
}

POSITION_MAP = {
    "GOALKEEPER": "Goalkeeper",
    "DEFENDER": "Defender",
    "MIDFIELDER": "Midfielder",
    "OFFENCE": "Attack",
    "FORWARD": "Attack",
}

OUTPUT_DIR = Path(__file__).resolve().parent.parent.parent / "data"
OUTPUT_FILE = OUTPUT_DIR / "football_api_update.json"

REQUEST_INTERVAL = 6.5  # seconds between requests (safe for 10 req/min)
MAX_RETRIES = 3


def api_get(endpoint: str, api_key: str) -> dict:
    """Make a GET request to the football-data.org API with rate-limit handling."""
    url = f"{API_BASE}/{endpoint}"
    req = Request(url)
    req.add_header("X-Auth-Token", api_key)

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            with urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except HTTPError as e:
            if e.code == 429:
                wait = 60 * attempt
                print(f"  Rate limited (429). Waiting {wait}s before retry {attempt}/{MAX_RETRIES}...")
                time.sleep(wait)
                continue
            raise
    print(f"ERROR: Failed after {MAX_RETRIES} retries for {url}", file=sys.stderr)
    sys.exit(1)


def map_position(raw_position: str | None) -> str | None:
    if not raw_position:
        return None
    return POSITION_MAP.get(raw_position.upper(), raw_position)


def fetch_league_squads(code: str, league_name: str, api_key: str, dry_run: bool) -> list[dict]:
    """Fetch all team squads for a given competition code."""
    print(f"\n--- {league_name} ({code}) ---")
    data = api_get(f"competitions/{code}/teams", api_key)
    teams = data.get("teams", [])
    print(f"  Found {len(teams)} teams")

    if dry_run:
        teams = teams[:1]
        print(f"  [dry-run] Using only first team: {teams[0].get('name', '?')}")

    records = []
    for i, team in enumerate(teams):
        team_name = team.get("name", "Unknown")
        squad = team.get("squad") or []
        print(f"  [{i + 1}/{len(teams)}] {team_name}: {len(squad)} players")

        for player in squad:
            record = {
                "name": player.get("name"),
                "nationality": player.get("nationality"),
                "position": map_position(player.get("position")),
                "current_team": team_name,
                "league": league_name,
                "date_of_birth": player.get("dateOfBirth"),
                "football_data_id": player.get("id"),
            }
            if record["name"]:
                records.append(record)

    return records


def main() -> None:
    parser = argparse.ArgumentParser(description="Fetch squad data from football-data.org")
    parser.add_argument("--dry-run", action="store_true", help="Fetch only 1 team per league")
    args = parser.parse_args()

    api_key = os.environ.get("FOOTBALL_DATA_API_KEY", "")
    if not api_key:
        print(
            "ERROR: No API key found.\n\n"
            "Set the FOOTBALL_DATA_API_KEY environment variable:\n"
            "  export FOOTBALL_DATA_API_KEY=your_key_here\n\n"
            "Get a free key at: https://www.football-data.org/client/register",
            file=sys.stderr,
        )
        sys.exit(1)

    print(f"football-data.org API fetcher (dry_run={args.dry_run})")
    print(f"Fetching squads for {len(COMPETITIONS)} leagues...")

    all_records: list[dict] = []

    for idx, (code, league_name) in enumerate(COMPETITIONS.items()):
        if idx > 0:
            print(f"  (waiting {REQUEST_INTERVAL}s for rate limit)")
            time.sleep(REQUEST_INTERVAL)

        records = fetch_league_squads(code, league_name, api_key, args.dry_run)
        all_records.extend(records)
        print(f"  Subtotal: {len(all_records)} players so far")

    # Sort for deterministic output
    all_records.sort(key=lambda r: (r["league"], r["current_team"], r["name"] or ""))

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(all_records, f, ensure_ascii=False, indent=2)

    file_size_kb = OUTPUT_FILE.stat().st_size / 1024
    print(f"\nWrote {len(all_records):,} players to {OUTPUT_FILE}")
    print(f"File size: {file_size_kb:.1f} KB")
    print("Fetch complete.")


if __name__ == "__main__":
    main()
