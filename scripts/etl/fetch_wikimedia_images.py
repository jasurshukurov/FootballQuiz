#!/usr/bin/env python3
"""
Wikimedia Commons player image fetcher.

Searches Wikipedia for football player articles, extracts the main image
from Wikimedia Commons, and updates players_db with legally safe CC-licensed
image URLs along with proper attribution metadata.

Usage:
    python3 scripts/etl/fetch_wikimedia_images.py [--dry-run] [--limit N] [--verbose]

The MediaWiki API is free and requires no API key.
Rate limit: ~200 requests/sec (we use conservative batching).
"""

import json
import logging
import sys
import time
import urllib.parse
from pathlib import Path

# --- Dependency check ---
_missing = []
for _mod in ("requests", "unidecode"):
    try:
        __import__(_mod)
    except ImportError:
        _missing.append(_mod)
if _missing:
    print(f"Missing required packages: {', '.join(_missing)}")
    print(f"Install them with:\n  pip install {' '.join(_missing)}")
    sys.exit(1)

import requests
from unidecode import unidecode

# --- Configuration ---
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parents[2]
PLAYERS_DB_PATH = PROJECT_ROOT / "data" / "players_db_v1.json"
OUTPUT_PATH = PROJECT_ROOT / "data" / "players_db_v1.json"
ATTRIBUTION_PATH = PROJECT_ROOT / "data" / "image_attributions.json"

WIKI_API = "https://en.wikipedia.org/w/api.php"
COMMONS_API = "https://commons.wikimedia.org/w/api.php"

SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": "FootballTriviaApp/1.0 (https://github.com/jasur-2902/FootballQuiz; jasur@dev) python-requests",
})

# Conservative rate limiting
REQUEST_DELAY = 0.1  # 100ms between requests
BATCH_SIZE = 50      # MediaWiki API allows up to 50 titles per query

# Allowed CC licenses (safe for commercial use)
ALLOWED_LICENSES = {
    "cc-by-sa-4.0", "cc-by-sa-3.0", "cc-by-sa-2.5", "cc-by-sa-2.0",
    "cc-by-4.0", "cc-by-3.0", "cc-by-2.5", "cc-by-2.0",
    "cc0", "pd", "public domain",
}


def search_player_article(player_name: str, nationality: str = "") -> str | None:
    """Search Wikipedia for a footballer's article and return the exact title."""
    # Try specific search first: "Name footballer" or "Name soccer"
    queries = [
        f"{player_name} footballer",
        f"{player_name} football player",
        player_name,
    ]
    if nationality:
        queries.insert(0, f"{player_name} {nationality} footballer")

    for query in queries:
        params = {
            "action": "query",
            "list": "search",
            "srsearch": query,
            "srnamespace": 0,
            "srlimit": 3,
            "format": "json",
        }
        try:
            resp = SESSION.get(WIKI_API, params=params, timeout=15)
            resp.raise_for_status()
            results = resp.json().get("query", {}).get("search", [])
        except Exception:
            continue

        for result in results:
            title = result.get("title", "")
            snippet = result.get("snippet", "").lower()
            title_lower = title.lower()
            name_lower = unidecode(player_name).lower()

            # Check if the result is about a footballer
            is_football = any(kw in snippet for kw in [
                "football", "footballer", "soccer", "striker", "midfielder",
                "defender", "goalkeeper", "winger", "forward", "club",
                "league", "premier", "la liga", "bundesliga", "serie a",
                "ligue 1", "caps", "goals",
            ])

            # Check name appears in title
            name_parts = name_lower.split()
            name_match = any(part in unidecode(title_lower) for part in name_parts if len(part) > 2)

            if name_match and is_football:
                return title

        time.sleep(REQUEST_DELAY)

    return None


def get_page_image(title: str) -> dict | None:
    """Get the main image (pageimage) for a Wikipedia article.

    Returns dict with 'url', 'title' (file title), 'width', 'height' or None.
    """
    params = {
        "action": "query",
        "titles": title,
        "prop": "pageimages|pageterms",
        "piprop": "original",
        "format": "json",
    }
    try:
        resp = SESSION.get(WIKI_API, params=params, timeout=15)
        resp.raise_for_status()
        pages = resp.json().get("query", {}).get("pages", {})
    except Exception:
        return None

    for page_id, page_data in pages.items():
        if page_id == "-1":
            return None
        original = page_data.get("original")
        if original and original.get("source"):
            return {
                "url": original["source"],
                "file_title": f"File:{original['source'].split('/')[-1].split('?')[0]}",
                "width": original.get("width", 0),
                "height": original.get("height", 0),
            }
    return None


def get_image_license(file_title: str) -> dict | None:
    """Query Wikimedia Commons for image license and attribution info.

    Returns dict with 'license', 'artist', 'description' or None.
    """
    # Use the actual filename from the URL
    params = {
        "action": "query",
        "titles": file_title,
        "prop": "imageinfo",
        "iiprop": "extmetadata|url",
        "format": "json",
    }
    try:
        resp = SESSION.get(COMMONS_API, params=params, timeout=15)
        resp.raise_for_status()
        pages = resp.json().get("query", {}).get("pages", {})
    except Exception:
        return None

    for page_id, page_data in pages.items():
        if page_id == "-1":
            return None
        imageinfo = page_data.get("imageinfo", [{}])
        if not imageinfo:
            return None

        meta = imageinfo[0].get("extmetadata", {})
        license_short = meta.get("LicenseShortName", {}).get("value", "").lower()
        license_url = meta.get("LicenseUrl", {}).get("value", "")
        artist = meta.get("Artist", {}).get("value", "")
        description = meta.get("ImageDescription", {}).get("value", "")

        # Clean HTML from artist field
        import re
        artist_clean = re.sub(r"<[^>]+>", "", artist).strip()

        return {
            "license": license_short,
            "license_url": license_url,
            "artist": artist_clean,
            "description": re.sub(r"<[^>]+>", "", description).strip(),
        }

    return None


def is_license_safe(license_str: str) -> bool:
    """Check if the license allows commercial use."""
    l = license_str.lower().strip()
    # Check against known safe licenses
    for safe in ALLOWED_LICENSES:
        if safe in l:
            return True
    # Also allow "attribution" and "share alike" variants
    if "cc" in l and ("by" in l) and "nc" not in l and "nd" not in l:
        return True
    if "public domain" in l or "pd" in l or "cc0" in l:
        return True
    return False


def get_wikimedia_thumb_url(original_url: str, width: int = 400) -> str:
    """Convert a Wikimedia original image URL to a thumbnail URL.

    This uses Wikimedia's built-in thumbnail service which is explicitly
    designed for external use.
    """
    # Original URL format:
    # https://upload.wikimedia.org/wikipedia/commons/a/ab/FileName.jpg
    # Thumb URL format:
    # https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/FileName.jpg/400px-FileName.jpg

    if "/commons/" in original_url and "/thumb/" not in original_url:
        parts = original_url.split("/commons/")
        if len(parts) == 2:
            filename = parts[1].split("/")[-1].split("?")[0]
            return f"{parts[0]}/commons/thumb/{parts[1].split('?')[0]}/{width}px-{filename}"

    return original_url


def process_player(player: dict, verbose: bool = False) -> dict | None:
    """Process a single player: search Wikipedia, get image, verify license.

    Returns dict with image info and attribution, or None if not found/not safe.
    """
    name = player.get("name", "")
    nationality = player.get("nationality", "")

    if not name:
        return None

    # Step 1: Find Wikipedia article
    title = search_player_article(name, nationality)
    if not title:
        if verbose:
            log.debug(f"  No Wikipedia article found for: {name}")
        return None
    time.sleep(REQUEST_DELAY)

    # Step 2: Get main image
    image_info = get_page_image(title)
    if not image_info:
        if verbose:
            log.debug(f"  No image found for: {name} ({title})")
        return None
    time.sleep(REQUEST_DELAY)

    # Step 3: Check license on Wikimedia Commons
    file_title = image_info["file_title"]
    # URL-decode the file title for the API query
    file_title_decoded = urllib.parse.unquote(file_title)
    license_info = get_image_license(file_title_decoded)
    time.sleep(REQUEST_DELAY)

    if not license_info:
        if verbose:
            log.debug(f"  Could not fetch license for: {name} ({file_title})")
        return None

    if not is_license_safe(license_info["license"]):
        if verbose:
            log.debug(f"  Unsafe license for {name}: {license_info['license']}")
        return None

    # Step 4: Build result with thumbnail URL
    thumb_url = get_wikimedia_thumb_url(image_info["url"], width=400)

    return {
        "image_url": thumb_url,
        "image_source": "wikimedia_commons",
        "wikipedia_title": title,
        "attribution": {
            "license": license_info["license"],
            "license_url": license_info["license_url"],
            "artist": license_info["artist"],
        },
    }


def main() -> None:
    import argparse
    parser = argparse.ArgumentParser(description="Fetch player images from Wikimedia Commons")
    parser.add_argument("--dry-run", action="store_true", help="Don't modify files")
    parser.add_argument("--limit", type=int, default=0, help="Process only first N players (0=all)")
    parser.add_argument("--verbose", action="store_true", help="Show detailed progress")
    parser.add_argument("--skip-existing", action="store_true",
                        help="Skip players that already have wikimedia images")
    args = parser.parse_args()

    log.info("=== Wikimedia Commons Image Fetcher ===")

    # Load players
    if not PLAYERS_DB_PATH.exists():
        log.error(f"Players DB not found: {PLAYERS_DB_PATH}")
        sys.exit(1)

    with open(PLAYERS_DB_PATH, "r", encoding="utf-8") as f:
        players = json.load(f)
    log.info(f"Loaded {len(players):,} players")

    # Load existing attributions
    attributions: dict[str, dict] = {}
    if ATTRIBUTION_PATH.exists():
        with open(ATTRIBUTION_PATH, "r", encoding="utf-8") as f:
            attributions = json.load(f)
        log.info(f"Loaded {len(attributions):,} existing attributions")

    # Process players
    subset = players[:args.limit] if args.limit > 0 else players
    total = len(subset)
    found = 0
    skipped = 0
    failed = 0
    updated = 0

    log.info(f"Processing {total:,} players...")

    for i, player in enumerate(subset):
        player_id = str(player.get("id", ""))
        name = player.get("name", "")

        # Progress logging
        if (i + 1) % 100 == 0 or i == 0:
            log.info(f"  Progress: {i+1}/{total} ({found} found, {skipped} skipped, {failed} failed)")

        # Skip if already has wikimedia image
        if args.skip_existing and player.get("image_source") == "wikimedia_commons":
            skipped += 1
            continue

        # Skip if already in attributions (from previous run)
        if args.skip_existing and player_id in attributions:
            skipped += 1
            continue

        result = process_player(player, verbose=args.verbose)

        if result:
            found += 1
            if not args.dry_run:
                player["image_url"] = result["image_url"]
                player["image_source"] = "wikimedia_commons"
                attributions[player_id] = {
                    "player_name": name,
                    "wikipedia_title": result["wikipedia_title"],
                    "license": result["attribution"]["license"],
                    "license_url": result["attribution"]["license_url"],
                    "artist": result["attribution"]["artist"],
                    "image_url": result["image_url"],
                }
                updated += 1
        else:
            failed += 1

    # Report
    log.info("")
    log.info("=" * 60)
    log.info("=== WIKIMEDIA IMAGE FETCH REPORT ===")
    log.info("=" * 60)
    log.info(f"Total processed: {total:,}")
    log.info(f"Images found (CC-licensed): {found:,}")
    log.info(f"Not found or unsafe license: {failed:,}")
    log.info(f"Skipped (already done): {skipped:,}")
    log.info(f"Coverage: {found}/{total} ({100*found/max(total,1):.1f}%)")

    if not args.dry_run and updated > 0:
        # Save updated players DB
        with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
            json.dump(players, f, ensure_ascii=False, indent=2)
        log.info(f"Updated {updated:,} player image URLs in {OUTPUT_PATH}")

        # Save attributions
        ATTRIBUTION_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(ATTRIBUTION_PATH, "w", encoding="utf-8") as f:
            json.dump(attributions, f, ensure_ascii=False, indent=2)
        log.info(f"Saved {len(attributions):,} attributions to {ATTRIBUTION_PATH}")
        log.info("")
        log.info("IMPORTANT: Include image_attributions.json in your app's")
        log.info("'Image Credits' screen to comply with CC BY-SA requirements.")
    elif args.dry_run:
        log.info("")
        log.info("[DRY RUN] No files were modified.")
        log.info("Run without --dry-run to update player images.")

    # Sample output
    if found > 0:
        log.info("")
        log.info("Sample results:")
        sample_count = 0
        for p in subset:
            if p.get("image_source") == "wikimedia_commons" or (args.dry_run and sample_count < 5):
                break
        # Show from attributions
        for pid, attr in list(attributions.items())[:10]:
            log.info(f"  {attr.get('player_name', pid)}: {attr.get('license', '?')} by {attr.get('artist', '?')[:50]}")


if __name__ == "__main__":
    main()
