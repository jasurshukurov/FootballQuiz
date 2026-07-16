#!/usr/bin/env python3
"""Strip unused fields from data/fame_scores.json (bundled in the app).

Runtime readers (lib/playerData.ts fallback join, lib/blindRankingGenerator.ts)
use: global_id, name, fame_score, difficulty_tier, metrics.peak_valuation_euros.
Everything else (is_modern; metrics wikipedia_pageviews / peak_game_rating /
elite_exposure — the latter two were ETL-synthesized anyway) is dead bundle
weight. Values are rounded where sub-unit precision is meaningless.
"""
import json

PATH = 'data/fame_scores.json'
rows = json.load(open(PATH))

slim = [
    {
        'global_id': r['global_id'],
        'name': r['name'],
        'fame_score': round(r['fame_score'], 1),
        'difficulty_tier': r['difficulty_tier'],
        'metrics': {'peak_valuation_euros': int(r.get('metrics', {}).get('peak_valuation_euros', 0))},
    }
    for r in rows
]

with open(PATH, 'w') as f:
    json.dump(slim, f, ensure_ascii=False, separators=(',', ':'))
print(f'{len(slim)} rows slimmed')
