#!/usr/bin/env python3
"""
build_fame_by_id.py -- produce data/fame_by_id.json.

Root-cause groundwork for the guessable-pool bug: today the app joins
fame_scores to players by lowercased name, so every namesake of a famous player
inherits that player's fame score and lands in the pool. This builds an
id-keyed map instead:

    players_db id -> {name, fame_score, difficulty_tier, peak_valuation}

so that when the code switches to an id join, ONLY the real famous player carries
the fame and namesakes drop out of the pool.

Join strategy (in priority order):
  1. exact lowercased-name match (same as current code).
  2. for a famous name with >1 players_db row (a collision), disambiguate to the
     single most-likely-famous row = highest market_value (tie-break: active,
     has image, lowest id). The namesakes get NO entry.
  3. token-set fallback for names still unmatched (e.g. "Son Heung-min" vs
     "Heung-min Son"): match on the diacritic-stripped set of name tokens, but
     ONLY when it resolves to exactly one players_db row.

Reports coverage for the fame>=55 guessable pool.
Run:  python3 scripts/etl/build_fame_by_id.py
"""
import json
import os
import re
import unicodedata
from collections import defaultdict

DATA = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data"))
FAME_THRESHOLD = 55.0


def strip(s):
    n = unicodedata.normalize("NFKD", s or "")
    return re.sub(r"[^a-z0-9 ]", "", "".join(c for c in n if not unicodedata.combining(c)).lower()).strip()


def tokenset(s):
    return " ".join(sorted(strip(s).split()))


# --- notable-namesake overrides (players_db id -> fame_scores global_id) ------
# When a shared name has MULTIPLE distinct fame_scores entries, the automatic
# max-market-value collision pick can hand the wrong entry to the wrong player,
# or leave a genuinely-notable namesake with none. These pairings are web-
# verified (July 2026) so each real player carries HIS OWN fame entry:
#   Nico Gonzalez  466805 = Spanish DM (Man City, ~45M peak)  -> gid 8173
#   Nicolas Gonzalez 486031 = Argentine winger (Juventus/AtM) -> gid 8345 (WC, high pageviews)
#   Mohamed Camara  99946  = Guinea forward (Troyes, ~100k)   -> gid 2931 (sub-pool, correct)
# Not fixable (noted, left as none / automatic):
#   Fabinho 163058 (Udinese, 200k): both "Fabinho" fame rows share the ex-
#     Liverpool player's 46.7M peak -> duplicate entries, not a second player.
#   Ederson 607854 (Atalanta MF): the only "Éderson" fame row is an accent-dup
#     of the Man City GK's stats; no distinct entry exists for the midfielder.
NAMESAKE_OVERRIDES = {
    466805: 8173,
    486031: 8345,
    99946: 2931,
}

# --- manual fame overrides (players_db id -> new score/tier) -------------------
# Applied LAST, over the name/auto-joined value. Web-verified July 2026.
# (a) DEMOTE obscure namesakes who inherited a star's fame via a shared name so
#     they drop out of the guessable pool (fame<55). reset_metrics rebuilds the
#     entry from the journeyman's own row (their inherited peak_valuation etc.
#     belonged to the star). The star keeps the high score on his own row:
#       'Ronaldo' Rostov 146660  -> Nazário 1600007 still carries 86.77 (gid 12178)
#       'Cafú' Kasımpaşa 203655  -> the Brazil RB legend Cafu has NO players_db row
# (b) BUMP verified post-2024 breakouts to current stature (keep their metrics).
MANUAL_FAME_OVERRIDES = {
    146660: {"fame_score": 32.0, "difficulty_tier": "Legendary", "reset_metrics": True},
    203655: {"fame_score": 37.0, "difficulty_tier": "Legendary", "reset_metrics": True},
    914562: {"fame_score": 76.0, "difficulty_tier": "Amateur"},   # Désiré Doué: 2x UCL, Ligue1+UCL YPOTY, WC26
    845654: {"fame_score": 70.0, "difficulty_tier": "Amateur"},   # Kenan Yıldız: Serie A Best U23 25/26, Juve/Türkiye
    670681: {"fame_score": 72.0, "difficulty_tier": "Amateur"},   # João Neves: PSG treble core, WC26
}


def pick_famous(rows):
    """Choose the row most likely to be the actual famous player."""
    return sorted(
        rows,
        key=lambda r: (
            -(r.get("market_value") or 0),
            0 if r.get("status") != "retired" else 1,
            0 if r.get("image_url") else 1,
            r["id"],
        ),
    )[0]


def entry_from_fame(f, name):
    """Build a fame_by_id value carrying the score, tier, and the secondary
    metrics blindRanking sorts on (peak_game_rating, elite_exposure,
    wikipedia_pageviews) so a later id-based join keeps those signals."""
    m = f.get("metrics") or {}
    return {
        "name": name,
        "fame_score": f["fame_score"],
        "difficulty_tier": f["difficulty_tier"],
        "peak_valuation": m.get("peak_valuation_euros", 0),
        "peak_game_rating": m.get("peak_game_rating", 0),
        "elite_exposure": m.get("elite_exposure", 0),
        "wikipedia_pageviews": m.get("wikipedia_pageviews", 0),
    }


def main():
    players = json.load(open(os.path.join(DATA, "players_db_v1.json"), encoding="utf-8"))
    fame = json.load(open(os.path.join(DATA, "fame_scores.json"), encoding="utf-8"))
    fame_by_gid = {f["global_id"]: f for f in fame}

    # best fame entry per lowercased name
    fame_by_name = {}
    for f in fame:
        nm = f["name"].lower()
        if nm not in fame_by_name or f["fame_score"] > fame_by_name[nm]["fame_score"]:
            fame_by_name[nm] = f

    by_name = defaultdict(list)
    by_tokenset = defaultdict(list)
    for p in players:
        by_name[p["name"].lower()].append(p)
        by_tokenset[tokenset(p["name"])].append(p)

    fame_by_id = {}
    stats = {"one_to_one": 0, "ambiguous_resolved": 0, "tokenset_resolved": 0,
             "unmatched": 0}
    pool_stats = dict(stats)
    unmatched_pool = []
    ambiguous_pool = []

    for nm, f in fame_by_name.items():
        is_pool = f["fame_score"] >= FAME_THRESHOLD
        rows = by_name.get(nm)
        kind = None
        winner = None
        if rows:
            if len(rows) == 1:
                winner, kind = rows[0], "one_to_one"
            else:
                winner, kind = pick_famous(rows), "ambiguous_resolved"
                if is_pool:
                    ambiguous_pool.append({
                        "name": f["name"], "chosen_id": winner["id"],
                        "candidates": [(r["id"], r.get("market_value"), r["current_team"]) for r in rows],
                    })
        else:
            ts = by_tokenset.get(tokenset(f["name"]), [])
            if len(ts) == 1:
                winner, kind = ts[0], "tokenset_resolved"
            else:
                kind = "unmatched"
                if is_pool:
                    unmatched_pool.append({"name": f["name"], "fame": f["fame_score"],
                                           "tokenset_candidates": len(ts)})

        stats[kind] += 1
        if is_pool:
            pool_stats[kind] += 1

        if winner is not None:
            fame_by_id[str(winner["id"])] = entry_from_fame(f, winner["name"])

    # apply web-verified notable-namesake overrides (assign each real player his
    # own fame entry). Track which players_db ids newly gain an entry.
    by_id = {p["id"]: p for p in players}
    override_new, override_changed = [], []
    for pid, gid in NAMESAKE_OVERRIDES.items():
        f = fame_by_gid.get(gid)
        p = by_id.get(pid)
        if not f or not p:
            print(f"WARN override skipped pid={pid} gid={gid} (missing)")
            continue
        (override_changed if str(pid) in fame_by_id else override_new).append(pid)
        fame_by_id[str(pid)] = entry_from_fame(f, p["name"])

    # manual score/tier overrides (demotions + breakout bumps)
    manual_applied = []
    for pid, ov in MANUAL_FAME_OVERRIDES.items():
        key = str(pid)
        p = by_id.get(pid)
        base = fame_by_id.get(key)
        if ov.get("reset_metrics") or base is None:
            entry = {
                "name": (p["name"] if p else (base or {}).get("name", "")),
                "fame_score": ov["fame_score"],
                "difficulty_tier": ov["difficulty_tier"],
                "peak_valuation": (p.get("market_value") if p else 0) or 0,
                "peak_game_rating": 0, "elite_exposure": 0, "wikipedia_pageviews": 0,
            }
        else:
            entry = {**base, "fame_score": ov["fame_score"],
                     "difficulty_tier": ov["difficulty_tier"]}
        prev = (base or {}).get("fame_score")
        fame_by_id[key] = entry
        manual_applied.append((pid, entry["name"], prev, ov["fame_score"]))

    out = os.path.join(DATA, "fame_by_id.json")
    json.dump(fame_by_id, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

    print("=== fame_by_id.json built ===")
    print("total ids mapped:", len(fame_by_id))
    print("ALL fame entries:", stats)
    print("POOL (fame>=55):", pool_stats)
    pool_total = sum(pool_stats.values())
    mapped = pool_stats["one_to_one"] + pool_stats["ambiguous_resolved"] + pool_stats["tokenset_resolved"]
    print(f"POOL coverage: {mapped}/{pool_total} mapped, {pool_stats['unmatched']} unmatched")
    print("\nAmbiguous pool collisions resolved (chose highest-MV row):")
    for a in ambiguous_pool:
        print("  ", a["name"], "-> id", a["chosen_id"], "from", a["candidates"])
    print("\nUnmatched pool names (no players_db row; excluded from pool):")
    for u in sorted(unmatched_pool, key=lambda x: -x["fame"]):
        print(f"  {u['fame']:.1f}  {u['name']}  (tokenset candidates: {u['tokenset_candidates']})")
    print("\nManual fame overrides applied (id | name | old -> new):")
    for pid, nm, prev, new in manual_applied:
        print(f"  {pid} {nm}: {prev} -> {new}")
    print("\nNamesake overrides applied:")
    print(f"  ids that NEWLY gained an entry: {override_new}")
    print(f"  ids whose entry was corrected:  {override_changed}")
    for pid in list(NAMESAKE_OVERRIDES):
        e = fame_by_id.get(str(pid))
        if e:
            print(f"    id={pid} -> {e['name']} fame={e['fame_score']} rating={e['peak_game_rating']} pv={e['wikipedia_pageviews']}")


if __name__ == "__main__":
    main()
