#!/usr/bin/env python3
"""Strip image data from already-shipped daily puzzle payloads.

The daily puzzles were generated with Transfermarkt image references: a top-level
``_imgBase`` (``https://img.a.transfermarkt.technology/...``) plus per-player
``img`` fields. Nothing in the app renders those images, and the base URL is
copyrighted, so they must not ship.

Regenerating the historical ``*.min.json`` files is not deterministic (player
selection depends on the current database and usage-tracker state, which have
drifted since these puzzles were generated), so we strip the image keys in place
instead. This removes:
  * the top-level ``_imgBase`` key,
  * the ``img`` -> ``image_url`` entry from the ``_keys`` compression map,
  * every ``img`` key nested anywhere in the payload.

The minified single-line JSON layout is preserved.

Run from the repo root:  python3 scripts/etl/strip_daily_puzzle_images.py
"""
from __future__ import annotations

import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
PUZZLE_DIR = REPO_ROOT / "data" / "daily_puzzles"


def strip_img_keys(node) -> int:
    """Recursively delete every ``img`` key. Returns the number removed."""
    removed = 0
    if isinstance(node, dict):
        if "img" in node:
            del node["img"]
            removed += 1
        for value in node.values():
            removed += strip_img_keys(value)
    elif isinstance(node, list):
        for item in node:
            removed += strip_img_keys(item)
    return removed


def main() -> None:
    files = sorted(PUZZLE_DIR.glob("*.min.json"))
    if not files:
        print(f"No *.min.json files found in {PUZZLE_DIR}")
        return

    for path in files:
        data = json.loads(path.read_text(encoding="utf-8"))
        had_base = data.pop("_imgBase", None) is not None
        keys_map = data.get("_keys")
        had_keys_entry = isinstance(keys_map, dict) and keys_map.pop("img", None) is not None
        removed = strip_img_keys(data)
        path.write_text(
            json.dumps(data, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )
        print(
            f"{path.name}: removed _imgBase={had_base}, "
            f"_keys.img={had_keys_entry}, img fields={removed}"
        )


if __name__ == "__main__":
    main()
