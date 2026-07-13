#!/usr/bin/env python3
"""Validate data/career_paths.json.

The file predates this script and carries some historical conventions:
  * `normalized_name` is the diacritic-stripped lowercase of `name`.
  * Legends have pre-1980 career years.
  * Loan spells are stored as an entry whose [from, to] range sits inside (or
    partially overlaps) the club it was loaned from, listed adjacently.

Because of that, checks are split into two tiers:

  HARD (fail the run) — applied to every entry:
    1. Unique ids.
    2. Required fields present and correctly typed
       (id, name, normalized_name, nationality, position, career, tier,
        image_url; image_url may be "").
    3. tier is a valid DifficultyTier; position is a known position.
    4. normalized_name == diacritic-stripped lower(name).
    5. Career years in [1940, CURRENT_YEAR] and from <= to.
    6. No duplicate normalized_name that involves a NEW entry.
    7. NEW entries: sequence is non-decreasing except loans (a later entry
       whose range is contained in the immediately preceding one).

  SOFT (report as WARNING) — pre-existing quirks in the original dataset:
    * duplicate normalized_name where both entries are pre-existing;
    * overlaps in pre-existing entries that are not clean loans;
    * club-name spelling variants (same club spelled two ways).

"NEW" = entries with id > LAST_LEGACY_ID (the additions authored by the content
expansion). Everything at or below that id is treated as legacy.

Exit code is non-zero iff there is at least one HARD error.
"""
import json
import os
import sys
import unicodedata

CURRENT_YEAR = 2026
MIN_YEAR = 1940
LAST_LEGACY_ID = 511  # ids <= this are the original dataset; above are new

VALID_TIERS = {"legendary", "world_class", "professional", "semi_pro", "amateur", "beginner"}
VALID_POSITIONS = {"Forward", "Midfielder", "Defender", "Goalkeeper"}
REQUIRED = ["id", "name", "normalized_name", "nationality", "position", "career", "tier", "image_url"]

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PATH = os.path.join(REPO, "data", "career_paths.json")


def strip_diacritics(s):
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


def norm_name(s):
    return strip_diacritics(s).lower().strip()


def fold_club(s):
    return "".join(ch for ch in strip_diacritics(s).lower() if ch.isalnum())


def main():
    with open(PATH, encoding="utf-8") as fh:
        data = json.load(fh)

    errors = []
    warnings = []

    ids = {}
    names = {}          # normalized_name -> (id, name)
    spellings = {}       # folded club -> set of exact spellings

    for i, p in enumerate(data):
        who = p.get("name", f"<index {i}>")

        missing = [f for f in REQUIRED if f not in p]
        if missing:
            errors.append(f"{who}: missing field(s) {missing}")
            continue

        is_new = isinstance(p["id"], int) and p["id"] > LAST_LEGACY_ID

        # types
        for field in ["name", "normalized_name", "nationality", "position", "tier"]:
            if not isinstance(p[field], str) or not p[field].strip():
                errors.append(f"{who}: field '{field}' empty or not a string")
        if not isinstance(p["image_url"], str):
            errors.append(f"{who}: image_url must be a string")

        # unique id
        if not isinstance(p["id"], int):
            errors.append(f"{who}: id is not an int")
        elif p["id"] in ids:
            errors.append(f"duplicate id {p['id']}: '{who}' and '{ids[p['id']]}'")
        else:
            ids[p["id"]] = who

        # unique normalized_name
        nn = p["normalized_name"]
        if nn in names:
            other_id, other_name = names[nn]
            other_new = other_id > LAST_LEGACY_ID
            msg = f"duplicate normalized_name '{nn}': '{who}' (id {p['id']}) and '{other_name}' (id {other_id})"
            if is_new or other_new:
                errors.append(msg)
            else:
                warnings.append("[legacy] " + msg)
        else:
            names[nn] = (p["id"], p["name"])

        # normalized_name convention
        if nn != norm_name(p["name"]):
            errors.append(f"{who}: normalized_name '{nn}' != stripped-lower(name) '{norm_name(p['name'])}'")

        # enums
        if p["tier"] not in VALID_TIERS:
            errors.append(f"{who}: invalid tier '{p['tier']}'")
        if p["position"] not in VALID_POSITIONS:
            errors.append(f"{who}: invalid position '{p['position']}'")

        # career
        career = p["career"]
        if not isinstance(career, list) or not career:
            errors.append(f"{who}: career must be a non-empty list")
            continue

        prev = None
        for e in career:
            if not all(k in e for k in ("club", "from", "to")):
                errors.append(f"{who}: career entry missing club/from/to: {e}")
                prev = None
                continue
            club, fr, to = e["club"], e["from"], e["to"]
            if not isinstance(club, str) or not club.strip():
                errors.append(f"{who}: empty club name")
            else:
                spellings.setdefault(fold_club(club), set()).add(club)

            if not (isinstance(fr, int) and isinstance(to, int)):
                errors.append(f"{who}: '{club}' from/to must be ints")
                prev = e
                continue
            if not (MIN_YEAR <= fr <= CURRENT_YEAR):
                errors.append(f"{who}: '{club}' from={fr} out of range [{MIN_YEAR},{CURRENT_YEAR}]")
            if not (MIN_YEAR <= to <= CURRENT_YEAR):
                errors.append(f"{who}: '{club}' to={to} out of range [{MIN_YEAR},{CURRENT_YEAR}]")
            if fr > to:
                errors.append(f"{who}: '{club}' from={fr} > to={to}")

            if prev is not None:
                p_fr, p_to = prev["from"], prev["to"]
                sequential = fr >= p_to
                loan = (fr >= p_fr and to <= p_to)
                if not (sequential or loan):
                    msg = (f"{who}: overlap not a clean loan: '{prev['club']}'({p_fr}-{p_to}) then "
                           f"'{club}'({fr}-{to})")
                    if is_new:
                        errors.append(msg)
                    else:
                        warnings.append("[legacy] " + msg)
            prev = e

    for folded, variants in sorted(spellings.items()):
        if len(variants) > 1:
            warnings.append(f"club spelling variants: {sorted(variants)}")

    new_count = sum(1 for p in data if isinstance(p.get("id"), int) and p["id"] > LAST_LEGACY_ID)
    print(f"Validated {len(data)} players ({new_count} new, {len(data) - new_count} legacy).")
    if warnings:
        print(f"\n{len(warnings)} WARNING(s) (pre-existing / non-blocking):")
        for w in warnings:
            print(f"  WARN  {w}")
    if errors:
        print(f"\n{len(errors)} ERROR(s):")
        for e in errors:
            print(f"  ERROR {e}")
        sys.exit(1)
    print("\nOK: no hard errors.")


if __name__ == "__main__":
    main()
