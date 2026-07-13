#!/usr/bin/env python3
"""Find team names that gameplay can pass to getTeamColors() but that have no
entry in data/teamColors.ts (so they render the gray fallback crest).

The badge quiz, ranking, stat-card and challenger surfaces all render a
TeamCrest from a player's `current_team`. getTeamColors does *exact* string
matching, so an official long name like "Società Sportiva Lazio S.p.A." does
NOT resolve to the short "Lazio" entry and falls back to gray.

This script computes the set of current_team strings among gameplay-relevant
players (fame_score >= gameplay_fame_min), diffs it against the exact keys of
teamColors.ts (read via tsx so it matches the app 1:1), and prints the missing
teams sorted by how many fame>=threshold players currently play for them.

Usage:  python3 scripts/etl/find_missing_team_colors.py [--json]
Exit code is the number of missing teams (0 == fully covered).
"""
import json
import os
import re
import subprocess
import sys
import unicodedata
from collections import Counter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
DATA = os.path.join(ROOT, 'data')
GAMEPLAY_FAME_MIN = 55.0

# Obvious non-team junk found in the source data; never demand a color for these.
JUNK = {'', '---', '-', 'n/a', 'unknown', 'free agent', 'retired', 'without club'}


def norm(s: str) -> str:
    s = unicodedata.normalize('NFKD', s)
    s = ''.join(c for c in s if not unicodedata.combining(c))
    return re.sub(r'[^a-z0-9 ]', '', s.lower()).strip()


def load(name):
    with open(os.path.join(DATA, name), encoding='utf-8') as f:
        return json.load(f)


def team_color_keys():
    """Exact keys of teamColors.ts, read through tsx so they match the app."""
    script = (
        "import { teamColors } from './data/teamColors';"
        "process.stdout.write(JSON.stringify(Object.keys(teamColors)));"
    )
    out = subprocess.check_output(['npx', 'tsx', '-e', script], cwd=ROOT)
    return set(json.loads(out.decode('utf-8')))


def compute_missing():
    players = load('players_db_v1.json')
    fame = load('fame_scores.json')

    by_norm = {}
    for p in players:
        by_norm.setdefault(norm(p['name']), p)

    counts = Counter()
    for f in fame:
        if f.get('fame_score', 0) < GAMEPLAY_FAME_MIN:
            continue
        p = by_norm.get(norm(f['name']))
        if not p:
            continue
        team = (p.get('current_team') or '').strip()
        if not team or team.lower() in JUNK:
            continue
        counts[team] += 1

    keys = team_color_keys()
    missing = sorted(
        ((t, n) for t, n in counts.items() if t not in keys),
        key=lambda kv: (-kv[1], kv[0]),
    )
    return missing, len(counts), len(keys)


def main():
    as_json = '--json' in sys.argv
    missing, distinct, n_keys = compute_missing()
    if as_json:
        print(json.dumps([{'team': t, 'fame_player_count': n} for t, n in missing],
                         ensure_ascii=False, indent=2))
    else:
        print(f'teamColors.ts entries: {n_keys}')
        print(f'distinct gameplay current_team (fame>={GAMEPLAY_FAME_MIN:g}): {distinct}')
        print(f'MISSING (no color entry, render gray): {len(missing)}\n')
        for t, n in missing:
            print(f'{n:4}  {t}')
    return len(missing)


if __name__ == '__main__':
    sys.exit(main())
