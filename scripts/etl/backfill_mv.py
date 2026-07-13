#!/usr/bin/env python3
"""
backfill_mv.py -- set approximate July 2026 market values for the active
legend-block players that were stored with market_value = 0 (which broke the
market-value games), and refresh the one stale club (Elye Wahi -> OGC Nice).

Values are round approximations from public knowledge as of July 2026 (age /
level appropriate). Idempotent: only fills rows currently at 0.
Run:  python3 scripts/etl/backfill_mv.py
"""
import json
import os

DATA = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data"))
PDB = os.path.join(DATA, "players_db_v1.json")

# id -> approximate market value (EUR), July 2026
MV = {
    1600016: 8000000,    # N'Golo Kante (Al-Ittihad, 35)
    1600018: 1500000,    # Angel Di Maria (Rosario Central, 38)
    1600020: 1000000,    # Thiago Silva (Fluminense, 41)
    1600021: 3000000,    # James Rodriguez (Minnesota United, 34)
    1600023: 18000000,   # Alisson Becker (Liverpool, 33)
    1600024: 14000000,   # Raheem Sterling (Chelsea, 31)
    1600030: 6000000,    # Ilkay Gundogan (Manchester City, 35)
    1600041: 70000000,   # Victor Osimhen (Galatasaray, 27)
    1600052: 1000000,    # Mario Balotelli (Al-Ittifaq, 35)
    1600066: 500000,     # Juan Mata (Melbourne Victory, 38)
    1600067: 22000000,   # Andre Onana (Manchester United, 30)
    1600076: 500000,     # Shinji Kagawa (Cerezo Osaka, 37)
    1600078: 3000000,    # Hakim Ziyech (Wydad AC, 33)
    1600080: 22000000,   # Leroy Sane (Galatasaray, 30)
}

# stale club refresh (id -> current_team), using the DB's existing long-form name
CLUB = {
    659542: "Olympique Gymnaste Club Nice Côte d'Azur",  # Elye Wahi loaned to Nice Jan 2026
}


def main():
    players = json.load(open(PDB, encoding="utf-8"))
    by_id = {p["id"]: p for p in players}

    filled = 0
    for pid, mv in MV.items():
        p = by_id.get(pid)
        if p is None:
            print("WARN: mv id missing", pid)
            continue
        if not p.get("market_value"):
            p["market_value"] = mv
            filled += 1

    club_fixed = 0
    for pid, club in CLUB.items():
        p = by_id.get(pid)
        if p is None:
            print("WARN: club id missing", pid)
            continue
        if p.get("current_team") != club:
            print(f"  {pid} {p['name']}: {p['current_team']!r} -> {club!r}")
            p["current_team"] = club
            club_fixed += 1

    json.dump(players, open(PDB, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"market values filled: {filled}")
    print(f"clubs refreshed: {club_fixed}")


if __name__ == "__main__":
    main()
