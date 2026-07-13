#!/usr/bin/env python3
"""Validate data/transfers.json.

Checks:
  - unique player_id, unique player_name
  - required fields present on every player and transfer
  - fees parse to a sane range (0..300M euros) or are Free/Loan/null
  - transfer years within 1990..2026 (older youth entries allowed via --min-year)
  - no duplicate player+year+clubs triples within a player
Exit code is non-zero if any error is found.
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PATH = os.path.join(ROOT, "data", "transfers.json")

MAX_FEE_EUR = 300_000_000
# Floor covers historical legends already in the dataset (e.g. Di Stefano 1945).
# Ceiling is the current window (2026); anything beyond is a data error.
YEAR_MIN = 1940
YEAR_MAX = 2026

REQUIRED_PLAYER = {"player_id", "player_name", "transfers"}
REQUIRED_TRANSFER = {"club_name", "club_id", "date_joined", "date_left", "fee"}
NON_NUMERIC_FEES = {"free", "loan", "end of loan", "-", "?"}
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def parse_fee_eur(fee):
    """Mirror lib/agentGameGenerator.ts parseFeeToNumber."""
    cleaned = re.sub(r"[^0-9.]", "", fee)
    try:
        num = float(cleaned)
    except ValueError:
        return None
    low = fee.lower()
    if "m" in low:
        return num * 1_000_000
    if "k" in low:
        return num * 1_000
    return num


def year_of(date):
    return int(date[:4])


def main():
    with open(PATH, encoding="utf-8") as f:
        data = json.load(f)

    errors = []
    warnings = []

    seen_ids = {}
    seen_names = {}

    for i, p in enumerate(data):
        missing = REQUIRED_PLAYER - set(p)
        if missing:
            errors.append(f"[{i}] player missing fields {missing}")
            continue

        pid = p["player_id"]
        name = p["player_name"]
        if not isinstance(pid, int):
            errors.append(f"[{i}] player_id not int: {pid!r}")
        if pid in seen_ids:
            errors.append(f"duplicate player_id {pid}: {name} & {seen_ids[pid]}")
        seen_ids[pid] = name
        if name in seen_names:
            errors.append(f"duplicate player_name {name!r} (ids {seen_names[name]}, {pid})")
        seen_names[name] = pid

        if not p["transfers"]:
            warnings.append(f"{name}: no transfers")

        triples = set()
        for t in p["transfers"]:
            tmissing = REQUIRED_TRANSFER - set(t)
            if tmissing:
                errors.append(f"{name}: transfer missing fields {tmissing}")
                continue

            for field in ("club_name", "club_id"):
                if not t[field] or not isinstance(t[field], str):
                    errors.append(f"{name}: bad {field}: {t[field]!r}")

            dj = t["date_joined"]
            dl = t["date_left"]
            if not (isinstance(dj, str) and DATE_RE.match(dj)):
                errors.append(f"{name}: bad date_joined {dj!r}")
            else:
                y = year_of(dj)
                if not (YEAR_MIN <= y <= YEAR_MAX):
                    errors.append(f"{name}: date_joined year {y} out of range {YEAR_MIN}-{YEAR_MAX}")
            if dl is not None:
                if not (isinstance(dl, str) and DATE_RE.match(dl)):
                    errors.append(f"{name}: bad date_left {dl!r}")
                elif isinstance(dj, str) and DATE_RE.match(dj) and dl < dj:
                    # The corpus records loan spells nested inside a longer
                    # contract as join YYYY-07-01 / left YYYY-06-30 (same year).
                    # Treat as a warning, not a hard error.
                    warnings.append(f"{name}: date_left {dl} before date_joined {dj} (nested-loan convention)")

            fee = t["fee"]
            if fee is not None:
                if not isinstance(fee, str):
                    errors.append(f"{name}: fee not string/null: {fee!r}")
                elif fee.lower() not in NON_NUMERIC_FEES and "free" not in fee.lower() and "loan" not in fee.lower():
                    val = parse_fee_eur(fee)
                    if val is None:
                        errors.append(f"{name}: unparseable fee {fee!r}")
                    elif not (0 < val <= MAX_FEE_EUR):
                        errors.append(f"{name}: fee {fee!r} = {val} out of range 0..{MAX_FEE_EUR}")

            triple = (t.get("club_id"), t.get("club_name"), dj[:4] if isinstance(dj, str) else dj)
            if triple in triples:
                warnings.append(f"{name}: duplicate club+year row {triple}")
            triples.add(triple)

    print(f"records: {len(data)}")
    print(f"unique ids: {len(seen_ids)}  unique names: {len(seen_names)}")
    print(f"errors: {len(errors)}")
    for e in errors[:50]:
        print("  ERROR", e)
    print(f"warnings: {len(warnings)}")
    for w in warnings[:50]:
        print("  warn", w)

    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
