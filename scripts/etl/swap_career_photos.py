#!/usr/bin/env python3
"""Swap Transfermarkt player photos for freely-licensed Wikimedia photos in the
Career Path dataset.

The Career Path data (``data/career_paths.json``) shipped with copyrighted
Transfermarkt portrait URLs. This script replaces every image with a Wikimedia
Commons image that carries an acceptable free licence, joining Career Path
players to ``data/image_attributions.json`` by folded (diacritic-stripped,
lower-cased) name.

Rules:
  * Licence allowlist: CC0, public domain / PD variants, CC BY (any version),
    CC BY-SA (any version). Everything else (fair use, GFDL-only, unknown) is
    rejected.
  * A player only keeps an image when exactly one acceptable candidate can be
    identified. When several attribution entries share a folded name, we
    disambiguate by nationality (looked up in ``players_db_v1.json`` for the
    attribution's id) and then by wikipedia_title; if still ambiguous the player
    is left with no image rather than a possibly-wrong namesake.
  * Every Transfermarkt URL is removed: unmatched / ambiguous / rejected players
    get ``image_url = ""``.

Outputs:
  * Rewrites ``data/career_paths.json`` in place (only image_url changes).
  * Writes ``data/career_photo_credits.json``: career_paths id -> attribution
    metadata for every player that received an image.

Run from the repo root:  python3 scripts/etl/swap_career_photos.py
"""
from __future__ import annotations

import html
import json
import re
import unicodedata
from pathlib import Path
from urllib.parse import unquote

REPO_ROOT = Path(__file__).resolve().parents[2]
DATA = REPO_ROOT / "data"
CAREER_PATHS = DATA / "career_paths.json"
ATTRIBUTIONS = DATA / "image_attributions.json"
PLAYERS_DB = DATA / "players_db_v1.json"
CREDITS_OUT = DATA / "career_photo_credits.json"

_TAG_RE = re.compile(r"<[^>]+>")
_WS_RE = re.compile(r"\s+")
_THUMB_WIDTH_RE = re.compile(r"/(\d+)px-")

# Source images that are verified missing on Commons (HTTP 404). The join would
# otherwise ship a broken image URL. Keyed by the original file basename.
KNOWN_DEAD_FILES = {
    # Declan Rice: file deleted/renamed on Commons, returns 404 (checked 2026-07).
    "1_declan_rice_arsenal_2025_(cropped).jpg",
}

# Wikimedia stopped rendering arbitrary thumbnail widths and now only serves a
# fixed allowlist of "common" sizes (see
# https://www.mediawiki.org/wiki/Common_thumbnail_sizes). The attribution data
# bakes in 400px, which is NOT on that list and now returns HTTP 400 ("Use
# thumbnail sizes listed on ..."). 330px is on the allowlist, is served for
# every image tested, and is small enough to avoid upscale rejections. We rewrite
# the thumbnail width so the shipped URLs actually load.
THUMB_WIDTH = "330"


def fold(name: str) -> str:
    """Normalise a name: strip diacritics, lower-case, collapse whitespace."""
    decomposed = unicodedata.normalize("NFD", name or "")
    stripped = "".join(c for c in decomposed if unicodedata.category(c) != "Mn")
    return _WS_RE.sub(" ", stripped.lower()).strip()


def clean_artist(artist: str) -> str:
    """Remove HTML markup / entities from an attribution artist string."""
    text = _TAG_RE.sub("", artist or "")
    text = html.unescape(text)
    return _WS_RE.sub(" ", text).strip()


def commons_basename(url: str) -> str:
    """Return the underlying Commons file name for a thumbnail or original URL."""
    if "/thumb/" in url:
        # .../thumb/x/xx/File.ext/NNNpx-File.ext -> File.ext
        name = url.split("/thumb/", 1)[1].rsplit("/", 1)[0].rsplit("/", 1)[-1]
    else:
        name = url.rsplit("/", 1)[-1]
    return unquote(name)


def is_usable_image(url: str) -> bool:
    """Reject images that can't be a player portrait or are known to be dead.

    Player photos on Commons are raster files (jpg/png). An SVG is always a crest,
    logo or flag wrongly attributed via a namesake collision, so we drop it rather
    than ship the wrong picture.
    """
    if ".svg" in url.lower():
        return False
    if commons_basename(url) in KNOWN_DEAD_FILES:
        return False
    return True


def normalize_thumb_width(url: str) -> str:
    """Rewrite a Wikimedia thumbnail URL to a currently-served width.

    Only the last path segment's ``NNNpx-`` prefix is touched; non-thumbnail
    (original) URLs are returned unchanged.
    """
    if "/thumb/" not in url:
        return url
    head, _, tail = url.rpartition("/")
    tail = re.sub(r"^\d+px-", f"{THUMB_WIDTH}px-", tail)
    return f"{head}/{tail}"


def classify_license(license_str: str):
    """Return (allowed: bool, needs_attribution: bool | None) for a licence."""
    lic = (license_str or "").strip().lower()
    if not lic:
        return False, None
    # CC0 and public-domain family require no attribution.
    if lic.startswith("cc0"):
        return True, False
    if "public domain" in lic or lic.startswith("pd"):
        return True, False
    # CC BY-SA must be checked before CC BY (prefix overlap).
    if lic.startswith("cc by-sa"):
        return True, True
    if lic.startswith("cc by"):
        return True, True
    return False, None


def main() -> None:
    career = json.loads(CAREER_PATHS.read_text(encoding="utf-8"))
    attributions = json.loads(ATTRIBUTIONS.read_text(encoding="utf-8"))
    players_db = json.loads(PLAYERS_DB.read_text(encoding="utf-8"))

    # players_db id -> folded nationality (for disambiguating namesakes).
    pdb_nat = {str(p["id"]): fold(p.get("nationality", "")) for p in players_db}

    # Index attribution entries by folded player name.
    by_name: dict[str, list[tuple[str, dict]]] = {}
    for attr_id, entry in attributions.items():
        by_name.setdefault(fold(entry.get("player_name", "")), []).append(
            (attr_id, entry)
        )

    credits: dict[str, dict] = {}
    stats = {
        "swapped": 0,
        "empty_no_match": 0,
        "ambiguous_skipped": 0,
        "rejected_license": 0,
        "unusable_image": 0,
    }
    license_breakdown = {"cc0_pd": 0, "cc_by": 0, "cc_by_sa": 0}

    for player in career:
        # Default: Transfermarkt URLs must never survive.
        player["image_url"] = ""

        candidates = by_name.get(fold(player["name"]), [])
        if not candidates:
            stats["empty_no_match"] += 1
            continue

        if len(candidates) == 1:
            chosen = candidates[0]
        else:
            chosen = disambiguate(player, candidates, pdb_nat)
            if chosen is None:
                stats["ambiguous_skipped"] += 1
                continue

        attr_id, entry = chosen
        allowed, needs_attr = classify_license(entry.get("license", ""))
        if not allowed:
            stats["rejected_license"] += 1
            continue

        image_url = entry.get("image_url", "")
        if not image_url or not is_usable_image(image_url):
            stats["unusable_image"] += 1
            continue

        player["image_url"] = normalize_thumb_width(image_url)
        stats["swapped"] += 1

        lic = (entry.get("license") or "").strip().lower()
        if needs_attr is False:
            license_breakdown["cc0_pd"] += 1
        elif lic.startswith("cc by-sa"):
            license_breakdown["cc_by_sa"] += 1
        else:
            license_breakdown["cc_by"] += 1

        credits[str(player["id"])] = {
            "artist": clean_artist(entry.get("artist", "")),
            "license": entry.get("license", ""),
            "license_url": entry.get("license_url", ""),
            "needs_attribution": bool(needs_attr),
        }

    CAREER_PATHS.write_text(
        json.dumps(career, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    CREDITS_OUT.write_text(
        json.dumps(credits, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    print("Career photo swap complete")
    print(f"  swapped (got Wikimedia image): {stats['swapped']}")
    print(f"  empty (no name match):         {stats['empty_no_match']}")
    print(f"  ambiguous (namesake skipped):  {stats['ambiguous_skipped']}")
    print(f"  rejected (bad licence):        {stats['rejected_license']}")
    print(f"  unusable (svg / dead source):  {stats['unusable_image']}")
    print("  licence breakdown of swapped:")
    print(f"    cc0 / public domain: {license_breakdown['cc0_pd']}")
    print(f"    cc by:               {license_breakdown['cc_by']}")
    print(f"    cc by-sa:            {license_breakdown['cc_by_sa']}")
    print(f"  credits written: {len(credits)} -> {CREDITS_OUT.relative_to(REPO_ROOT)}")


def disambiguate(player, candidates, pdb_nat):
    """Pick a single attribution candidate for a namesake, or None if unclear."""
    # Duplicate attribution rows for the same person: if every candidate points
    # at the same image, it's not a real namesake conflict — pick either.
    if len({c[1].get("image_url", "") for c in candidates}) == 1:
        return candidates[0]

    want_nat = fold(player.get("nationality", ""))

    # 1) nationality match via players_db row for the attribution id.
    if want_nat:
        nat_hits = [c for c in candidates if pdb_nat.get(c[0]) == want_nat]
        if len(nat_hits) == 1:
            return nat_hits[0]
        if len(nat_hits) > 1:
            candidates = nat_hits  # narrow, then fall through to title check

    # 2) exact wikipedia_title match on the player's name.
    want_name = fold(player["name"])
    title_hits = [
        c for c in candidates if fold(c[1].get("wikipedia_title", "")) == want_name
    ]
    if len(title_hits) == 1:
        return title_hits[0]

    return None


if __name__ == "__main__":
    main()
