"""
ETL pipeline to download transfermarkt-datasets player data,
filter to Big 5 leagues, normalize names, and output JSON.
"""

import io
import json
import sys
from pathlib import Path

import pandas as pd
import requests
from unidecode import unidecode

# Kaggle public dataset URL for transfermarkt-datasets
PLAYERS_CSV_URL = (
    "https://www.kaggle.com/api/v1/datasets/download/"
    "davidcariboo/player-scores/players.csv"
)

# Big 5 European leagues (transfermarkt competition IDs)
BIG_5_LEAGUE_IDS = {"GB1", "ES1", "IT1", "L1", "FR1"}

BIG_5_LEAGUE_NAMES = {
    "GB1": "Premier League",
    "ES1": "La Liga",
    "IT1": "Serie A",
    "L1": "Bundesliga",
    "FR1": "Ligue 1",
}

OUTPUT_DIR = Path(__file__).resolve().parent.parent.parent / "data"
OUTPUT_FILE = OUTPUT_DIR / "players_db_v1.json"


def download_csv(url: str) -> pd.DataFrame:
    """Download a CSV from a URL and return a DataFrame."""
    print(f"Downloading {url} ...")
    resp = requests.get(url, timeout=120)
    resp.raise_for_status()
    print(f"  Downloaded {len(resp.content):,} bytes")
    return pd.read_csv(io.StringIO(resp.text))


def normalize_name(name: str) -> str:
    """Remove diacritics and lowercase a player name."""
    if not isinstance(name, str):
        return ""
    return unidecode(name).lower().strip()


def main() -> None:
    # Download players
    df = download_csv(PLAYERS_CSV_URL)
    print(f"Total players in dataset: {len(df):,}")

    # Filter to Big 5 leagues
    df = df[df["current_club_domestic_competition_id"].isin(BIG_5_LEAGUE_IDS)].copy()
    print(f"Players in Big 5 leagues: {len(df):,}")

    # Drop players without a name
    df = df.dropna(subset=["name"])

    # Build output records
    records = []
    for _, row in df.iterrows():
        league_id = row["current_club_domestic_competition_id"]
        record = {
            "id": int(row["player_id"]),
            "name": str(row["name"]),
            "normalized_name": normalize_name(row["name"]),
            "nationality": (
                str(row["country_of_citizenship"])
                if pd.notna(row.get("country_of_citizenship"))
                else None
            ),
            "current_team": (
                str(row["current_club_name"])
                if pd.notna(row.get("current_club_name"))
                else None
            ),
            "league": BIG_5_LEAGUE_NAMES.get(league_id, league_id),
            "position": (
                str(row["position"]) if pd.notna(row.get("position")) else None
            ),
            "market_value": (
                int(row["market_value_in_eur"])
                if pd.notna(row.get("market_value_in_eur"))
                else None
            ),
            "image_url": (
                str(row["image_url"]) if pd.notna(row.get("image_url")) else None
            ),
            "last_season": (
                int(row["last_season"])
                if pd.notna(row.get("last_season"))
                else None
            ),
        }
        records.append(record)

    # Sort by id for deterministic output
    records.sort(key=lambda r: r["id"])

    # Write JSON
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, separators=(",", ":"))

    file_size_mb = OUTPUT_FILE.stat().st_size / (1024 * 1024)
    print(f"Wrote {len(records):,} players to {OUTPUT_FILE}")
    print(f"File size: {file_size_mb:.2f} MB")

    if file_size_mb > 5:
        print("WARNING: File exceeds 5 MB target", file=sys.stderr)
        sys.exit(1)

    print("ETL complete.")


if __name__ == "__main__":
    main()
