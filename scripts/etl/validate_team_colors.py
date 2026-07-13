#!/usr/bin/env python3
"""Validate data/teamColors.ts.

Checks, for every entry:
  * primary and secondary are well-formed #RRGGBB hex,
  * pattern (if present) is one of the allowed TeamPattern values,
  * primary != secondary (an all-one-color crest is unreadable),
and then re-runs find_missing_team_colors to assert 0 gameplay teams fall back
to the gray crest.

Reads teamColors through tsx so it validates exactly what the app imports.

Usage:  python3 scripts/etl/validate_team_colors.py
Exit code 0 == all good; non-zero == problems (printed to stderr).
"""
import json
import os
import re
import subprocess
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
HEX_RE = re.compile(r'^#[0-9A-Fa-f]{6}$')
PATTERNS = {'chevron', 'stripe', 'halves', 'circle'}


def load_team_colors():
    script = (
        "import { teamColors } from './data/teamColors';"
        "process.stdout.write(JSON.stringify(teamColors));"
    )
    out = subprocess.check_output(['npx', 'tsx', '-e', script], cwd=ROOT)
    return json.loads(out.decode('utf-8'))


def main():
    tc = load_team_colors()
    errors = []
    for name, c in tc.items():
        p, s = c.get('primary'), c.get('secondary')
        pat = c.get('pattern')
        if not (isinstance(p, str) and HEX_RE.match(p)):
            errors.append(f'{name!r}: bad primary {p!r}')
        if not (isinstance(s, str) and HEX_RE.match(s)):
            errors.append(f'{name!r}: bad secondary {s!r}')
        if pat is not None and pat not in PATTERNS:
            errors.append(f'{name!r}: bad pattern {pat!r}')
        if isinstance(p, str) and isinstance(s, str) and p.upper() == s.upper():
            errors.append(f'{name!r}: primary == secondary ({p}) — crest would be one flat color')

    print(f'validated {len(tc)} teamColors entries')
    if errors:
        print(f'\n{len(errors)} PROBLEM(S):', file=sys.stderr)
        for e in errors:
            print('  ' + e, file=sys.stderr)
        return 1
    print('  all entries: valid #RRGGBB, valid pattern, primary != secondary')

    # 0-missing gate
    finder = os.path.join(ROOT, 'scripts', 'etl', 'find_missing_team_colors.py')
    res = subprocess.run([sys.executable, finder], cwd=ROOT, capture_output=True, text=True)
    n_missing = res.returncode
    print(f'\nfind_missing_team_colors: {n_missing} gameplay team(s) still uncovered')
    if n_missing != 0:
        sys.stderr.write(res.stdout)
        return 1
    print('  0 missing — every gameplay current_team resolves to a real crest color')
    return 0


if __name__ == '__main__':
    sys.exit(main())
