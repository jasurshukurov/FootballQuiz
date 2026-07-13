#!/usr/bin/env python3
"""
fix_positions.py -- targeted position corrections for kept rows whose position
label was wrong (surfaced while confirming the keep-both namesake groups).
Idempotent. Run: python3 scripts/etl/fix_positions.py
"""
import json
import os

PDB = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "players_db_v1.json"))

# id -> correct position
FIX = {
    29035: "Goalkeeper",   # Ederson Moraes (ex-Man City GK, now Fenerbahce) mislabeled Midfield
}


def main():
    players = json.load(open(PDB, encoding="utf-8"))
    by_id = {p["id"]: p for p in players}
    n = 0
    for pid, pos in FIX.items():
        p = by_id.get(pid)
        if p and p.get("position") != pos:
            print(f"  {pid} {p['name']}: {p.get('position')!r} -> {pos!r}")
            p["position"] = pos
            n += 1
    json.dump(players, open(PDB, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print("positions fixed:", n)


if __name__ == "__main__":
    main()
