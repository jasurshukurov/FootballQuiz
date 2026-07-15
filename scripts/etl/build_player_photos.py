#!/usr/bin/env python3
"""Build data/player_photos.json — the app-wide player photo map.

Source: data/image_attributions.json (Wikimedia Commons, keyed by players_db
id). Filters to the IP-free license allowlist, rewrites thumbnail widths to
330px (Wikimedia now serves only allowlisted sizes; the baked 400px URLs
return HTTP 400), and emits a compact format:

  { "licenses": [[label, deed_url], ...],
    "photos": { "<players_db_id>": [url_suffix_or_url, artist, license_idx] } }

URLs under https://upload.wikimedia.org/wikipedia/commons/ are stored as
suffixes (lib/playerPhotos.ts re-adds the prefix) to keep the bundle small.
Licenses cc0/public domain need no attribution; everything else renders a
credit (inline or the Photo Credits screen).
"""
import json
import re

ALLOWED = re.compile(r'^(cc0|public domain|pd|cc by(-sa)? \d\.\d)$')
PREFIX = 'https://upload.wikimedia.org/wikipedia/commons/'

with open('data/image_attributions.json') as f:
    attr = json.load(f)

licenses = []
lic_idx = {}
photos = {}
skipped_license = 0
skipped_svg = 0

def strip_tags(s):
    return re.sub(r'<[^>]+>', '', s or '').strip()

for pid, v in attr.items():
    url = v.get('image_url') or ''
    lic = (v.get('license') or '').lower().strip()
    if not url or not ALLOWED.match(lic):
        skipped_license += 1
        continue
    if url.lower().endswith('.svg') or '.svg/' in url.lower():
        # A portrait is never an SVG: crest/flag from a namesake collision.
        skipped_svg += 1
        continue
    url = re.sub(r'/\d+px-', '/330px-', url)
    key = (lic, v.get('license_url') or '')
    if key not in lic_idx:
        lic_idx[key] = len(licenses)
        licenses.append([lic, key[1]])
    if url.startswith(PREFIX):
        url = url[len(PREFIX):]
    photos[pid] = [url, strip_tags(v.get('artist'))[:80], lic_idx[key]]

out = {'licenses': licenses, 'photos': photos}
with open('data/player_photos.json', 'w') as f:
    json.dump(out, f, ensure_ascii=False, separators=(',', ':'))

print(f'photos: {len(photos)} | licenses: {len(licenses)} | '
      f'skipped license/empty: {skipped_license} | skipped svg: {skipped_svg}')
