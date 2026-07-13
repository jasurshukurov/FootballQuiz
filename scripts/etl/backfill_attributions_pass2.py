#!/usr/bin/env python3
"""
backfill_attributions_pass2.py -- recover images for the pool players that pass 1
blanked (exact-name Wikipedia lookup missed them, or their lead image wasn't
strictly IP-free).

Pass 2 uses Wikipedia's SEARCH generator ("<name> footballer") to find the right
article even when the DB name != article title, then applies the SAME strict
license rule as pass 1. Safety against matching the wrong person:
  - the article's short description must mention football/soccer, and
  - the article title must share the player's surname (diacritic-insensitive).
Only fills players whose image_url is currently blank; never overwrites an
existing image. Re-runnable.

Run: python3 scripts/etl/backfill_attributions_pass2.py
"""
import json
import os
import time
import urllib.parse
import importlib.util

DATA = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data"))
FAME_THRESHOLD = 55.0

# reuse helpers from pass 1 (get w/ backoff, acceptable, commons_licenses, strip)
_spec = importlib.util.spec_from_file_location(
    "p1", os.path.join(os.path.dirname(__file__), "backfill_attributions.py"))
p1 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(p1)


def strip(s):
    return p1.strip_html(s)  # not diacritics; use a simple lower for surname match


def norm_tokens(s):
    import unicodedata, re
    n = unicodedata.normalize("NFKD", s or "")
    return set(re.sub(r"[^a-z ]", "", "".join(c for c in n if not unicodedata.combining(c)).lower()).split())


def search_title(name):
    """Best-matching football article TITLE for `name`, or None.

    Uses search only for TITLE resolution (pageimages data is unreliable when
    combined with generator=search). Confirms the article is about a footballer
    via its short description and that the title shares the player's surname.
    """
    q = urllib.parse.urlencode({
        "action": "query", "generator": "search",
        "gsrsearch": f"{name} footballer", "gsrlimit": "3", "gsrnamespace": "0",
        "prop": "pageterms", "wbptterms": "description",
        "redirects": "1", "format": "json", "formatversion": "2",
    })
    d = p1.get("https://en.wikipedia.org/w/api.php?" + q)
    pages = (d or {}).get("query", {}).get("pages", [])
    pages.sort(key=lambda p: p.get("index", 99))
    toks = [t for t in norm_tokens(name) if len(t) > 1]
    surname = sorted(toks, key=len)[-1] if toks else None
    for p in pages:
        desc = " ".join((p.get("terms", {}) or {}).get("description", [])).lower()
        if "football" not in desc and "soccer" not in desc:
            continue
        if surname and surname not in norm_tokens(p.get("title", "")):
            continue
        return p["title"]
    return None


def main():
    players = json.load(open(os.path.join(DATA, "players_db_v1.json"), encoding="utf-8"))
    att = json.load(open(os.path.join(DATA, "image_attributions.json"), encoding="utf-8"))
    fame = json.load(open(os.path.join(DATA, "fame_scores.json"), encoding="utf-8"))
    fb = {}
    for f in fame:
        nm = f["name"].lower()
        fb[nm] = max(fb.get(nm, 0), f["fame_score"])

    targets = [p for p in players
               if fb.get(p["name"].lower(), 0) >= FAME_THRESHOLD and not p.get("image_url")]
    print(f"blanked pool players to retry: {len(targets)}")

    # phase 1: resolve each name to a football article title via search
    pid_title = {}
    for i, p in enumerate(targets):
        t = search_title(p["name"])
        if t:
            pid_title[p["id"]] = t
        if (i + 1) % 40 == 0:
            print(f"  searched {i+1}/{len(targets)} (titles {len(pid_title)})")
        time.sleep(0.5)
    print(f"titles resolved: {len(pid_title)}/{len(targets)}")

    # phase 2: reliable single-title pageimages lookup for each resolved title
    titles = sorted(set(pid_title.values()))
    title_img = p1.wiki_lead_images(titles)   # {title: (file, thumb)}
    found = {pid: title_img[t] for pid, t in pid_title.items() if t in title_img}
    print(f"candidate images found: {len(found)}/{len(targets)}")

    files = sorted({f for f, _ in found.values()})
    lic = p1.commons_licenses(files)
    print(f"license metadata for {len(lic)}/{len(files)} files")

    by_id = {p["id"]: p for p in players}
    recovered = 0
    for pid, (fname, thumb) in found.items():
        meta = lic.get(fname)
        if meta and p1.acceptable(meta["license"]):
            by_id[pid]["image_url"] = thumb
            by_id[pid]["image_source"] = "wikimedia_commons"
            att[str(pid)] = {
                "player_name": by_id[pid]["name"],
                "wikipedia_title": by_id[pid]["name"],
                "license": meta["license"].lower(),
                "license_url": meta["license_url"],
                "artist": meta["artist"],
                "image_url": thumb,
            }
            recovered += 1

    json.dump(players, open(os.path.join(DATA, "players_db_v1.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=2)
    json.dump(att, open(os.path.join(DATA, "image_attributions.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=2)
    print(f"recovered (IP-free image): {recovered}")
    print(f"still blank: {len(targets) - recovered}")


if __name__ == "__main__":
    main()
