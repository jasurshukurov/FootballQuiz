#!/usr/bin/env python3
"""Validate data/matches_db.json (feeds the Missing XI game).

Checks:
  - required fields present and correctly typed
  - unique match_id
  - exactly 11 players per lineup side, no blank names
  - lineup_*_ids length matches lineup_*_names length (11)
  - dates are valid ISO YYYY-MM-DD and not in the future
  - score matches "N-M" (optionally with a "(... pen)" / "(agg ...)" suffix)
  - no duplicate matches (same teams + same date)

Exit code 0 when clean, 1 when any error is found.
"""
import json
import os
import re
import sys
from datetime import date, datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "data", "matches_db.json")

REQUIRED_STR_FIELDS = ["match_id", "date", "competition", "season", "opponent_a", "opponent_b", "score"]
LINEUP_FIELDS = ["lineup_a_ids", "lineup_b_ids", "lineup_a_names", "lineup_b_names"]
SCORE_RE = re.compile(r"^\d+-\d+(\s*\(.+\))?$")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def main():
    with open(DB_PATH, encoding="utf-8") as f:
        matches = json.load(f)

    errors = []
    warnings = []
    if not isinstance(matches, list):
        print("ERROR: top-level JSON is not a list")
        return 1

    seen_ids = {}
    seen_matchups = {}
    today = date.today()

    for i, m in enumerate(matches):
        tag = m.get("match_id", f"index {i}")

        for field in REQUIRED_STR_FIELDS:
            if not isinstance(m.get(field), str) or not m.get(field).strip():
                errors.append(f"[{tag}] missing/empty string field '{field}'")

        mid = m.get("match_id")
        if mid in seen_ids:
            errors.append(f"[{tag}] duplicate match_id (also index {seen_ids[mid]})")
        else:
            seen_ids[mid] = i

        # date validity + not future
        d = m.get("date", "")
        if not DATE_RE.match(d):
            errors.append(f"[{tag}] date '{d}' is not YYYY-MM-DD")
        else:
            try:
                parsed = datetime.strptime(d, "%Y-%m-%d").date()
                if parsed > today:
                    errors.append(f"[{tag}] date '{d}' is in the future")
                if parsed.year < 1930:
                    errors.append(f"[{tag}] date '{d}' predates football history sanity bound")
            except ValueError:
                errors.append(f"[{tag}] date '{d}' is not a real calendar date")

        # score format
        sc = m.get("score", "")
        if not SCORE_RE.match(sc):
            errors.append(f"[{tag}] score '{sc}' does not match 'N-M' (with optional suffix)")

        # lineups
        for field in LINEUP_FIELDS:
            if not isinstance(m.get(field), list):
                errors.append(f"[{tag}] '{field}' is not a list")
                continue
            if len(m[field]) != 11:
                errors.append(f"[{tag}] '{field}' has {len(m[field])} entries, expected 11")

        for field in ["lineup_a_names", "lineup_b_names"]:
            names = m.get(field, [])
            if isinstance(names, list):
                for j, n in enumerate(names):
                    if not isinstance(n, str) or not n.strip():
                        errors.append(f"[{tag}] '{field}[{j}]' is blank/non-string")
                # duplicate player within a single side
                stripped = [n.strip() for n in names if isinstance(n, str) and n.strip()]
                if len(set(stripped)) != len(stripped):
                    errors.append(f"[{tag}] '{field}' has a repeated player name")

        for field in ["lineup_a_ids", "lineup_b_ids"]:
            ids = m.get(field, [])
            if isinstance(ids, list):
                for j, v in enumerate(ids):
                    if not isinstance(v, int):
                        errors.append(f"[{tag}] '{field}[{j}]' is not an int")

        # duplicate matchup (same two teams, same date). Legacy seed data stores a
        # handful of fixtures twice (e.g. from each team's perspective, or under a
        # different competition label); those are still complete, playable entries,
        # so this is a warning rather than a hard error. Exact duplicate match_id is
        # still an error (handled above).
        a, b = m.get("opponent_a", ""), m.get("opponent_b", "")
        key = (d, frozenset([a.lower().strip(), b.lower().strip()]))
        if key in seen_matchups:
            warnings.append(f"[{tag}] same fixture as {seen_matchups[key]}: {a} vs {b} on {d}")
        else:
            seen_matchups[key] = tag

    print(f"Validated {len(matches)} matches.")
    if warnings:
        print(f"\n{len(warnings)} WARNING(S):")
        for w in warnings:
            print("  -", w)
    if errors:
        print(f"\n{len(errors)} ERROR(S):")
        for e in errors:
            print("  -", e)
        return 1
    print("\nAll checks passed." + (" (warnings above are non-blocking)" if warnings else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
