#!/usr/bin/env python3
"""
audit_db.py -- Internal-consistency auditor for the football player database.

Read-only. Loads the data files under data/ and reports:
  A1. Duplicate players (same normalized name, diacritic-stripped near-dupes,
      and a hand-curated list of known merge candidates). Flags whether both
      copies fall inside the fame>=55 guessable pool (visible in autocomplete).
  A2. Cross-file contradictions (players_db vs career_paths vs transfers):
      nationality mismatches, position-vocabulary mismatches, retired last-club
      disagreements, missing ages in the pool, market_value sanity vs status.
  A3. Sanity checks (market value ranges, retired_year ranges, status/retired
      coherence, league vocabulary, rare current_team strings / possible typos).
  A4. Image-license coverage & IP-free compliance.

Usage:  python3 scripts/etl/audit_db.py            # human summary
        python3 scripts/etl/audit_db.py --json     # machine-readable dump

Stdlib only. Does not modify any data file.
"""
import json
import os
import sys
import re
import unicodedata
from collections import Counter, defaultdict

DATA = os.path.join(os.path.dirname(__file__), "..", "..", "data")
DATA = os.path.abspath(DATA)

FAME_THRESHOLD = 55.0

# --- known merge candidates flagged in earlier work (same real person) --------
KNOWN_DUP_GROUPS = [
    ("Rodri", [8163, 357565]),
    ("Danilo", [32816, 145707, 808509]),
    ("Ladislav Krejci", [140206, 345911]),
    ("Marquinhos", [181767, 668268]),
    ("Asencio", [340260, 935245]),
    ("Javi Guerra", [46215, 834764]),
]

# league vocabulary considered "known" (big-5 + a handful of legit smaller ones)
KNOWN_LEAGUES = {
    "Serie A", "La Liga", "Ligue 1", "Premier League", "Bundesliga",
    "Russian Premier League", "Super League Greece", "Belgian Pro League",
    "Primeira Liga", "Danish Superliga", "",
}

# players_db position vocabulary
DB_POSITIONS = {"Defender", "Midfield", "Attack", "Goalkeeper", "Missing"}

IP_FREE_LICENSES = {"pd", "cc0", "cc by", "cc by-sa"}


def load(name):
    with open(os.path.join(DATA, name), encoding="utf-8") as fh:
        return json.load(fh)


def strip_diacritics(s):
    if not s:
        return ""
    nfkd = unicodedata.normalize("NFKD", s)
    out = "".join(c for c in nfkd if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9 ]", "", out.lower()).strip()


def canonical_license(lic):
    """Reduce a license string to a family key for the IP-free check.

    Handles: cc0 / public domain / pdm (public-domain family), version numbers
    (cc by-sa 4.0), and jurisdiction ports (cc by-sa 3.0 de / at / es / ...).
    """
    if not lic:
        return ""
    s = lic.strip().lower()
    if s in ("cc0", "public domain") or s.startswith("pdm"):
        return "cc0" if s == "cc0" else "pd"
    # strip trailing 2-letter jurisdiction port (de, at, es, ch, nl, br, ...)
    s = re.sub(r"\s+[a-z]{2}$", "", s)
    # strip trailing version number e.g. "cc by-sa 4.0" -> "cc by-sa"
    s = re.sub(r"\s+\d+(\.\d+)?$", "", s)
    return s.strip()


def main():
    players = load("players_db_v1.json")
    ages = load("player_ages.json")
    fame = load("fame_scores.json")
    careers = load("career_paths.json")
    transfers = load("transfers.json")
    matches = load("matches_db.json")
    attributions = load("image_attributions.json")

    report = {}

    # ------------------------------------------------------------------ fame pool
    # fame links to players by lowercased name (see lib/dailyPuzzle.ts).
    fame_by_name = {}
    for f in fame:
        nm = f["name"].lower()
        # keep the max score if a name appears twice in fame_scores
        if nm not in fame_by_name or f["fame_score"] > fame_by_name[nm]:
            fame_by_name[nm] = f["fame_score"]

    def player_fame(p):
        return fame_by_name.get(p["name"].lower())

    def in_pool(p):
        s = player_fame(p)
        return s is not None and s >= FAME_THRESHOLD

    pool = [p for p in players if in_pool(p)]
    report["pool_size"] = len(pool)

    by_id = {p["id"]: p for p in players}

    # ============================================================== A1 DUPLICATES
    dup = {"exact_normalized": [], "diacritic_near": [], "known_groups": []}

    # exact normalized_name collisions
    by_norm = defaultdict(list)
    for p in players:
        by_norm[p.get("normalized_name", "").strip().lower()].append(p)
    def same_club(rows):
        """True if all rows share the same club (after normalizing name variants
        via substring match on diacritic-stripped strings). Same club => almost
        certainly the same real person duplicated; different clubs => likely
        distinct people who share a name (a fame false-positive, not a dupe)."""
        strips = [strip_diacritics(r["current_team"]) for r in rows]
        base = strips[0]
        for s in strips[1:]:
            if not s or not base:
                return False
            if not (s in base or base in s):
                return False
        return True

    for norm, rows in by_norm.items():
        if norm and len(rows) > 1:
            in_pool_rows = [r for r in rows if in_pool(r)]
            dup["exact_normalized"].append({
                "key": norm,
                "ids": [r["id"] for r in rows],
                "names": [r["name"] for r in rows],
                "teams": [r["current_team"] for r in rows],
                "both_in_pool": len(in_pool_rows) >= 2,
                "in_pool_ids": [r["id"] for r in in_pool_rows],
                "same_club": same_club(rows),
                "same_club_in_pool": len(in_pool_rows) >= 2 and same_club(in_pool_rows),
                "mvs": [r["market_value"] for r in rows],
            })

    # diacritic-stripped near-dupes that are NOT already exact-normalized dupes
    by_strip = defaultdict(list)
    for p in players:
        by_strip[strip_diacritics(p["name"])].append(p)
    for key, rows in by_strip.items():
        if not key or len(rows) < 2:
            continue
        norms = {r.get("normalized_name", "").strip().lower() for r in rows}
        if len(norms) == 1:
            continue  # already caught by exact_normalized
        dup["diacritic_near"].append({
            "key": key,
            "ids": [r["id"] for r in rows],
            "names": [r["name"] for r in rows],
            "teams": [r["current_team"] for r in rows],
            "nationalities": [r["nationality"] for r in rows],
            "in_pool_ids": [r["id"] for r in rows if in_pool(r)],
            "both_in_pool": sum(1 for r in rows if in_pool(r)) >= 2,
        })

    # token-set near-dupes: same words in any order (e.g. "Son Heung-min" vs
    # "Heung-min Son") that the exact/diacritic checks miss.
    dup["token_set"] = []
    by_tok = defaultdict(list)
    for p in players:
        key = " ".join(sorted(strip_diacritics(p["name"]).split()))
        if key:
            by_tok[key].append(p)
    for key, rows in by_tok.items():
        if len(rows) < 2:
            continue
        norms = {r.get("normalized_name", "").strip().lower() for r in rows}
        strips = {strip_diacritics(r["name"]) for r in rows}
        if len(strips) == 1:
            continue  # already caught by exact/diacritic checks
        dup["token_set"].append({
            "key": key,
            "ids": [r["id"] for r in rows],
            "names": [r["name"] for r in rows],
            "teams": [r["current_team"] for r in rows],
            "in_pool_ids": [r["id"] for r in rows if in_pool(r)],
            "both_in_pool": sum(1 for r in rows if in_pool(r)) >= 2,
        })

    # known hand-curated groups
    for label, ids in KNOWN_DUP_GROUPS:
        present = [i for i in ids if i in by_id]
        dup["known_groups"].append({
            "label": label,
            "ids": ids,
            "present_ids": present,
            "rows": [{
                "id": i,
                "name": by_id[i]["name"],
                "team": by_id[i]["current_team"],
                "nat": by_id[i]["nationality"],
                "fame": player_fame(by_id[i]),
                "in_pool": in_pool(by_id[i]),
                "mv": by_id[i]["market_value"],
            } for i in present],
            "in_pool_ids": [i for i in present if in_pool(by_id[i])],
        })
    report["duplicates"] = dup

    # ========================================================= A2 CROSS-FILE
    cross = {"nationality_mismatch": [], "position_mismatch": [],
             "retired_lastclub_mismatch": [], "pool_missing_age": [],
             "retired_nonzero_mv": [], "active_zero_mv": []}

    # index career_paths / transfers by normalized name
    def norm_key(name, explicit=None):
        return (explicit or "").strip().lower() or name.strip().lower()

    career_by_norm = {}
    for c in careers:
        career_by_norm[norm_key(c["name"], c.get("normalized_name"))] = c
    transfers_by_norm = {}
    for t in transfers:
        transfers_by_norm[t["player_name"].strip().lower()] = t

    # career_paths position vocab differs; map to DB families for comparison
    POS_FAMILY = {
        "goalkeeper": "Goalkeeper", "keeper": "Goalkeeper",
        "defender": "Defender", "defence": "Defender", "back": "Defender",
        "midfield": "Midfield", "midfielder": "Midfield",
        "attack": "Attack", "forward": "Attack", "striker": "Attack", "winger": "Attack",
    }

    def pos_family(pos):
        if not pos:
            return None
        p = pos.lower()
        for k, v in POS_FAMILY.items():
            if k in p:
                return v
        return None

    for p in players:
        nk = p["normalized_name"].strip().lower()
        c = career_by_norm.get(nk)
        if c:
            # nationality
            if c.get("nationality") and p.get("nationality") and \
               strip_diacritics(c["nationality"]) != strip_diacritics(p["nationality"]):
                cross["nationality_mismatch"].append({
                    "id": p["id"], "name": p["name"], "source": "career_paths",
                    "players_db": p["nationality"], "other": c["nationality"],
                    "in_pool": in_pool(p),
                })
            # position family
            pf_db = pos_family(p.get("position"))
            pf_c = pos_family(c.get("position"))
            if pf_db and pf_c and pf_db != pf_c:
                cross["position_mismatch"].append({
                    "id": p["id"], "name": p["name"],
                    "players_db": p.get("position"), "career_paths": c.get("position"),
                    "in_pool": in_pool(p),
                })
            # retired last-club disagreement
            if p.get("status") == "retired" and c.get("career"):
                last = c["career"][-1].get("club", "")
                if last and p.get("current_team"):
                    if strip_diacritics(last) not in strip_diacritics(p["current_team"]) and \
                       strip_diacritics(p["current_team"]) not in strip_diacritics(last):
                        cross["retired_lastclub_mismatch"].append({
                            "id": p["id"], "name": p["name"],
                            "players_db_team": p["current_team"],
                            "career_last_club": last,
                        })

    # ages missing in pool
    for p in pool:
        if str(p["id"]) not in ages:
            cross["pool_missing_age"].append({
                "id": p["id"], "name": p["name"], "fame": player_fame(p),
                "status": p.get("status"),
            })

    # market value vs status
    for p in players:
        st = p.get("status")
        mv = p.get("market_value", 0)
        if st == "retired" and mv not in (0, None):
            cross["retired_nonzero_mv"].append({
                "id": p["id"], "name": p["name"], "mv": mv,
                "retired_year": p.get("retired_year"),
            })
        if st == "active" and (mv == 0 or mv is None):
            cross["active_zero_mv"].append({
                "id": p["id"], "name": p["name"], "in_pool": in_pool(p),
            })
    report["cross_file"] = cross

    # ============================================================== A3 SANITY
    sanity = {"mv_out_of_range": [], "retired_year_bad": [],
              "status_active_but_retired_year": [], "unknown_league": [],
              "rare_team": [], "missing_position": []}

    for p in players:
        mv = p.get("market_value", 0) or 0
        if mv > 200_000_000 or mv < 0:
            sanity["mv_out_of_range"].append(
                {"id": p["id"], "name": p["name"], "mv": mv})
        ry = p.get("retired_year")
        if ry is not None and (ry > 2026 or ry < 1950):
            sanity["retired_year_bad"].append(
                {"id": p["id"], "name": p["name"], "retired_year": ry})
        if p.get("status") == "active" and ry is not None:
            sanity["status_active_but_retired_year"].append(
                {"id": p["id"], "name": p["name"], "retired_year": ry})
        if p.get("league") not in KNOWN_LEAGUES:
            sanity["unknown_league"].append(
                {"id": p["id"], "name": p["name"], "league": p.get("league")})
        if p.get("position") not in DB_POSITIONS:
            sanity["missing_position"].append(
                {"id": p["id"], "name": p["name"], "position": p.get("position")})

    # rare current_team strings (appear exactly once) -> likely typos
    team_counts = Counter(p["current_team"] for p in players)
    singletons = sorted([t for t, n in team_counts.items() if n == 1 and t])
    # surface the ones that also look odd (short, or near-duplicate of a common team)
    common_teams = {t for t, n in team_counts.items() if n >= 5}
    common_strip = {strip_diacritics(t): t for t in common_teams}
    suspicious = []
    for t in singletons:
        st = strip_diacritics(t)
        near = None
        for cs, orig in common_strip.items():
            if st != cs and (st in cs or cs in st) and abs(len(st) - len(cs)) <= 4:
                near = orig
                break
        suspicious.append({"team": t, "near_common": near,
                           "players": [p["name"] for p in players
                                       if p["current_team"] == t][:3]})
    sanity["rare_team_count"] = len(singletons)
    sanity["rare_team"] = sorted(suspicious,
                                 key=lambda x: (x["near_common"] is None))[:20]
    report["sanity"] = sanity

    # ============================================================== A4 IMAGES
    img = {"missing_attribution": [], "bad_license": [], "license_families": {}}
    lic_counter = Counter()
    for p in players:
        url = p.get("image_url", "")
        if not url:
            continue
        att = attributions.get(str(p["id"]))
        if not att:
            img["missing_attribution"].append(
                {"id": p["id"], "name": p["name"], "in_pool": in_pool(p)})
            continue
        fam = canonical_license(att.get("license", ""))
        lic_counter[fam] += 1
        if fam not in IP_FREE_LICENSES:
            img["bad_license"].append({
                "id": p["id"], "name": p["name"],
                "license": att.get("license"), "family": fam,
                "in_pool": in_pool(p),
            })
    img["license_families"] = dict(lic_counter)
    img["players_with_image"] = sum(1 for p in players if p.get("image_url"))
    report["images"] = img

    # ------------------------------------------------------------------ counts
    report["counts"] = {
        "players": len(players),
        "pool_fame_ge_55": len(pool),
        "career_paths": len(careers),
        "transfers": len(transfers),
        "matches": len(matches),
        "attributions": len(attributions),
        "ages": len(ages),
        "exact_dupe_groups": len(dup["exact_normalized"]),
        "exact_dupe_visible_in_pool": sum(1 for d in dup["exact_normalized"] if d["both_in_pool"]),
        "exact_dupe_sameclub_in_pool": sum(1 for d in dup["exact_normalized"] if d["same_club_in_pool"]),
        "token_set_groups": len(dup["token_set"]),
        "diacritic_near_groups": len(dup["diacritic_near"]),
        "diacritic_near_visible_in_pool": sum(1 for d in dup["diacritic_near"] if d["both_in_pool"]),
        "nationality_mismatch": len(cross["nationality_mismatch"]),
        "position_mismatch": len(cross["position_mismatch"]),
        "retired_lastclub_mismatch": len(cross["retired_lastclub_mismatch"]),
        "pool_missing_age": len(cross["pool_missing_age"]),
        "retired_nonzero_mv": len(cross["retired_nonzero_mv"]),
        "active_zero_mv": len(cross["active_zero_mv"]),
        "mv_out_of_range": len(sanity["mv_out_of_range"]),
        "retired_year_bad": len(sanity["retired_year_bad"]),
        "status_active_but_retired_year": len(sanity["status_active_but_retired_year"]),
        "unknown_league": len(sanity["unknown_league"]),
        "missing_position": len(sanity["missing_position"]),
        "rare_team_singletons": sanity["rare_team_count"],
        "missing_attribution": len(img["missing_attribution"]),
        "bad_license": len(img["bad_license"]),
    }

    if "--json" in sys.argv:
        json.dump(report, sys.stdout, ensure_ascii=False, indent=1)
        return

    # ------------------------------------------------------------------ pretty
    c = report["counts"]
    print("=" * 70)
    print("PLAYER DB AUDIT  (read-only)")
    print("=" * 70)
    for k, v in c.items():
        print(f"  {k:34s} {v}")

    def section(title):
        print("\n" + "-" * 70 + f"\n{title}\n" + "-" * 70)

    section("A1. EXACT normalized_name dupes -- SAME CLUB & both in pool (TRUE dupes)")
    for d in dup["exact_normalized"]:
        if d["same_club_in_pool"]:
            print(f"  {d['key']!r} ids={d['in_pool_ids']} team={d['teams'][0]!r} mvs={d['mvs']}")

    section("A1. EXACT normalized_name dupes -- both in pool but DIFFERENT clubs "
            "(likely distinct people / fame false-positive)")
    for d in dup["exact_normalized"]:
        if d["both_in_pool"] and not d["same_club_in_pool"]:
            print(f"  {d['key']!r} ids={d['in_pool_ids']} teams={d['teams']}")

    section("A1. TOKEN-SET (reversed word order) near-dupes")
    for d in dup["token_set"]:
        flag = "  <-- BOTH IN POOL" if d["both_in_pool"] else ""
        print(f"  {d['names']} ids={d['ids']} teams={d['teams']}{flag}")

    section("A1. DIACRITIC near-duplicate groups (different normalized names)")
    for d in dup["diacritic_near"]:
        flag = "  <-- BOTH IN POOL" if d["both_in_pool"] else ""
        print(f"  {d['key']!r} ids={d['ids']} names={d['names']} nat={d['nationalities']}{flag}")

    section("A1. KNOWN merge groups")
    for g in dup["known_groups"]:
        print(f"  {g['label']}: present ids {g['present_ids']}  in-pool {g['in_pool_ids']}")
        for r in g["rows"]:
            print(f"      id={r['id']} '{r['name']}' team={r['team']!r} nat={r['nat']} "
                  f"fame={r['fame']} pool={r['in_pool']} mv={r['mv']}")

    section("A2. Nationality mismatches (players_db vs career_paths)")
    for m in cross["nationality_mismatch"][:60]:
        print(f"  id={m['id']} {m['name']}: db={m['players_db']!r} vs career={m['other']!r} pool={m['in_pool']}")
    if len(cross["nationality_mismatch"]) > 60:
        print(f"  ... +{len(cross['nationality_mismatch'])-60} more")

    section("A2. Position family mismatches")
    for m in cross["position_mismatch"][:60]:
        print(f"  id={m['id']} {m['name']}: db={m['players_db']!r} vs career={m['career_paths']!r}")
    if len(cross["position_mismatch"]) > 60:
        print(f"  ... +{len(cross['position_mismatch'])-60} more")

    section("A2. Retired last-club disagreements")
    for m in cross["retired_lastclub_mismatch"]:
        print(f"  id={m['id']} {m['name']}: db={m['players_db_team']!r} vs career_last={m['career_last_club']!r}")

    section("A2. Pool players missing age")
    for m in cross["pool_missing_age"]:
        print(f"  id={m['id']} {m['name']} fame={m['fame']} status={m['status']}")

    section("A2. Retired players with non-zero market_value")
    for m in cross["retired_nonzero_mv"][:40]:
        print(f"  id={m['id']} {m['name']} mv={m['mv']} retired={m['retired_year']}")

    section("A2. Active players with zero market_value")
    for m in cross["active_zero_mv"][:40]:
        print(f"  id={m['id']} {m['name']} pool={m['in_pool']}")
    if len(cross["active_zero_mv"]) > 40:
        print(f"  ... +{len(cross['active_zero_mv'])-40} more")

    section("A3. Sanity flags")
    print(f"  mv_out_of_range: {sanity['mv_out_of_range']}")
    print(f"  retired_year_bad: {sanity['retired_year_bad']}")
    print(f"  status_active_but_retired_year: {sanity['status_active_but_retired_year']}")
    print(f"  missing_position: {sanity['missing_position']}")
    ul = Counter(x["league"] for x in sanity["unknown_league"])
    print(f"  unknown_league values: {dict(ul)}")
    print(f"  rare_team singletons: {sanity['rare_team_count']} (top suspicious below)")
    for s in sanity["rare_team"]:
        tag = f"  ~near {s['near_common']!r}" if s["near_common"] else ""
        print(f"      {s['team']!r} {s['players']}{tag}")

    section("A4. Images")
    print(f"  players with image_url: {img['players_with_image']}")
    print(f"  missing attribution: {len(img['missing_attribution'])}")
    print(f"  license families: {img['license_families']}")
    print(f"  bad (non IP-free) licenses: {len(img['bad_license'])}")
    for b in img["bad_license"][:40]:
        print(f"      id={b['id']} {b['name']} license={b['license']!r} pool={b['in_pool']}")
    if len(img["bad_license"]) > 40:
        print(f"  ... +{len(img['bad_license'])-40} more")


if __name__ == "__main__":
    main()
