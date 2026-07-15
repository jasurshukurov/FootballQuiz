#!/usr/bin/env python3
"""Remove image_url from players_db_v1.json.

Nothing in the app renders these URLs (the only player photo shown is Career
Path's, which comes from career_paths.json / career_photo_credits.json). The
field was ~1.4MB of bundle weight, ~5.7k entries pointed at Transfermarkt
(unlicensed) and ~6.2k at Wikimedia thumbnails in a size (400px) the CDN no
longer serves. If player photos are ever needed app-wide, re-source them via
scripts/etl/swap_career_photos.py's Wikimedia+license-allowlist approach.
"""
import json

PATH = 'data/players_db_v1.json'

with open(PATH) as f:
    db = json.load(f)

rows = db if isinstance(db, list) else db.values()
removed = 0
for r in rows:
    if isinstance(r, dict) and 'image_url' in r:
        del r['image_url']
        removed += 1

with open(PATH, 'w') as f:
    json.dump(db, f, ensure_ascii=False, separators=(',', ':'))

print(f'removed image_url from {removed} rows')
