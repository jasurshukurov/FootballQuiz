#!/usr/bin/env python3
"""
backfill_attributions.py -- make every fame>=55 pool player's image IP-free.

The pool players missing an image_attributions entry turned out to be using
copyrighted Transfermarkt portrait URLs (image_source=None), not Wikimedia
files. Per the IP-free rule we must not ship those. For each such player we:

  1. ask the Wikipedia API for the article's lead image (a Commons file) at
     400px, following redirects;
  2. verify that file's license via the Commons `extmetadata` API;
  3. if the license is IP-free (PD / CC0 / CC BY / CC BY-SA, no NC/ND) ->
     replace image_url with the Commons thumb, set image_source, and record an
     image_attributions.json entry;
  4. otherwise (no article image, license not acceptable, or lookup fails) ->
     BLANK the player's image_url / image_source so nothing copyrighted ships.

Polite: custom UA, maxlag, batched Commons lookups, small delays.
Run: python3 scripts/etl/backfill_attributions.py
"""
import json
import os
import re
import time
import html
import urllib.parse
import urllib.request

DATA = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data"))
UA = "FootballTriviaDB/1.0 (player image license audit)"
FAME_THRESHOLD = 55.0

ACCEPT_TOKENS = ("cc0", "public domain", "cc by")   # cc by covers cc by-sa
REJECT_TOKENS = ("-nc", " nc", "nc-", "noncommercial", "-nd", " nd", "noderiv",
                 "fair use", "non-free", "all rights", "copyright", "gfdl")


def get(url, tries=5):
    """GET JSON with backoff on 429/503 (Wikimedia rate limiting)."""
    for attempt in range(tries):
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code in (429, 503) and attempt < tries - 1:
                wait = int(e.headers.get("Retry-After", 0)) or (2 ** attempt + 2)
                time.sleep(wait)
                continue
            raise
        except Exception:
            if attempt < tries - 1:
                time.sleep(2 ** attempt)
                continue
            raise
    return None


def strip_html(s):
    return re.sub(r"<[^>]+>", "", html.unescape(s or "")).strip()


def acceptable(license_short):
    s = (license_short or "").lower().strip()
    if any(t in s for t in REJECT_TOKENS):
        return False
    if s.startswith("pd") or "public domain" in s:   # PD-old, PD-USGov, ...
        return True
    return any(t in s for t in ACCEPT_TOKENS)


def wiki_lead_images(names):
    """{name: (commons_file, thumb_url)} for each article's lead image.

    Per-name requests: batched pageimages queries return an empty result set for
    this endpoint, so we query one title at a time (paced + backoff on 429/503).
    """
    out = {}
    for i, name in enumerate(names):
        q = urllib.parse.urlencode({
            "action": "query", "titles": name, "prop": "pageimages",
            "piprop": "thumbnail|name", "pithumbsize": "400",
            "redirects": "1", "format": "json", "formatversion": "2",
        })
        d = get("https://en.wikipedia.org/w/api.php?" + q)
        pages = (d or {}).get("query", {}).get("pages", [])
        if pages:
            p = pages[0]
            if "thumbnail" in p and "pageimage" in p:
                out[name] = (p["pageimage"], p["thumbnail"]["source"])
        if (i + 1) % 50 == 0:
            print(f"  wiki lookups {i+1}/{len(names)} (found {len(out)})")
        time.sleep(0.6)
    return out


def commons_licenses(filenames):
    """Batch: {filename: {license, license_url, artist}} via extmetadata."""
    out = {}
    for i in range(0, len(filenames), 40):
        chunk = filenames[i:i + 40]
        titles = "|".join("File:" + f for f in chunk)
        q = urllib.parse.urlencode({
            "action": "query", "titles": titles, "prop": "imageinfo",
            "iiprop": "extmetadata", "format": "json", "formatversion": "2",
        })
        d = get("https://commons.wikimedia.org/w/api.php?" + q)
        if not d:
            time.sleep(2)
            continue
        norm = {n["from"]: n["to"] for n in d.get("query", {}).get("normalized", [])}
        pages = d.get("query", {}).get("pages", [])
        title_to_file = {}
        for f in chunk:
            t = norm.get("File:" + f, "File:" + f)
            title_to_file[t] = f
        for p in pages:
            f = title_to_file.get(p.get("title"))
            if not f or "imageinfo" not in p:
                continue
            em = p["imageinfo"][0].get("extmetadata", {})
            out[f] = {
                "license": (em.get("LicenseShortName", {}) or {}).get("value", ""),
                "license_url": (em.get("LicenseUrl", {}) or {}).get("value", ""),
                "artist": strip_html((em.get("Artist", {}) or {}).get("value", "")),
            }
        time.sleep(0.5)
    return out


def main():
    players = json.load(open(os.path.join(DATA, "players_db_v1.json"), encoding="utf-8"))
    att = json.load(open(os.path.join(DATA, "image_attributions.json"), encoding="utf-8"))
    fame = json.load(open(os.path.join(DATA, "fame_scores.json"), encoding="utf-8"))
    fb = {}
    for f in fame:
        nm = f["name"].lower()
        fb[nm] = max(fb.get(nm, 0), f["fame_score"])

    def in_pool(p):
        return fb.get(p["name"].lower(), 0) >= FAME_THRESHOLD

    targets = [p for p in players if in_pool(p) and p.get("image_url") and str(p["id"]) not in att]
    print(f"pool players needing image license: {len(targets)}")

    # step 1: find a Wikipedia lead image (Commons file) for each (batched)
    names = [p["name"] for p in targets]
    name_imgs = wiki_lead_images(names)
    found = {p["id"]: name_imgs[p["name"]] for p in targets if p["name"] in name_imgs}
    print(f"lead images found: {len(found)}/{len(targets)}")

    # step 2: verify licenses in batch
    files = sorted({f for f, _ in found.values()})
    lic = commons_licenses(files)
    print(f"license metadata fetched for {len(lic)}/{len(files)} files")

    by_id = {p["id"]: p for p in players}
    documented = blanked = 0
    for p in targets:
        pid = p["id"]
        info = found.get(pid)
        ok = False
        if info:
            fname, thumb = info
            meta = lic.get(fname)
            if meta and acceptable(meta["license"]):
                by_id[pid]["image_url"] = thumb
                by_id[pid]["image_source"] = "wikimedia_commons"
                att[str(pid)] = {
                    "player_name": p["name"],
                    "wikipedia_title": p["name"],
                    "license": meta["license"].lower(),
                    "license_url": meta["license_url"],
                    "artist": meta["artist"],
                    "image_url": thumb,
                }
                documented += 1
                ok = True
        if not ok:
            by_id[pid]["image_url"] = ""
            by_id[pid]["image_source"] = ""
            blanked += 1

    json.dump(players, open(os.path.join(DATA, "players_db_v1.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=2)
    json.dump(att, open(os.path.join(DATA, "image_attributions.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=2)
    print(f"documented (IP-free Commons image): {documented}")
    print(f"blanked (no acceptable image): {blanked}")


if __name__ == "__main__":
    main()
