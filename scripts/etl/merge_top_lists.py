#!/usr/bin/env python3
"""Merge data/top_lists/batch_*.json into data/top_lists.json with validation.

Replaces the placeholder file wholesale. Re-runnable. Exits nonzero on any
hard validation failure so CI/agents can gate on it.
"""

import glob
import json
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BATCH_GLOB = str(ROOT / 'data' / 'top_lists' / 'batch_*.json')
OUT = ROOT / 'data' / 'top_lists.json'

VALID_GROUPS = {'international', 'national', 'club-competitions', 'leagues', 'clubs-records'}


def norm(s: str) -> str:
    return unicodedata.normalize('NFD', s).encode('ascii', 'ignore').decode().lower().strip()


def validate_list(lst, errors, warnings):
    lid = lst.get('id', '<missing id>')
    for field in ('id', 'title', 'group', 'entries'):
        if field not in lst:
            errors.append(f'{lid}: missing field {field}')
            return
    if lst['group'] not in VALID_GROUPS:
        warnings.append(f"{lid}: unknown group '{lst['group']}'")
    entries = lst['entries']
    if not (4 <= len(entries) <= 12):
        errors.append(f'{lid}: {len(entries)} entries (want 4-12)')
    prev_rank, prev_value = 0, None
    names = set()
    for e in entries:
        for field in ('rank', 'name', 'value', 'unit'):
            if field not in e:
                errors.append(f'{lid}: entry missing {field}: {e}')
                return
        n = norm(e['name'])
        if n in names:
            errors.append(f"{lid}: duplicate entry name '{e['name']}'")
        names.add(n)
        if e['rank'] < prev_rank:
            errors.append(f'{lid}: ranks not ascending at {e["name"]}')
        if not isinstance(e['value'], (int, float)) or e['value'] < 0:
            errors.append(f'{lid}: bad value for {e["name"]}: {e["value"]}')
        # values must be non-increasing as rank increases (ties allowed)
        if prev_value is not None and e['rank'] > prev_rank and e['value'] > prev_value:
            errors.append(f'{lid}: value increases down the ranking at {e["name"]}')
        prev_rank, prev_value = e['rank'], e['value']
        # alias ambiguity: an alias must not match two entries in the same list
    alias_owner = {}
    for e in entries:
        for a in e.get('aliases', []) + [e['name']]:
            an = norm(a)
            if an in alias_owner and alias_owner[an] != norm(e['name']):
                errors.append(f"{lid}: alias '{a}' ambiguous between entries")
            alias_owner[an] = norm(e['name'])


def main():
    batches = sorted(glob.glob(BATCH_GLOB))
    if not batches:
        print('no batch files found under data/top_lists/ — nothing to merge')
        sys.exit(1)

    merged, errors, warnings = [], [], []
    seen_ids, seen_titles = {}, {}
    for path in batches:
        try:
            lists = json.load(open(path))
        except Exception as exc:
            errors.append(f'{path}: unparseable JSON: {exc}')
            continue
        for lst in lists:
            lid = lst.get('id', '')
            if lid in seen_ids:
                warnings.append(f"duplicate id '{lid}' in {path} (first in {seen_ids[lid]}) — skipped")
                continue
            tnorm = norm(lst.get('title', ''))
            if tnorm in seen_titles:
                warnings.append(
                    f"near-duplicate title '{lst.get('title')}' in {path} vs {seen_titles[tnorm]} — kept both, review"
                )
            seen_ids[lid] = path
            seen_titles.setdefault(tnorm, path)
            validate_list(lst, errors, warnings)
            merged.append(lst)

    print(f'batches: {len(batches)} | lists merged: {len(merged)}')
    for w in warnings:
        print('  WARN', w)
    if errors:
        for e in errors:
            print('  ERROR', e)
        print(f'FAILED: {len(errors)} errors — data/top_lists.json NOT written')
        sys.exit(1)

    json.dump(merged, open(OUT, 'w'), indent=2, ensure_ascii=False)
    groups = {}
    for lst in merged:
        groups[lst['group']] = groups.get(lst['group'], 0) + 1
    print(f'wrote {OUT} ({len(merged)} lists) | by group: {groups}')


if __name__ == '__main__':
    main()
