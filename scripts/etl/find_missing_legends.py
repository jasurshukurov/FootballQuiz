#!/usr/bin/env python3
"""List fame_scores players (fame_score >= threshold) that have NO row in
players_db_v1.json.

The app (lib/dailyPuzzle.ts getFameByName) joins players_db -> fame_scores by
LOWERCASE name, so a fame player is "missing" from gameplay when no players_db
row shares its name. We recompute that join here from scratch rather than trust
data/staleness_report.json.

To avoid proposing duplicates of players that already exist under an accented
spelling ("Lucio" vs "Lúcio"), the membership test is diacritic-insensitive:
we compare on a folded key (lowercased, accents stripped, punctuation collapsed).
A fame player already present under any diacritic variant is NOT reported.

Also flags each missing player's difficulty_tier, because lib/dailyPuzzle.ts
FAME_TIER_MAP does not map the "Ultimate" tier -> such players are skipped by
getFameByName() and will NOT enter the famous pool even after a db row is
added (needs an app-side FAME_TIER_MAP patch to become guessable).

stdlib only.

Usage:
    python3 find_missing_legends.py               # human-readable table
    python3 find_missing_legends.py --json OUT     # write list to OUT
    python3 find_missing_legends.py --min 70       # fame threshold (default 70)
"""
import argparse
import json
import os
import sys
import unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.normpath(os.path.join(HERE, "..", "..", "data"))

# Tiers lib/dailyPuzzle.ts FAME_TIER_MAP knows about. A fame player whose tier
# is outside this set is dropped by getFameByName() and can't reach the pool.
MAPPED_TIERS = {"Beginner", "Amateur", "Semi-Pro", "Professional",
                "World Class", "Legendary"}


def fold(name):
    """Diacritic-insensitive comparison key: lowercase, strip accents, collapse
    internal whitespace. 'Lúcio' and 'Lucio' fold to the same key."""
    if not name:
        return ""
    nfkd = unicodedata.normalize("NFKD", name)
    stripped = "".join(c for c in nfkd if not unicodedata.combining(c))
    return " ".join(stripped.lower().split())


def load_json(path):
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def find_missing(min_fame=70):
    players = load_json(os.path.join(DATA_DIR, "players_db_v1.json"))
    fame = load_json(os.path.join(DATA_DIR, "fame_scores.json"))

    # Both the exact-lowercase key the app joins on and the folded key we use
    # to catch accent variants.
    db_lower = {(p.get("name") or "").lower() for p in players}
    db_folded = {fold(p.get("name")) for p in players}

    missing = []
    for entry in fame:
        if entry.get("fame_score", 0) < min_fame:
            continue
        name = entry.get("name") or ""
        if name.lower() in db_lower:
            continue
        if fold(name) in db_folded:
            # Present under an accented / punctuation variant -> not missing.
            continue
        missing.append(entry)

    missing.sort(key=lambda e: e.get("fame_score", 0), reverse=True)
    return missing


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--min", type=float, default=70.0)
    ap.add_argument("--json", default=None,
                    help="write the missing list to this path")
    args = ap.parse_args()

    missing = find_missing(args.min)

    unmapped = [e for e in missing if e.get("difficulty_tier") not in MAPPED_TIERS]

    print("Missing fame players (fame_score >= %g): %d" % (args.min, len(missing)))
    print("%-32s %7s  %-12s %s" % ("name", "fame", "tier", "note"))
    print("-" * 70)
    for e in missing:
        tier = e.get("difficulty_tier", "?")
        note = "TIER UNMAPPED (won't join)" if tier not in MAPPED_TIERS else ""
        print("%-32s %7.2f  %-12s %s" % (
            e.get("name", "?")[:32], e.get("fame_score", 0), tier, note))
    print("-" * 70)
    print("Total missing: %d  (unmapped tier: %d)" % (len(missing), len(unmapped)))

    if args.json:
        with open(args.json, "w", encoding="utf-8") as fh:
            json.dump(missing, fh, ensure_ascii=False, indent=2)
        print("Wrote %s" % args.json)


if __name__ == "__main__":
    main()
