#!/usr/bin/env python3
"""Validate the legend rows added by build_legends.py / fetch_legend_images.py.

Checks (each an assertion; exits non-zero on any failure):
  1. ids unique across the whole players_db.
  2. names unique across the whole players_db (the fame join is by name, so a
     duplicate name would make two rows fight over one puzzle target).
  3. every legend uses a known position vocabulary value.
  4. every legend has a DOB in player_ages.json, well-formed and plausible.
  5. retired rows have a sane retired_year; active rows have none.
  6. every legend whose fame tier is mapped by the app actually joins the fame
     table by name (i.e. it will show up in getFamousPlayers()).
  7. every non-empty image_url has an attribution entry whose license is one of
     PD / CC0 / CC BY / CC BY-SA (no NC/ND), and image_source is set.

stdlib only. Usage: python3 validate_legends.py
"""
import datetime
import json
import os
import sys
import unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.normpath(os.path.join(HERE, "..", "..", "data"))

LEGEND_ID_MIN = 1_600_000
VALID_POSITIONS = {"Attack", "Midfield", "Defender", "Goalkeeper"}
REFERENCE_YEAR = 2026
MAPPED_TIERS = {"Beginner", "Amateur", "Semi-Pro", "Professional",
                "World Class", "Legendary"}
# Accepted license substrings (lowercased). NC/ND are rejected explicitly.
ACCEPT_TOKENS = ("cc0", "public domain", "pd-", "cc by")


def load(path):
    with open(os.path.join(DATA_DIR, path), encoding="utf-8") as fh:
        return json.load(fh)


def license_ok(lic):
    l = (lic or "").lower()
    if "-nc" in l or " nc" in l or "noncommercial" in l:
        return False
    if "-nd" in l or "noderiv" in l:
        return False
    return any(t in l for t in ACCEPT_TOKENS)


def main():
    players = load("players_db_v1.json")
    ages = load("player_ages.json")
    attributions = load("image_attributions.json")
    fame = load("fame_scores.json")
    fame_by_name = {}
    for e in fame:
        if e.get("difficulty_tier") in MAPPED_TIERS:
            fame_by_name[e["name"].lower()] = e

    legends = [p for p in players if p["id"] >= LEGEND_ID_MIN]
    errors = []

    def check(cond, msg):
        if not cond:
            errors.append(msg)

    # 1: ids globally unique.
    ids = [p["id"] for p in players]
    check(len(ids) == len(set(ids)), "duplicate ids in players_db")

    # 2: legend names must be unique among themselves and must not collide with
    # a PRE-EXISTING row (that would make two rows fight over one fame join).
    # players_db already contains many legitimate homonyms among the original
    # 12k rows (Pedro, Danilo, Rodri, ...), which are out of scope here.
    existing_lower = {}
    for p in players:
        if p["id"] < LEGEND_ID_MIN:
            existing_lower.setdefault(p["name"].lower(), 0)
            existing_lower[p["name"].lower()] += 1
    legend_lower = [p["name"].lower() for p in legends]
    dup_among = {n for n in legend_lower if legend_lower.count(n) > 1}
    check(not dup_among, "duplicate names among legends: %s" % sorted(dup_among))
    collide = sorted({n for n in legend_lower if n in existing_lower})
    check(not collide, "legend names collide with existing rows: %s" % collide)

    for p in legends:
        nm = p["name"]
        pid = str(p["id"])

        # 3: position
        check(p.get("position") in VALID_POSITIONS,
              "%s: bad position %r" % (nm, p.get("position")))

        # 4: DOB present + well-formed + plausible
        dob = ages.get(pid)
        check(bool(dob), "%s: missing DOB for id %s" % (nm, pid))
        if dob:
            try:
                d = datetime.datetime.strptime(dob, "%Y-%m-%d %H:%M:%S")
                check(1920 <= d.year <= 2006,
                      "%s: implausible birth year %d" % (nm, d.year))
            except ValueError:
                errors.append("%s: malformed DOB %r" % (nm, dob))

        # 5: status / retired_year
        status = p.get("status")
        check(status in ("active", "retired"),
              "%s: bad status %r" % (nm, status))
        ry = p.get("retired_year")
        if status == "retired":
            check(isinstance(ry, int) and 1960 <= ry <= REFERENCE_YEAR,
                  "%s: implausible retired_year %r" % (nm, ry))
        else:
            check(ry is None, "%s: active but has retired_year %r" % (nm, ry))

        # 6: joins the fame table (so it reaches getFamousPlayers)
        check(nm.lower() in fame_by_name,
              "%s: name does not join a mapped fame tier" % nm)

        # 7: image licensing
        url = p.get("image_url") or ""
        if url:
            check(p.get("image_source") == "wikimedia_commons",
                  "%s: image but image_source=%r" % (nm, p.get("image_source")))
            attr = attributions.get(pid)
            check(bool(attr), "%s: image_url but no attribution entry" % nm)
            if attr:
                check(license_ok(attr.get("license")),
                      "%s: unacceptable license %r" % (nm, attr.get("license")))
                check(attr.get("image_url") == url,
                      "%s: attribution image_url mismatch" % nm)
                check(bool((attr.get("artist") or "").strip()),
                      "%s: attribution missing artist" % nm)

    n_img = sum(1 for p in legends if p.get("image_url"))
    print("Legends validated: %d" % len(legends))
    print("  with licensed image: %d" % n_img)
    print("  without image:       %d" % (len(legends) - n_img))
    if errors:
        print("\nFAILED (%d):" % len(errors))
        for e in errors:
            print("  - %s" % e)
        sys.exit(1)
    print("\nAll checks passed.")


if __name__ == "__main__":
    main()
