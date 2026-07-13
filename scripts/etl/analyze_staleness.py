#!/usr/bin/env python3
"""Report data-quality problems on gameplay-relevant players.

Gameplay-relevant = joins to a fame_scores entry with fame_score >= 55
(the same threshold lib/dailyPuzzle.ts uses to build the daily puzzle pool).

Writes data/staleness_report.json and prints a concise summary.

stdlib only.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common  # noqa: E402

FAME_GAMEPLAY = 55
FAME_HIGH = 70
DEFAULT_MV = 1_000_000  # the sentinel "unknown" market value used across the db
STALE_AGE = 34  # age at/above which an "active" club + low value looks stale


def main():
    players = common.load_json(common.PLAYERS_DB)
    fame_scores = common.load_json(common.FAME_SCORES)
    ages = common.load_json(common.PLAYER_AGES)
    fame_by_norm = common.build_fame_by_norm(fame_scores)
    resolve_badge = common.build_badge_resolver()

    # Join players_db -> fame.
    relevant = []  # (player, fame_entry)
    for p in players:
        fe = common.fame_for_player(p, fame_by_norm)
        if fe and fe.get("fame_score", 0) >= FAME_GAMEPLAY:
            relevant.append((p, fe))

    # How many fame>=X entries have NO players_db match at all.
    matched_norms = set()
    for p in players:
        matched_norms |= common.player_norm_keys(p)
    unmatched_high = []
    for e in fame_scores:
        if e.get("fame_score", 0) >= FAME_HIGH:
            if common.norm_name(e.get("name", "")) not in matched_norms:
                unmatched_high.append(e)

    total = len(relevant)
    default_mv = []
    zero_mv = []
    missing_age = []
    stale_team = []
    missing_badge_players = []
    unresolved_teams = {}

    for p, fe in relevant:
        mv = p.get("market_value", 0) or 0
        if mv == DEFAULT_MV:
            default_mv.append((p, fe))
        if mv == 0:
            zero_mv.append((p, fe))
        age = common.age_from_ages(ages, p["id"])
        if age is None:
            missing_age.append((p, fe))
        team = (p.get("current_team") or "").strip()
        if age is not None and age >= STALE_AGE and team and mv <= DEFAULT_MV:
            stale_team.append((p, fe, age))
        if team:
            if resolve_badge(team) is None:
                missing_badge_players.append((p, fe))
                unresolved_teams[team] = unresolved_teams.get(team, 0) + 1

    def top_examples(rows, n=10):
        rows = sorted(rows, key=lambda r: -r[1].get("fame_score", 0))[:n]
        out = []
        for r in rows:
            p, fe = r[0], r[1]
            out.append({
                "id": p["id"],
                "name": p["name"],
                "fame_score": fe.get("fame_score"),
                "current_team": p.get("current_team"),
                "market_value": p.get("market_value"),
            })
        return out

    report = {
        "generated_for_reference_year": common.REFERENCE_YEAR,
        "thresholds": {
            "gameplay_fame_min": FAME_GAMEPLAY,
            "high_fame_min": FAME_HIGH,
            "default_market_value": DEFAULT_MV,
            "stale_age_min": STALE_AGE,
        },
        "counts": {
            "players_db_total": len(players),
            "fame_scores_total": len(fame_scores),
            "gameplay_relevant_players": total,
            "default_market_value": len(default_mv),
            "zero_market_value": len(zero_mv),
            "default_or_zero_market_value": len(
                {p["id"] for p, _ in default_mv} | {p["id"] for p, _ in zero_mv}
            ),
            "missing_age": len(missing_age),
            "stale_team_suspect": len(stale_team),
            "missing_badge": len(missing_badge_players),
            "distinct_unresolved_teams": len(unresolved_teams),
            "high_fame_without_players_db_match": len(unmatched_high),
        },
        "examples": {
            "default_market_value": top_examples(default_mv),
            "stale_team_suspect": top_examples(
                [(p, fe) for p, fe, _ in stale_team]
            ),
            "missing_age": top_examples(missing_age),
            "missing_badge": top_examples(missing_badge_players),
        },
        "top_unresolved_teams": sorted(
            unresolved_teams.items(), key=lambda kv: -kv[1]
        )[:30],
        "high_fame_without_match_examples": [
            {"name": e["name"], "fame_score": e["fame_score"]}
            for e in sorted(
                unmatched_high, key=lambda e: -e.get("fame_score", 0)
            )[:20]
        ],
    }

    out_path = os.path.join(common.DATA_DIR, "staleness_report.json")
    common.dump_json(out_path, report)

    c = report["counts"]
    print("=" * 64)
    print("PLAYER DATA STALENESS REPORT (reference year %d)" % common.REFERENCE_YEAR)
    print("=" * 64)
    print("players_db total ................. %d" % c["players_db_total"])
    print("fame_scores total ................ %d" % c["fame_scores_total"])
    print("gameplay-relevant (fame>=%d) ..... %d" % (FAME_GAMEPLAY, total))
    print("-" * 64)
    print("with DEFAULT market value (1M) ... %d (%.1f%%)"
          % (c["default_market_value"], 100.0 * c["default_market_value"] / max(total, 1)))
    print("with ZERO market value ........... %d" % c["zero_market_value"])
    print("default-or-zero market value ..... %d (%.1f%%)"
          % (c["default_or_zero_market_value"],
             100.0 * c["default_or_zero_market_value"] / max(total, 1)))
    print("missing age (no DOB) ............. %d" % c["missing_age"])
    print("stale-team suspects (age>=%d) .... %d" % (STALE_AGE, c["stale_team_suspect"]))
    print("missing team badge (heuristic) ... %d across %d distinct teams"
          % (c["missing_badge"], c["distinct_unresolved_teams"]))
    print("-" * 64)
    print("high-fame (>=%d) w/o players_db match: %d"
          % (FAME_HIGH, c["high_fame_without_players_db_match"]))
    print("=" * 64)
    print("wrote %s" % out_path)


if __name__ == "__main__":
    main()
