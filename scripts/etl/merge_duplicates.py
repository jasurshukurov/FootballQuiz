#!/usr/bin/env python3
"""
merge_duplicates.py -- collapse verified duplicate player rows.

Resolves the 14 high-confidence duplicate groups + the Son token-set dupe
(item 1) and the 9 ambiguous groups (item 2, web-verified July 2026). For each
group we keep one canonical row (the real famous player, preferring a row that
already has an image-attribution entry and the correct position), apply any
field corrections, and delete the namesake / polluted duplicate rows. Marquinhos
is a genuine two-person case (PSG captain CB + the ex-Arsenal winger now at
Cruzeiro) -> KEEP BOTH, with the winger's row corrected to his real club.

Also prunes the deleted ids from player_ages.json and image_attributions.json.

Backs up players_db_v1.json first (existing backup naming convention).
Run:  python3 scripts/etl/merge_duplicates.py
"""
import json
import os
import shutil
import datetime

DATA = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data"))


def path(name):
    return os.path.join(DATA, name)


# --- resolution table -------------------------------------------------------
# ids to delete (namesake / polluted duplicate rows)
DELETE_IDS = [
    # item 1 - high-confidence single-person dupes
    8163,                    # rodri  (keep 357565, the Man City midfielder)
    32816, 145707,           # danilo (keep 808509, Botafogo midfielder)
    34370, 891091,           # diego lopez (keep 617081, Valencia winger)
    996897,                  # diego gomez (keep 45082)
    46215,                   # javi guerra (keep 834764, Valencia midfielder)
    57800,                   # roberto fernandez (keep 720518, Espanyol striker)
    277111,                  # jorginho (keep 102017)
    401529,                  # dodo (keep 109038)
    700646,                  # andre silva (keep 198008, Elche striker)
    472423,                  # reece james (keep 245585)
    935245,                  # raul asencio (keep 340260)
    1190411,                 # jesus rodriguez (keep 462380, Como winger)
    586853,                  # vitinha (keep 487469)
    1007378,                 # wesley (keep 964580, Roma right-back)
    1600012,                 # Son Heung-min legend dupe (keep 91845, LAFC)
    # item 2 - ambiguous groups, web-verified
    29424, 57229, 372670,    # paulinho x4 at America-MG (keep 428791, highest MV)
    42506, 400931,           # ibrahima diallo (keep 413032, the real ex-Southampton mid)
    44012,                   # david garcia (keep 298589, the Osasuna/Al-Rayyan CB)
    65278,                   # pedro (keep 432895, Zenit Brazilian forward)
    345911,                  # ladislav krejci (keep 140206, Wolves CB)
    323934,                  # matheus pereira (keep 225984, Cruzeiro AM)
    312314,                  # otavio (keep 818495, Al-Qadsiah/Portugal AM)
    477238,                  # sergio arribas (keep 537762, Almeria AM)
]

# field corrections on kept rows (id -> {field: value})
PATCHES = {
    340260: {"position": "Defender"},                 # Raul Asencio is a centre-back
    818495: {"position": "Midfield"},                 # Otavio is an attacking midfielder
    140206: {"position": "Defender", "market_value": 25000000},  # Krejci CB, correct MV
    298589: {"current_team": "Al-Rayyan SC"},         # David Garcia left Osasuna for Qatar
    413032: {"current_team": "Al-Ahli SC"},           # Ibrahima Diallo now in Qatar
    # keep-both: fix the ex-Arsenal winger Marquinhos to his real club
    668268: {"current_team": "Cruzeiro", "market_value": 8000000, "position": "Attack"},
}


def main():
    players = json.load(open(path("players_db_v1.json"), encoding="utf-8"))
    ages = json.load(open(path("player_ages.json"), encoding="utf-8"))
    att = json.load(open(path("image_attributions.json"), encoding="utf-8"))

    before = len(players)
    del_set = set(DELETE_IDS)
    present_by_id = {p["id"] for p in players}

    missing_deletes = [i for i in DELETE_IDS if i not in present_by_id]
    missing_keeps = [i for i in PATCHES if i not in present_by_id]
    if missing_deletes:
        print("WARN: delete ids not found (already merged?):", missing_deletes)
    if missing_keeps:
        print("WARN: patch ids not found:", missing_keeps)

    # backup players_db before writing
    ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup = path(f"players_db_v1_backup_{ts}.json")
    shutil.copy(path("players_db_v1.json"), backup)
    print("backup ->", os.path.basename(backup))

    # apply patches
    patched = 0
    for p in players:
        if p["id"] in PATCHES:
            for k, v in PATCHES[p["id"]].items():
                p[k] = v
            patched += 1

    # drop deleted rows
    kept = [p for p in players if p["id"] not in del_set]

    # prune ages + attributions for deleted ids
    for i in del_set:
        ages.pop(str(i), None)
        att.pop(str(i), None)

    json.dump(kept, open(path("players_db_v1.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=2)
    json.dump(ages, open(path("player_ages.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=2)
    json.dump(att, open(path("image_attributions.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=2)

    print(f"players: {before} -> {len(kept)}  (removed {before - len(kept)})")
    print(f"rows patched: {patched}")
    print("done.")


if __name__ == "__main__":
    main()
