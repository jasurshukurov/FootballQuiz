#!/usr/bin/env python3
"""
Edge-case report: compares Kaggle vs salimt datasets to find players with
stale, missing, or conflicting data across the two sources.

Read-only analysis — does NOT modify any data files.
"""

import json
import os
import re
import sys
from pathlib import Path

import pandas as pd
import requests
from unidecode import unidecode

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
PROJECT_ROOT = Path("/Users/jasur/workspace/football")
KAGGLE_CSV = Path(
    os.path.expanduser(
        "~/.cache/kagglehub/datasets/davidcariboo/player-scores/versions/619/players.csv"
    )
)
SALIMT_URL = "https://raw.githubusercontent.com/salimt/football-datasets/main/datalake/transfermarkt/player_profiles/player_profiles.csv"
SALIMT_CACHE = PROJECT_ROOT / "data" / "cache" / "salimt_player_profiles.csv"
CAREER_PATHS = PROJECT_ROOT / "data" / "career_paths.json"
REPORT_OUT = PROJECT_ROOT / "data" / "edge_case_report.json"

TOP_LEAGUES = {"GB1", "ES1", "IT1", "L1", "FR1", "TR1", "NL1", "PT1"}


def normalize(name: str) -> str:
    if not isinstance(name, str):
        return ""
    # Strip trailing parenthetical IDs like "(10)" used in salimt dataset
    name = re.sub(r"\s*\(\d+\)\s*$", "", name)
    return unidecode(name).strip().lower()


def fmt_val(v) -> str:
    if pd.isna(v) or v is None:
        return "-"
    v = int(v)
    if v >= 1_000_000:
        return f"{v / 1_000_000:.1f}M"
    if v >= 1_000:
        return f"{v / 1_000:.0f}K"
    return str(v)


# ---------------------------------------------------------------------------
# Load data
# ---------------------------------------------------------------------------
def load_kaggle() -> pd.DataFrame:
    df = pd.read_csv(KAGGLE_CSV, low_memory=False)
    df["norm_name"] = df["name"].apply(normalize)
    return df


def load_salimt() -> pd.DataFrame:
    if SALIMT_CACHE.exists():
        print(f"  Using cached salimt data: {SALIMT_CACHE}")
        df = pd.read_csv(SALIMT_CACHE, low_memory=False)
    else:
        print(f"  Downloading salimt data from GitHub (~26MB)...")
        SALIMT_CACHE.parent.mkdir(parents=True, exist_ok=True)
        r = requests.get(SALIMT_URL, timeout=120)
        r.raise_for_status()
        SALIMT_CACHE.write_bytes(r.content)
        print(f"  Cached to {SALIMT_CACHE}")
        df = pd.read_csv(SALIMT_CACHE, low_memory=False)
    # Normalize name column — salimt uses 'name' or 'player_name'
    name_col = "name" if "name" in df.columns else "player_name" if "player_name" in df.columns else None
    if name_col is None:
        # Fallback: try combining first/last
        if "first_name" in df.columns and "last_name" in df.columns:
            df["name"] = (df["first_name"].fillna("") + " " + df["last_name"].fillna("")).str.strip()
        else:
            print("  WARNING: cannot find a name column in salimt data")
            print(f"  Columns: {list(df.columns)}")
            sys.exit(1)
    elif name_col != "name":
        df["name"] = df[name_col]
    df["norm_name"] = df["name"].apply(normalize)
    return df


def load_career_paths() -> list:
    with open(CAREER_PATHS, "r") as f:
        return json.load(f)


# ---------------------------------------------------------------------------
# Analysis helpers
# ---------------------------------------------------------------------------
def current_club_from_career(player: dict) -> str | None:
    career = player.get("career", [])
    if not career:
        return None
    last = career[-1]
    return last.get("club")


def print_table(rows: list[dict], columns: list[tuple[str, str]], max_rows: int = 30):
    """Print a simple table. columns = [(key, header), ...]"""
    if not rows:
        print("  (none)")
        return
    widths = {key: len(header) for key, header in columns}
    display = rows[:max_rows]
    for r in display:
        for key, _ in columns:
            widths[key] = max(widths[key], len(str(r.get(key, "-"))))

    header = " | ".join(h.ljust(widths[k]) for k, h in columns)
    sep = "-+-".join("-" * widths[k] for k, _ in columns)
    print(f"  {header}")
    print(f"  {sep}")
    for r in display:
        line = " | ".join(str(r.get(k, "-")).ljust(widths[k]) for k, _ in columns)
        print(f"  {line}")
    if len(rows) > max_rows:
        print(f"  ... and {len(rows) - max_rows} more")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    print("=" * 70)
    print("EDGE CASE REPORT: Kaggle vs salimt dataset comparison")
    print("=" * 70)
    print()

    print("[1/3] Loading datasets...")
    kaggle = load_kaggle()
    print(f"  Kaggle: {len(kaggle)} players")
    salimt = load_salimt()
    print(f"  salimt: {len(salimt)} players")
    career_data = load_career_paths()
    print(f"  career_paths.json: {len(career_data)} players")
    print()

    # Build lookup dicts
    # For kaggle: keep highest market-value row per norm_name
    kaggle_sorted = kaggle.sort_values("market_value_in_eur", ascending=False, na_position="last")
    kaggle_dedup = kaggle_sorted.drop_duplicates(subset="norm_name", keep="first")
    kaggle_map = {row["norm_name"]: row for _, row in kaggle_dedup.iterrows()}

    # Detect salimt club column
    salimt_club_col = None
    for c in ["current_club_name", "club_name", "current_club", "club"]:
        if c in salimt.columns:
            salimt_club_col = c
            break
    salimt_mv_col = None
    for c in ["market_value_in_eur", "market_value", "current_market_value"]:
        if c in salimt.columns:
            salimt_mv_col = c
            break

    print(f"  salimt club column: {salimt_club_col}")
    print(f"  salimt market value column: {salimt_mv_col or '(none)'}")
    print()

    salimt_sorted = salimt.copy()
    if salimt_mv_col:
        salimt_sorted[salimt_mv_col] = pd.to_numeric(salimt_sorted[salimt_mv_col], errors="coerce")
        salimt_sorted = salimt_sorted.sort_values(salimt_mv_col, ascending=False, na_position="last")
    salimt_dedup = salimt_sorted.drop_duplicates(subset="norm_name", keep="first")
    salimt_map = {row["norm_name"]: row for _, row in salimt_dedup.iterrows()}

    overlap = set(kaggle_map.keys()) & set(salimt_map.keys())
    print(f"  Name overlap between Kaggle and salimt: {len(overlap)} players")
    print(f"  Kaggle-only names: {len(set(kaggle_map.keys()) - set(salimt_map.keys()))}")
    print(f"  salimt-only names: {len(set(salimt_map.keys()) - set(kaggle_map.keys()))}")
    print()

    career_map = {}
    for p in career_data:
        nn = p.get("normalized_name") or normalize(p.get("name", ""))
        career_map[nn] = p

    report = {}

    # -----------------------------------------------------------------------
    # 1. Stale profiles in Kaggle
    # -----------------------------------------------------------------------
    print("-" * 70)
    print("1. STALE PROFILES IN KAGGLE (last_season < 2024, notable players)")
    print("-" * 70)

    stale = kaggle_dedup[
        (kaggle_dedup["last_season"] < 2024)
        & (
            (kaggle_dedup["market_value_in_eur"] >= 5_000_000)
            | (kaggle_dedup["current_club_domestic_competition_id"].isin(TOP_LEAGUES))
        )
    ].copy()
    stale = stale.sort_values("market_value_in_eur", ascending=False, na_position="last")

    stale_rows = []
    for _, row in stale.iterrows():
        nn = row["norm_name"]
        salimt_club = str(salimt_map[nn][salimt_club_col]) if nn in salimt_map and salimt_club_col else "-"
        our_club = current_club_from_career(career_map[nn]) if nn in career_map else "-"
        stale_rows.append({
            "name": row["name"],
            "kaggle_club": str(row.get("current_club_name", "-")),
            "salimt_club": salimt_club,
            "our_club": our_club,
            "last_season": str(int(row["last_season"])) if pd.notna(row["last_season"]) else "-",
            "market_value": fmt_val(row.get("market_value_in_eur")),
        })

    print(f"  Count: {len(stale_rows)}")
    print()
    print_table(stale_rows, [
        ("name", "Name"),
        ("kaggle_club", "Kaggle Club"),
        ("salimt_club", "salimt Club"),
        ("our_club", "Our Club"),
        ("last_season", "Last Season"),
        ("market_value", "Mkt Value"),
    ])
    report["stale_kaggle"] = {"count": len(stale_rows), "players": stale_rows}
    print()

    # -----------------------------------------------------------------------
    # 2. Club mismatch between sources
    # -----------------------------------------------------------------------
    print("-" * 70)
    print("2. CLUB MISMATCH: players in BOTH datasets with different clubs")
    print("-" * 70)

    common_names = set(kaggle_map.keys()) & set(salimt_map.keys())
    mismatch_rows = []
    for nn in common_names:
        k = kaggle_map[nn]
        s = salimt_map[nn]
        k_club = str(k.get("current_club_name", ""))
        s_club = str(s[salimt_club_col]) if salimt_club_col else ""
        if not k_club or not s_club or k_club == "nan" or s_club == "nan":
            continue
        if normalize(k_club) != normalize(s_club):
            mv = k.get("market_value_in_eur", 0) or 0
            if mv >= 1_000_000:
                our_club = current_club_from_career(career_map[nn]) if nn in career_map else "-"
                mismatch_rows.append({
                    "name": k["name"],
                    "kaggle_club": k_club,
                    "salimt_club": s_club,
                    "our_club": our_club,
                    "last_season": str(int(k["last_season"])) if pd.notna(k.get("last_season")) else "-",
                    "market_value": fmt_val(mv),
                    "_mv": mv,
                })
    mismatch_rows.sort(key=lambda x: x.get("_mv", 0), reverse=True)
    for r in mismatch_rows:
        r.pop("_mv", None)

    print(f"  Count: {len(mismatch_rows)}")
    print()
    print_table(mismatch_rows, [
        ("name", "Name"),
        ("kaggle_club", "Kaggle Club"),
        ("salimt_club", "salimt Club"),
        ("our_club", "Our Club"),
        ("last_season", "Last Season"),
        ("market_value", "Mkt Value"),
    ])
    report["club_mismatch"] = {"count": len(mismatch_rows), "players": mismatch_rows}
    print()

    # -----------------------------------------------------------------------
    # 3. In salimt but NOT in Kaggle (notable — in our career_paths)
    # -----------------------------------------------------------------------
    print("-" * 70)
    print("3. IN SALIMT BUT NOT IN KAGGLE (players also in our career_paths)")
    print("-" * 70)
    print("  Note: salimt has no market_value column, so we filter to players")
    print("  that also appear in our career_paths.json as a notability proxy.")
    print()

    salimt_only_names = set(salimt_map.keys()) - set(kaggle_map.keys())
    salimt_only_rows = []
    for nn in salimt_only_names:
        s = salimt_map[nn]
        s_club = str(s[salimt_club_col]) if salimt_club_col and pd.notna(s.get(salimt_club_col)) else "-"
        if nn in career_map:
            our_club = current_club_from_career(career_map[nn]) or "-"
            salimt_only_rows.append({
                "name": s["name"],
                "salimt_club": s_club,
                "our_club": our_club,
                "tier": career_map[nn].get("tier", "-"),
            })
    tier_order = {"legendary": 0, "world_class": 1, "star": 2, "notable": 3}
    salimt_only_rows.sort(key=lambda x: tier_order.get(x.get("tier", ""), 99))

    print(f"  Count: {len(salimt_only_rows)}")
    print()
    print_table(salimt_only_rows, [
        ("name", "Name"),
        ("salimt_club", "salimt Club"),
        ("our_club", "Our Club"),
        ("tier", "Tier"),
    ])
    report["missing_from_kaggle"] = {"count": len(salimt_only_rows), "players": salimt_only_rows}
    print()

    # -----------------------------------------------------------------------
    # 4. In Kaggle but NOT in salimt (notable)
    # -----------------------------------------------------------------------
    print("-" * 70)
    print("4. IN KAGGLE BUT NOT IN SALIMT (market value >= 1M)")
    print("-" * 70)

    kaggle_only_names = set(kaggle_map.keys()) - set(salimt_map.keys())
    kaggle_only_rows = []
    for nn in kaggle_only_names:
        k = kaggle_map[nn]
        mv = k.get("market_value_in_eur", 0) or 0
        if pd.isna(mv):
            mv = 0
        if mv >= 1_000_000:
            k_club = str(k.get("current_club_name", "-"))
            our_club = current_club_from_career(career_map[nn]) if nn in career_map else "-"
            kaggle_only_rows.append({
                "name": k["name"],
                "kaggle_club": k_club,
                "our_club": our_club,
                "last_season": str(int(k["last_season"])) if pd.notna(k.get("last_season")) else "-",
                "market_value": fmt_val(mv),
                "_mv": mv,
            })
    kaggle_only_rows.sort(key=lambda x: x.get("_mv", 0), reverse=True)
    for r in kaggle_only_rows:
        r.pop("_mv", None)

    print(f"  Count: {len(kaggle_only_rows)}")
    print()
    print_table(kaggle_only_rows, [
        ("name", "Name"),
        ("kaggle_club", "Kaggle Club"),
        ("our_club", "Our Club"),
        ("last_season", "Last Season"),
        ("market_value", "Mkt Value"),
    ])
    report["missing_from_salimt"] = {"count": len(kaggle_only_rows), "players": kaggle_only_rows}
    print()

    # -----------------------------------------------------------------------
    # 5. Career_paths players whose club doesn't match EITHER source
    # -----------------------------------------------------------------------
    print("-" * 70)
    print("5. CAREER_PATHS PLAYERS WHOSE CLUB DOESN'T MATCH EITHER SOURCE")
    print("-" * 70)

    career_mismatch_rows = []
    for p in career_data:
        nn = p.get("normalized_name") or normalize(p.get("name", ""))
        our_club = current_club_from_career(p)
        if not our_club:
            continue
        our_norm = normalize(our_club)

        k = kaggle_map.get(nn)
        s = salimt_map.get(nn)

        k_club = str(k["current_club_name"]) if k is not None and pd.notna(k.get("current_club_name")) else None
        s_club = str(s[salimt_club_col]) if s is not None and salimt_club_col and pd.notna(s.get(salimt_club_col)) else None

        k_match = k_club and normalize(k_club) == our_norm
        s_match = s_club and normalize(s_club) == our_norm

        if not k_match and not s_match:
            career_mismatch_rows.append({
                "name": p.get("name", ""),
                "our_club": our_club,
                "kaggle_club": k_club or "-",
                "salimt_club": s_club or "-",
                "tier": p.get("tier", "-"),
            })

    # Sort by tier importance
    tier_order = {"legendary": 0, "world_class": 1, "star": 2, "notable": 3}
    career_mismatch_rows.sort(key=lambda x: tier_order.get(x.get("tier", ""), 99))

    print(f"  Count: {len(career_mismatch_rows)}")
    print()
    print_table(career_mismatch_rows, [
        ("name", "Name"),
        ("our_club", "Our Club"),
        ("kaggle_club", "Kaggle Club"),
        ("salimt_club", "salimt Club"),
        ("tier", "Tier"),
    ])
    report["career_path_mismatch"] = {"count": len(career_mismatch_rows), "players": career_mismatch_rows}
    print()

    # -----------------------------------------------------------------------
    # Summary
    # -----------------------------------------------------------------------
    print("=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"  1. Stale Kaggle profiles:           {report['stale_kaggle']['count']}")
    print(f"  2. Club mismatch (Kaggle vs salimt): {report['club_mismatch']['count']}")
    print(f"  3. In salimt, missing from Kaggle:   {report['missing_from_kaggle']['count']}")
    print(f"  4. In Kaggle, missing from salimt:   {report['missing_from_salimt']['count']}")
    print(f"  5. Career paths mismatch both:       {report['career_path_mismatch']['count']}")
    print()

    # Save JSON
    REPORT_OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(REPORT_OUT, "w") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    print(f"Full report saved to: {REPORT_OUT}")


if __name__ == "__main__":
    main()
