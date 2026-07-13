#!/usr/bin/env python3
"""Fetch IP-free portraits for the newly-added legend rows (build_legends.py).

For the top-N most famous new legends (by fame_score) we resolve their English
Wikipedia article, take its lead image, and verify the image's license on
Wikimedia Commons. We ONLY accept Public Domain / CC0 / CC BY / CC BY-SA (never
NC or ND). Accepted files get a 400px Wikimedia thumbnail URL written to the
players_db row (image_source='wikimedia_commons') and a full attribution entry
in data/image_attributions.json (author + license + license_url + file URL).

If no acceptably-licensed image is found, image_url is left '' — the app must
not ship unlicensed images. Many pre-1990 legends only have non-free (fair-use)
photos on Wikipedia; those are correctly rejected.

Only touches rows with id >= LEGEND_ID_MIN (the range build_legends.py assigns),
so it can't disturb the 12k pre-existing images. Idempotent: a legend that
already has an image is skipped.

stdlib only (urllib). No API key needed.

Usage:
    python3 fetch_legend_images.py [--top N] [--dry-run] [--verbose]
"""
import argparse
import json
import os
import re
import time
import unicodedata
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.normpath(os.path.join(HERE, "..", "..", "data"))
DB_PATH = os.path.join(DATA_DIR, "players_db_v1.json")
FAME_PATH = os.path.join(DATA_DIR, "fame_scores.json")
ATTR_PATH = os.path.join(DATA_DIR, "image_attributions.json")

LEGEND_ID_MIN = 1_600_000

WIKI_API = "https://en.wikipedia.org/w/api.php"
COMMONS_API = "https://commons.wikimedia.org/w/api.php"
UA = "FootballTriviaApp/1.0 (https://github.com/jasur-2902/FootballQuiz; jasur@dev) urllib"
DELAY = 0.15

# Accept ONLY these license families (free for commercial use, no NC/ND).
# Matched as substrings against the lowercased LicenseShortName.
ACCEPT_TOKENS = ("cc0", "public domain", "pd-", "cc by")


def fold(name):
    nfkd = unicodedata.normalize("NFKD", name or "")
    return "".join(c for c in nfkd if not unicodedata.combining(c)).lower()


def api_get(base, params):
    url = base + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=25) as r:
        return json.load(r)


def load_json(path):
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def dump_json(path, obj):
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(obj, fh, ensure_ascii=False, indent=2)
        fh.write("\n")


# Exact article titles for names whose free-text search lands on a
# disambiguation page or an unrelated article (an institute, a cup, a namesake).
TITLE_OVERRIDES = {
    "ronaldo de assis moreira": "Ronaldinho",
    "xavi hernandez": "Xavi (footballer, born 1980)",
    "marcel desailly": "Marcel Desailly",
    "claude makelele": "Claude Makélélé",
    "keisuke honda": "Keisuke Honda",
    "adriano": "Adriano (footballer, born February 1982)",
    "hakim ziyech": "Hakim Ziyech",
    "park ji-sung": "Park Ji-sung",
    "alisson becker": "Alisson",
    "franz beckenbauer": "Franz Beckenbauer",
    "johan cruyff": "Johan Cruyff",
    "raul gonzalez": "Raúl",
    "romario": "Romário",
    "rivaldo": "Rivaldo",
    "pepe": "Pepe (footballer, born 1983)",
    "eusebio": "Eusébio",
    "lev yashin": "Lev Yashin",
    "george best": "George Best",
    "george weah": "George Weah",
}


def search_article(name, nationality=""):
    """Return the exact English-Wikipedia article title for the footballer."""
    ov = TITLE_OVERRIDES.get(fold(name).strip())
    if ov:
        return ov
    queries = [q for q in [
        "%s %s footballer" % (name, nationality) if nationality else None,
        "%s footballer" % name,
        "%s football player" % name,
        name,
    ] if q]
    name_parts = [p for p in fold(name).split() if len(p) > 2]
    for q in queries:
        try:
            d = api_get(WIKI_API, {
                "action": "query", "list": "search", "srsearch": q,
                "srnamespace": 0, "srlimit": 3, "format": "json"})
        except Exception:
            continue
        for res in d.get("query", {}).get("search", []):
            title = res.get("title", "")
            snippet = res.get("snippet", "").lower()
            is_football = any(k in snippet for k in (
                "football", "footballer", "soccer", "striker", "midfielder",
                "defender", "goalkeeper", "winger", "forward", "club", "league",
                "caps", "goals"))
            name_match = any(p in fold(title) for p in name_parts)
            if name_match and is_football:
                return title
        time.sleep(DELAY)
    return None


# Filename fragments that mark a media-list entry as NOT a player portrait.
_NON_PORTRAIT = ("logo", "icon", ".svg", "flag", "map", "stadium", "trophy",
                 "badge", "coat_of_arms", "kit_", "commons-logo", "wpanthro")


def _media_list_files(title):
    """Ordered portrait candidates from the REST media-list (lead image first).
    Used both when PageImages has no entry and to find an acceptably-licensed
    alternative when the primary image's license is rejected."""
    t = urllib.parse.quote(title.replace(" ", "_"))
    url = "https://en.wikipedia.org/api/rest_v1/page/media-list/" + t
    try:
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=25) as r:
            items = json.load(r).get("items", [])
    except Exception:
        return []
    imgs = [m for m in items if m.get("type") == "image" and m.get("title")]
    ordered = ([m for m in imgs if m.get("leadImage")]
               + [m for m in imgs if not m.get("leadImage")])
    return [m["title"] for m in ordered
            if not any(tok in m["title"].lower() for tok in _NON_PORTRAIT)]


def get_candidate_files(title):
    """Ordered, de-duplicated Commons file titles to try for this article:
    the PageImages portrait first, then media-list candidates."""
    cands = []
    try:
        d = api_get(WIKI_API, {
            "action": "query", "titles": title, "prop": "pageimages",
            "piprop": "original", "format": "json"})
        for pid, page in d.get("query", {}).get("pages", {}).items():
            orig = page.get("original")
            if orig and orig.get("source"):
                fname = orig["source"].split("/")[-1].split("?")[0]
                cands.append("File:" + urllib.parse.unquote(fname))
    except Exception:
        pass
    for ft in _media_list_files(title):
        if ft not in cands:
            cands.append(ft)
    return cands


def get_fileinfo(file_title):
    """extmetadata license/author + original URL for a Commons file."""
    try:
        d = api_get(COMMONS_API, {
            "action": "query", "titles": file_title, "prop": "imageinfo",
            "iiprop": "extmetadata|url", "format": "json"})
    except Exception:
        return None
    for pid, page in d.get("query", {}).get("pages", {}).items():
        if pid == "-1":
            return None
        info = page.get("imageinfo") or [{}]
        meta = info[0].get("extmetadata", {})
        short = meta.get("LicenseShortName", {}).get("value", "")
        return {
            "url": info[0].get("url", ""),
            "license": short.strip(),
            "license_url": meta.get("LicenseUrl", {}).get("value", "").strip(),
            "artist": re.sub(r"<[^>]+>", "", meta.get("Artist", {}).get("value", "")).strip(),
        }
    return None


def license_ok(license_str):
    l = (license_str or "").lower().strip()
    if "nc" in l.split() or "-nc" in l or "noncommercial" in l:
        return False
    if "-nd" in l or "noderiv" in l:
        return False
    return any(tok in l for tok in ACCEPT_TOKENS)


def thumb_url(original_url, width=400):
    if "/commons/" in original_url and "/thumb/" not in original_url:
        pre, post = original_url.split("/commons/", 1)
        post = post.split("?")[0]
        fname = post.split("/")[-1]
        return "%s/commons/thumb/%s/%dpx-%s" % (pre, post, width, fname)
    return original_url


def process(player, verbose):
    title = search_article(player["name"], player.get("nationality", ""))
    if not title:
        if verbose:
            print("    no article")
        return None
    time.sleep(DELAY)
    candidates = get_candidate_files(title)
    if not candidates:
        if verbose:
            print("    no image candidates (%s)" % title)
        return None
    # Try each candidate in order; take the first with an acceptable license.
    rejected = []
    for file_title in candidates[:6]:
        time.sleep(DELAY)
        info = get_fileinfo(file_title)
        if not info or not info.get("url"):
            continue
        if not license_ok(info["license"]):
            rejected.append(info["license"])
            continue
        return {
            "image_url": thumb_url(info["url"], 400),
            "wikipedia_title": title,
            "license": info["license"],
            "license_url": info["license_url"],
            "artist": info["artist"],
        }
    if verbose:
        print("    no acceptable license among %d candidates (rejected: %s)"
              % (len(candidates), ", ".join(rejected) or "none"))
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--top", type=int, default=30,
                    help="process the N most famous new legends (default 30)")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--verbose", action="store_true")
    args = ap.parse_args()

    players = load_json(DB_PATH)
    fame = load_json(FAME_PATH)
    attributions = load_json(ATTR_PATH) if os.path.exists(ATTR_PATH) else {}

    fame_by_name = {e["name"].lower(): e.get("fame_score", 0) for e in fame}

    legends = [p for p in players if p["id"] >= LEGEND_ID_MIN]
    legends.sort(key=lambda p: fame_by_name.get(p["name"].lower(), 0), reverse=True)
    targets = [p for p in legends if not p.get("image_url")][:args.top]

    print("New legends: %d | processing top %d by fame" % (len(legends), len(targets)))
    found = 0
    by_license = {}
    for i, p in enumerate(targets):
        fs = fame_by_name.get(p["name"].lower(), 0)
        print("[%2d/%d] %-28s fame=%.1f" % (i + 1, len(targets), p["name"], fs))
        try:
            res = process(p, args.verbose)
        except Exception as e:
            print("    error: %s" % e)
            res = None
        if not res:
            continue
        found += 1
        key = res["license"].lower()
        by_license[key] = by_license.get(key, 0) + 1
        print("    OK  %s  by %s" % (res["license"], (res["artist"] or "?")[:40]))
        if not args.dry_run:
            p["image_url"] = res["image_url"]
            p["image_source"] = "wikimedia_commons"
            attributions[str(p["id"])] = {
                "player_name": p["name"],
                "wikipedia_title": res["wikipedia_title"],
                "license": res["license"].lower(),
                "license_url": res["license_url"],
                "artist": res["artist"],
                "image_url": res["image_url"],
            }

    print("\nImages found: %d / %d" % (found, len(targets)))
    for lic, n in sorted(by_license.items()):
        print("  %-16s %d" % (lic, n))

    if args.dry_run:
        print("[dry-run] nothing written")
        return
    if found:
        dump_json(DB_PATH, players)
        dump_json(ATTR_PATH, attributions)
        print("Wrote %s and %s" % (DB_PATH, ATTR_PATH))


if __name__ == "__main__":
    main()
