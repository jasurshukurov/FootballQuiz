#!/usr/bin/env python3
"""
apply_summer2026_refresh.py -- web-verified summer-2026 player-data refresh.

Applies three batches from the audit (all facts web-verified July 2026):

  BATCH A  summer-2026 transfers: update players_db current_team/market_value/
           status for moved players, add two missing players_db rows (Quenda,
           Kokcu), fix Luis Suarez, and append the missing legs to transfers.json
           so both files stay consistent.
  BATCH B  retirements: status='retired', retired_year=2026, market_value=0.
  BATCH C  duplicate-person merges (delete namesake/legend-dup rows; keep the
           canonical single-name row that fame_scores joins to) + Cafu
           nationality fix. Fame reassignment/bumps are handled separately in
           build_fame_by_id.py.

current_team strings are the EXACT official strings already used elsewhere in
players_db (Grid indexes them verbatim); new club Besiktas uses its official
full name (no existing DB row). Backs up every file it writes with the existing
timestamped _backup convention. Idempotent by id.

Run:  python3 scripts/etl/apply_summer2026_refresh.py
"""
import datetime
import json
import os
import shutil

DATA = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data"))


def path(name):
    return os.path.join(DATA, name)


def load(name):
    with open(path(name), encoding="utf-8") as fh:
        return json.load(fh)


def dump(name, obj):
    with open(path(name), "w", encoding="utf-8") as fh:
        json.dump(obj, fh, ensure_ascii=False, indent=2)


def backup(name):
    ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    stem, ext = os.path.splitext(name)
    dst = path("%s_backup_%s%s" % (stem, ts, ext))
    shutil.copy(path(name), dst)
    return os.path.basename(dst)


# ---------------------------------------------------------------------------
# BATCH A -- players_db field updates for moved players (id -> changes)
# market_value is a defensible mid-2026 Transfermarkt-style valuation.
# ---------------------------------------------------------------------------
BATCH_A_UPDATE = {
    397033: {"current_team": "Tottenham Hotspur Football Club", "market_value": 70000000, "status": "active"},   # Tonali Newcastle->Spurs
    567576: {"current_team": "Manchester City Football Club", "market_value": 75000000, "status": "active"},     # Elliot Anderson Forest->City
    284857: {"current_team": "Real Madrid Club de Fútbol", "league": "La Liga", "market_value": 55000000, "status": "active"},  # Cucurella Chelsea->Real Madrid
    743600: {"current_team": "Manchester United Football Club", "market_value": 45000000, "status": "active"},   # Andrey Santos Chelsea->Man Utd
    880245: {"current_team": "Tottenham Hotspur Football Club", "market_value": 55000000, "status": "active"},   # Mateus Fernandes West Ham->Spurs
    895937: {"current_team": "Chelsea Football Club", "league": "Premier League", "market_value": 42000000, "status": "active"},  # Palestra (Atalanta, loan Cagliari)->Chelsea
    576314: {"current_team": "Tottenham Hotspur Football Club", "market_value": 38000000, "status": "active"},   # van Hecke Brighton->Spurs (verified)
    44352:  {"current_team": "Inter Miami", "market_value": 3000000, "status": "active"},                        # Luis Suarez -> Inter Miami (age 39)
}

# New players_db rows (ids are the players' real Transfermarkt ids).
BATCH_A_NEW = [
    {
        "id": 1138758, "name": "Geovany Quenda", "normalized_name": "geovany quenda",
        "nationality": "Portugal", "current_team": "Chelsea Football Club",
        "league": "Premier League", "position": "Attack", "market_value": 40000000,
        "image_url": "", "image_source": "", "status": "active", "retired_year": None,
    },
    {
        "id": 454567, "name": "Orkun Kökçü", "normalized_name": "orkun kokcu",
        "nationality": "Türkiye", "current_team": "Beşiktaş Jimnastik Kulübü",
        "league": "", "position": "Midfield", "market_value": 25000000,
        "image_url": "", "image_source": "", "status": "active", "retired_year": None,
    },
]

# ---------------------------------------------------------------------------
# BATCH B -- retirements (all web-verified 2026). id -> True
# ---------------------------------------------------------------------------
BATCH_B_RETIRE = {
    50057: "Aaron Ramsey (Wales)",       # NOT 646658 (young England namesake)
    85314: "Oscar",
    3333:  "James Milner",
    14086: "Ashley Young",               # last club Ipswich (row shows Everton - stale)
    30690: "Sergio Romero",              # last club Argentinos Jrs (row Boca - stale)
    37647: "Dimitri Payet",              # last club Vasco (row Marseille - stale)
    47713: "Mamadou Sakho",              # last club Torpedo Kutaisi (row Montpellier - stale)
    57280: "Giacomo Bonaventura",        # last club Al-Shabab (row Fiorentina - stale)
}

# ---------------------------------------------------------------------------
# BATCH C -- duplicate merges: delete these rows, keep the canonical one.
# ---------------------------------------------------------------------------
BATCH_C_DELETE = {
    1600008: "Xavi Hernandez legend-dup (keep 7607 'Xavi')",
    1600023: "Alisson Becker legend-dup (keep 105470 'Alisson')",
}
BATCH_C_FIELD = {
    203655: {"nationality": "Portugal"},  # Cafu (Carlos Miguel Ribeiro Dias) - was null
}


def apply_players():
    players = load("players_db_v1.json")
    ages = load("player_ages.json")
    att = load("image_attributions.json")
    by_id = {p["id"]: p for p in players}
    changes = []

    # Batch A updates
    for pid, upd in BATCH_A_UPDATE.items():
        p = by_id.get(pid)
        if not p:
            changes.append(("A", pid, "MISSING", "row not found"))
            continue
        for k, v in upd.items():
            old = p.get(k)
            if old != v:
                changes.append(("A", pid, "%s.%s" % (p["name"], k), "%r -> %r" % (old, v)))
            p[k] = v
        p.setdefault("retired_year", None)

    # Batch A new rows
    for row in BATCH_A_NEW:
        if row["id"] in by_id:
            changes.append(("A", row["id"], "%s" % row["name"], "already present, skipped"))
            continue
        players.append(row)
        by_id[row["id"]] = row
        changes.append(("A", row["id"], "%s" % row["name"], "NEW row (%s, %s)" % (row["current_team"], row["nationality"])))

    # Batch B retirements
    for pid, label in BATCH_B_RETIRE.items():
        p = by_id.get(pid)
        if not p:
            changes.append(("B", pid, "MISSING", "%s not found" % label))
            continue
        for k, v in (("status", "retired"), ("retired_year", 2026), ("market_value", 0)):
            old = p.get(k)
            if old != v:
                changes.append(("B", pid, "%s.%s" % (p["name"], k), "%r -> %r" % (old, v)))
            p[k] = v

    # Batch C field fixes
    for pid, upd in BATCH_C_FIELD.items():
        p = by_id.get(pid)
        if not p:
            continue
        for k, v in upd.items():
            old = p.get(k)
            if old != v:
                changes.append(("C", pid, "%s.%s" % (p["name"], k), "%r -> %r" % (old, v)))
            p[k] = v

    # Batch C deletes (+ prune ages / attributions like merge_duplicates.py)
    del_ids = set(BATCH_C_DELETE)
    present = [pid for pid in del_ids if pid in by_id]
    for pid in del_ids:
        changes.append(("C", pid, "DELETE", BATCH_C_DELETE[pid] + ("" if pid in by_id else " [already gone]")))
    players = [p for p in players if p["id"] not in del_ids]
    for pid in del_ids:
        ages.pop(str(pid), None)
        att.pop(str(pid), None)

    if changes:
        b1 = backup("players_db_v1.json")
        b2 = backup("player_ages.json")
        b3 = backup("image_attributions.json")
        dump("players_db_v1.json", players)
        dump("player_ages.json", ages)
        dump("image_attributions.json", att)
        print("players_db backup ->", b1)
        print("player_ages backup ->", b2)
        print("image_attributions backup ->", b3)
    print("players_db rows now:", len(players), "(deleted %d)" % len(present))
    return changes


def apply_transfers():
    t = load("transfers.json")
    by_id = {p["player_id"]: p for p in t}
    changes = []

    def set_left(pid, club_name, date):
        for tr in by_id[pid]["transfers"]:
            if tr["club_name"] == club_name and tr["date_left"] is None:
                if tr["date_left"] != date:
                    changes.append((pid, "close %s" % club_name, "date_left -> %s" % date))
                    tr["date_left"] = date
                return

    def append_leg(pid, leg):
        legs = by_id[pid]["transfers"]
        if any(x["club_name"] == leg["club_name"] and x["date_joined"] == leg["date_joined"] for x in legs):
            return  # idempotent
        legs.append(leg)
        changes.append((pid, "add leg", "%s %s fee %s" % (leg["club_name"], leg["date_joined"], leg["fee"])))

    # Tonali (212): Newcastle -> Tottenham (£100m ~= €116m)
    if 212 in by_id:
        set_left(212, "Newcastle United", "2026-07-01")
        append_leg(212, {"club_name": "Tottenham Hotspur", "club_id": "tottenham-hotspur",
                         "date_joined": "2026-07-01", "date_left": None, "fee": "€116m"})
    # Cucurella (376): Chelsea -> Real Madrid (€60m)
    if 376 in by_id:
        set_left(376, "Chelsea", "2026-06-15")
        append_leg(376, {"club_name": "Real Madrid", "club_id": "real-madrid",
                         "date_joined": "2026-06-15", "date_left": None, "fee": "€60m"})
    # Luis Suarez (69): Atletico(left 2022) -> Nacional -> Gremio -> Inter Miami
    if 69 in by_id:
        for leg in [
            {"club_name": "Nacional", "club_id": "nacional",
             "date_joined": "2022-07-01", "date_left": "2022-12-31", "fee": "Free"},
            {"club_name": "Gremio", "club_id": "gremio",
             "date_joined": "2023-01-01", "date_left": "2023-12-31", "fee": "Free"},
            {"club_name": "Inter Miami CF", "club_id": "inter-miami",
             "date_joined": "2024-01-01", "date_left": None, "fee": "Free"},
        ]:
            append_leg(69, leg)

    if changes:
        b = backup("transfers.json")
        dump("transfers.json", t)
        print("transfers backup ->", b)
    return changes


def main():
    print("=" * 70)
    print("SUMMER-2026 REFRESH")
    print("=" * 70)
    pc = apply_players()
    print("-" * 70)
    print("players_db / ages / attributions changes:")
    for batch, pid, field, detail in pc:
        print("  [%s] %-8s %-28s %s" % (batch, pid, field, detail))
    tc = apply_transfers()
    print("-" * 70)
    print("transfers.json changes:")
    for pid, field, detail in tc:
        print("  [%s] %-12s %s" % (pid, field, detail))
    print("=" * 70)


if __name__ == "__main__":
    main()
