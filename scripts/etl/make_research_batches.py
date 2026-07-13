#!/usr/bin/env python3
"""Produce research batch files for high-fame players.

Covers every players_db player that joins (by normalized name) to a
fame_scores entry with fame_score >= 70, ordered by fame descending, in
batches of up to 40. Writes data/research_batches/batch_NN.json.

High-fame fame_scores entries with NO players_db row (mostly pre-DB legends:
Zidane, Pele, Maradona, Ronaldinho, ...) cannot be patched by id, so they are
written to data/research_batches/unmatched_high_fame.json for visibility
rather than silently dropped.

stdlib only.
"""
import datetime
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common  # noqa: E402

FAME_MIN = 70
BATCH_SIZE = 40
REFERENCE_DATE = "2026-07-12"

# League strings the apply step accepts. Must be values already present in
# players_db (Grid/Guess compare on them). There is NO "Retired" league: a
# retired player keeps their last league, and status/retired_year carry the fact.
KNOWN_LEAGUES = [
    "Premier League", "La Liga", "Serie A", "Bundesliga", "Ligue 1",
]

SCHEMA = {
    "description": (
        "Research each player's status as of %s and fill these fields. "
        "Do NOT change id or name. Save the completed file(s) as "
        "data/research_patches/patch_NN.json with the same {id, ...} objects."
    ) % REFERENCE_DATE,
    "fields": {
        "id": "int - players_db id, unchanged (join key, do not edit)",
        "name": "string - unchanged, for human reference",
        "status": "'active' or 'retired'",
        "current_team": (
            "the club's COMMON name as of July 2026 (e.g. 'Real Madrid', "
            "'Inter Miami', 'Al-Nassr'). For a RETIRED player, their LAST "
            "professional club. Name normalisation to the app's official club "
            "string happens automatically at apply time -- just give the common "
            "name."
        ),
        "league": (
            "for ACTIVE players, one of known_leagues below (the club's current "
            "league). For RETIRED players LEAVE THIS OUT / null -- their last "
            "league is kept automatically; do NOT write 'Retired'."
        ),
        "market_value_eur": (
            "integer euros, 0..300000000; use 0 for retired players"
        ),
        "retired_year": "integer year if retired, otherwise null",
    },
    "known_leagues": KNOWN_LEAGUES,
    "market_value_bounds_eur": [0, 300000000],
    "notes": [
        "current_team is normalised at apply time; unresolvable clubs are "
        "logged to research_patches/unresolved_clubs.json and skipped (other "
        "fields still apply).",
        "league is never set to 'Retired' or any new string -- retirement is "
        "carried by status + retired_year.",
    ],
}


def build_entries(players, fame_by_norm, ages):
    by_id = {}  # id -> (fame_score, entry)
    for p in players:
        fe = common.fame_for_player(p, fame_by_norm)
        if not fe or fe.get("fame_score", 0) < FAME_MIN:
            continue
        pid = p["id"]
        prev = by_id.get(pid)
        fs = fe.get("fame_score", 0)
        if prev is None or fs > prev[0]:
            by_id[pid] = (fs, {
                "id": pid,
                "name": p.get("name"),
                "nationality": p.get("nationality", ""),
                "position": p.get("position", ""),
                "current_team": p.get("current_team", ""),
                "market_value": p.get("market_value", 0),
                "fame_score": round(fs, 2),
                "birth_year": common.birth_year_from_ages(ages, pid),
            })
    # sort by fame desc, then id for stability
    return [e for _, e in sorted(
        by_id.values(), key=lambda t: (-t[0], t[1]["id"])
    )]


def main():
    players = common.load_json(common.PLAYERS_DB)
    fame_scores = common.load_json(common.FAME_SCORES)
    ages = common.load_json(common.PLAYER_AGES)
    fame_by_norm = common.build_fame_by_norm(fame_scores)

    entries = build_entries(players, fame_by_norm, ages)

    out_dir = os.path.join(common.DATA_DIR, "research_batches")
    os.makedirs(out_dir, exist_ok=True)

    # Clear any stale batch_*.json so re-runs don't leave orphans.
    for fn in os.listdir(out_dir):
        if fn.startswith("batch_") and fn.endswith(".json"):
            os.remove(os.path.join(out_dir, fn))

    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    n_batches = (len(entries) + BATCH_SIZE - 1) // BATCH_SIZE
    for i in range(n_batches):
        chunk = entries[i * BATCH_SIZE:(i + 1) * BATCH_SIZE]
        batch_no = i + 1
        fames = [e["fame_score"] for e in chunk]
        batch = {
            "batch": batch_no,
            "generated_utc": now,
            "reference_date": REFERENCE_DATE,
            "fame_min": FAME_MIN,
            "fame_range_in_batch": [min(fames), max(fames)] if fames else [],
            "count": len(chunk),
            "schema": SCHEMA,
            "players": chunk,
        }
        path = os.path.join(out_dir, "batch_%02d.json" % batch_no)
        common.dump_json(path, batch)

    # Unmatched high-fame entries (no players_db id -> cannot be patched).
    matched_norms = set()
    for p in players:
        matched_norms |= common.player_norm_keys(p)
    unmatched = sorted(
        (e for e in fame_scores
         if e.get("fame_score", 0) >= FAME_MIN
         and common.norm_name(e.get("name", "")) not in matched_norms),
        key=lambda e: -e.get("fame_score", 0),
    )
    common.dump_json(
        os.path.join(out_dir, "unmatched_high_fame.json"),
        {
            "note": (
                "fame_score>=%d entries with no players_db row (mostly pre-DB "
                "legends). Not patchable by id; handle separately if needed."
            ) % FAME_MIN,
            "count": len(unmatched),
            "players": [
                {"name": e.get("name"), "fame_score": e.get("fame_score")}
                for e in unmatched
            ],
        },
    )

    print("wrote %d batch files (batch_01..batch_%02d) covering %d players to %s"
          % (n_batches, n_batches, len(entries), out_dir))
    print("wrote unmatched_high_fame.json (%d legends without a players_db id)"
          % len(unmatched))
    return n_batches


if __name__ == "__main__":
    main()
