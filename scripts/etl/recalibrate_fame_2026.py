#!/usr/bin/env python3
"""Recalibrate fame_by_id.json with REAL Wikipedia pageviews (July 2026).

The original wikipedia_pageviews inputs were hand-tuned estimates for ~200
famous players (see generate_popularity_metrics.js KNOWN_PLAYERS) and
heuristics for the rest. This replaces the wiki component with measured
12-month per-article pageviews (pool_pageviews.json, passes 1-3: exact-title
resolution, footballer-description check) for every player where the fetch
resolved, recomputes fame_score with the SAME formula as
calculate_fame_scores.js, and re-assigns percentile difficulty tiers.

MANUAL_FAME_OVERRIDES ids from build_fame_by_id.py are preserved untouched.

Writes the PROPOSED map + churn report to the scratchpad; --land copies the
proposal onto data/fame_by_id.json (only run after the churn is approved).
stdlib only.
"""
import json
import math
import os
import sys

DATA = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data"))
SCRATCH = ("/private/tmp/claude-501/-Users-jasur-workspace-football/"
           "622f5dd0-aced-4c1e-af52-4c947b59a401/scratchpad")
PV_PATH = os.path.join(SCRATCH, "audit_out", "pool_pageviews.json")
PROPOSED = os.path.join(SCRATCH, "audit_out", "fame_by_id_proposed.json")
REPORT = os.path.join(SCRATCH, "audit_out", "fame_churn_report.json")
POOL_MIN = 55.0
# keep in sync with build_fame_by_id.py MANUAL_FAME_OVERRIDES
OVERRIDE_IDS = {"146660", "203655", "914562", "845654", "670681", "607854",
                "50057", "646658"}

TIERS = [("Beginner", 0.00, 0.01), ("Amateur", 0.01, 0.05),
         ("Semi-Pro", 0.05, 0.15), ("Professional", 0.15, 0.40),
         ("World Class", 0.40, 0.70), ("Legendary", 0.70, 0.999),
         ("Ultimate", 0.999, 1.0)]


def log_scale(value, lo, hi):
    if value is None or value <= 0:
        return 0.0
    lv = math.log10(value + 1)
    lmin = math.log10(max(lo, 1))
    lmax = math.log10(max(hi, 2))
    return max(0.0, min(100.0, (lv - lmin) / (lmax - lmin) * 100))


def fame_score(entry, pageviews, modern):
    wiki = log_scale(pageviews, 50, 3_500_000)
    if modern:
        s = (wiki * 0.40 + (entry.get("peak_game_rating") or 0) * 0.30
             + log_scale(entry.get("elite_exposure"), 1, 250) * 0.15
             + log_scale(entry.get("peak_valuation"), 100_000, 250_000_000) * 0.15)
    else:
        s = wiki * 0.50 + log_scale(entry.get("elite_exposure"), 1, 250) * 0.50
    return max(0.0, min(100.0, round(s, 2)))


def main():
    fame = json.load(open(os.path.join(DATA, "fame_by_id.json")))
    pv = json.load(open(PV_PATH))
    db = {str(p["id"]): p for p in json.load(open(os.path.join(DATA, "players_db_v1.json")))}
    careers = json.load(open(os.path.join(DATA, "career_paths.json")))
    career_last = {}
    for c in careers:
        yrs = [st.get("to") or st.get("from") for st in (c.get("career") or [])
               if isinstance(st.get("to") or st.get("from"), int)]
        if yrs and c.get("name"):
            career_last[c["name"].lower()] = max(yrs)

    def is_modern(pid, entry):
        p = db.get(pid) or {}
        ry = p.get("retired_year")
        if isinstance(ry, int):
            return ry >= 2005
        last = career_last.get((entry.get("name") or "").lower())
        if last is not None:
            return last >= 2005
        return True  # same default as calculate_fame_scores.js

    proposed = {}
    changed = []
    for pid, entry in fame.items():
        new = dict(entry)
        if pid not in OVERRIDE_IDS:
            v = pv.get(pid)
            if v and v.get("confidence") == "resolved" and v.get("pageviews_12mo") is not None:
                views = v["pageviews_12mo"]
                new["wikipedia_pageviews"] = views
                new["fame_score"] = fame_score(entry, views, is_modern(pid, entry))
                if abs(new["fame_score"] - entry["fame_score"]) > 0.005:
                    changed.append((pid, entry["fame_score"], new["fame_score"], entry["name"]))
        proposed[pid] = new

    # percentile re-tiering over the full map (overrides keep their tier)
    order = sorted(proposed.items(), key=lambda kv: -kv[1]["fame_score"])
    n = len(order)
    for tier, lo, hi in TIERS:
        for i in range(int(n * lo), int(n * hi) if hi < 1 else n):
            pid, e = order[i]
            if pid not in OVERRIDE_IDS:
                e["difficulty_tier"] = tier

    old_pool = {k for k, v in fame.items() if v["fame_score"] >= POOL_MIN}
    new_pool = {k for k, v in proposed.items() if v["fame_score"] >= POOL_MIN}
    entering = sorted(new_pool - old_pool, key=lambda k: -proposed[k]["fame_score"])
    leaving = sorted(old_pool - new_pool, key=lambda k: -fame[k]["fame_score"])
    movers = sorted(changed, key=lambda c: -abs(c[2] - c[1]))[:25]

    report = {
        "rescored_players": len(changed),
        "pool_before": len(old_pool), "pool_after": len(new_pool),
        "entering_pool": [{"id": k, "name": proposed[k]["name"],
                           "old": fame[k]["fame_score"], "new": proposed[k]["fame_score"]}
                          for k in entering],
        "leaving_pool": [{"id": k, "name": fame[k]["name"],
                          "old": fame[k]["fame_score"], "new": proposed[k]["fame_score"]}
                         for k in leaving],
        "biggest_movers": [{"id": p, "name": nm, "old": o, "new": n2} for p, o, n2, nm in movers],
        "tier_distribution_after": {},
    }
    for _, e in proposed.items():
        t = e["difficulty_tier"]
        report["tier_distribution_after"][t] = report["tier_distribution_after"].get(t, 0) + 1

    json.dump(proposed, open(PROPOSED, "w"), ensure_ascii=False, indent=0)
    json.dump(report, open(REPORT, "w"), ensure_ascii=False, indent=1)
    print(f"rescored {len(changed)} players | pool {len(old_pool)} -> {len(new_pool)} "
          f"(+{len(entering)} / -{len(leaving)})")
    print(f"proposal: {PROPOSED}\nreport:   {REPORT}")

    if "--land" in sys.argv:
        json.dump(proposed, open(os.path.join(DATA, "fame_by_id.json"), "w"),
                  ensure_ascii=False, indent=0)
        print("LANDED onto data/fame_by_id.json")


if __name__ == "__main__":
    main()
