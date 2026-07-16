#!/usr/bin/env python3
"""Strip unused fields from data/fame_by_id.json (bundled in the app).

lib/playerData.ts getFameById reads: name (kept for ETL sanity/debug joins),
fame_score, difficulty_tier, peak_valuation. peak_game_rating / elite_exposure
/ wikipedia_pageviews are unread at runtime (the first two were synthesized by
the popularity ETL anyway).
"""
import json

PATH = 'data/fame_by_id.json'
d = json.load(open(PATH))

slim = {
    k: {
        'name': v['name'],
        'fame_score': round(v['fame_score'], 1),
        'difficulty_tier': v['difficulty_tier'],
        'peak_valuation': int(v.get('peak_valuation', 0)),
    }
    for k, v in d.items()
}

with open(PATH, 'w') as f:
    json.dump(slim, f, ensure_ascii=False, separators=(',', ':'))
print(f'{len(slim)} rows slimmed')
