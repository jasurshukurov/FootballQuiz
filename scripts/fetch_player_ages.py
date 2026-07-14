#!/usr/bin/env python3
"""
Rebuild data/player_ages.json (internal player id -> "YYYY-MM-DD 00:00:00" DOB)
for the guessable pool (fame_by_id.json fame_score >= 55) using an
ID-VERIFIED / NAME-VALIDATED join against two Transfermarkt-derived sources.

History / why this exists
-------------------------
A previous run of this script family produced a systemically corrupted
player_ages.json: DOBs were looked up in the wrong id space (fame_scores.json
`global_id`s are NOT players_db ids), so most entries were random other
players' birth dates. Our internal players_db_v1.json ids ARE genuine
Transfermarkt player ids for scraped players (verified: 8198=Ronaldo,
28003=Messi, 258923=Rashford, ...), EXCEPT hand-added legends which use
synthetic ids >= 1_600_000 and never exist in TM datasets.

Join logic (per pool player)
----------------------------
Sources (both keyed by real TM player_id, cross-checked against each other):
  1. salimt/football-datasets player_profiles.csv
     (cached at data/cache/salimt_player_profiles.csv — same file the repo's
     fetch_salimt_datasets.py uses)
  2. transfermarkt-datasets players.csv from the public DVC bucket
     (same storage scripts/etl/fetch_transfermarkt_datasets.py uses;
     cached at data/cache/tm_datasets_players.csv)

Stage A — id join, name-verified:
  Look up our internal id in both sources. A hit only counts if the source
  row's name matches ours (diacritics-folded exact match of any of the
  source's name fields, or a token-subset match corroborated by nationality).
  If both sources hit with different DOBs -> skip (dob_conflict).

Stage B — name join with namesake disambiguation (players with no verified
id hit, e.g. synthetic-id legends):
  Candidates = rows whose normalized (or token-sorted) full name equals ours,
  from both sources merged by TM id. A candidate must pass nationality
  agreement (when both sides have it). Corroborations:
    (a) TM current/last club appears in our club list (career_paths +
        transfers + current_team, compared via scripts/etl/club_normalizer)
    (b) implied age at our first recorded career stint is 14-30
    (c) position family (GK/DF/MF/FW) matches, plus nationality
  Exactly one candidate with nationality agreement + plausible age +
  (a corroboration, or no career data to check) -> accept.
  Multiple candidates -> require club corroboration (a) to single one out,
  else skip (ambiguous_name).

Validation gate (every accepted DOB):
  - implied current age 14-50 for status=active, 14-90 otherwise
  - implied age at first recorded career stint 13-35 (when career known);
    relaxed to 8-35 for exact-name id joins because career_paths.json
    includes youth-academy stints
  - hard ground-truth asserts (Rashford 1997, Vinicius Junior 2000,
    Alisson 1992, Pickford 1994, Werner 1996, Gabriel Jesus 1997,
    Calhanoglu 1994, Upamecano 1998): any mismatch or miss aborts the run
    and nothing is written.

Unresolved players get NO entry (consumers treat missing as null); every
skip is logged with a reason. Re-runnable; downloads are cached under
data/cache/.

Usage:
    python3 scripts/fetch_player_ages.py
"""

from __future__ import annotations

import gzip
import io
import json
import logging
import random
import re
import sys
from collections import Counter
from datetime import date
from pathlib import Path

_missing = []
for _mod in ("pandas", "requests", "unidecode"):
    try:
        __import__(_mod)
    except ImportError:
        _missing.append(_mod)
if _missing:
    print(f"Missing required packages: {', '.join(_missing)}")
    print(f"Install them with:\n  pip install {' '.join(_missing)}")
    sys.exit(1)

import pandas as pd
import requests
from unidecode import unidecode

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = PROJECT_ROOT / "data"
CACHE_DIR = DATA_DIR / "cache"

sys.path.insert(0, str(PROJECT_ROOT / "scripts" / "etl"))
from club_normalizer import normalize_club  # noqa: E402

# --- Sources ---------------------------------------------------------------

SALIMT_URL = (
    "https://raw.githubusercontent.com/salimt/football-datasets/main/"
    "datalake/transfermarkt/player_profiles/player_profiles.csv"
)
SALIMT_CACHE = CACHE_DIR / "salimt_player_profiles.csv"

# DVC remote (public R2 bucket) — same as scripts/etl/fetch_transfermarkt_datasets.py
DVC_BASE = "https://pub-e682421888d945d684bcae8890b0ec20.r2.dev/dvc/"
DVC_DIR_PATH = "files/md5/0f/72998dde02fc0ca9a9a172f92c609e.dir"
TMD_CACHE = CACHE_DIR / "tm_datasets_players.csv"

REQUEST_TIMEOUT = 120
HEADERS = {"User-Agent": "football-etl/1.0"}

FAME_THRESHOLD = 55
TODAY = date.today()

# Ground truths: normalized DB name -> required birth year.
GROUND_TRUTHS = {
    "marcus rashford": 1997,
    "vinicius junior": 2000,
    "alisson": 1992,
    "jordan pickford": 1994,
    "timo werner": 1996,
    "gabriel jesus": 1997,
    "hakan calhanoglu": 1994,
    "dayot upamecano": 1998,
}

# --- Normalization helpers ---------------------------------------------------

_PUNCT_RE = re.compile(r"[^a-z0-9 ]+")
_WS_RE = re.compile(r"\s+")


def norm_name(s: str | None) -> str:
    """Diacritics-folded, lowercased, punctuation-stripped name."""
    if not s or not isinstance(s, str):
        return ""
    s = unidecode(s).lower()
    s = _PUNCT_RE.sub(" ", s)
    return _WS_RE.sub(" ", s).strip()


def token_key(s: str) -> str:
    """Order-insensitive key: sorted tokens of the normalized name."""
    return " ".join(sorted(norm_name(s).split()))


COUNTRY_ALIASES = {
    "united states of america": "united states",
    "usa": "united states",
    "cote d ivoire": "ivory coast",
    "turkiye": "turkey",
    "republic of ireland": "ireland",
    "bosnia herzegovina": "bosnia and herzegovina",
    "cabo verde": "cape verde",
    "congo dr": "dr congo",
    "democratic republic of the congo": "dr congo",
    "the democratic republic of the congo": "dr congo",
    "korea south": "south korea",
    "korea republic": "south korea",
    "czechia": "czech republic",
    "north macedonia": "macedonia",
}


def norm_country(s: str | None) -> str:
    n = norm_name(s)
    return COUNTRY_ALIASES.get(n, n)


def tm_citizenships(row: dict) -> set[str]:
    """All citizenship countries a TM row lists (salimt packs several,
    double-space separated, e.g. 'England  St. Kitts & Nevis')."""
    out: set[str] = set()
    for field in ("citizenship", "country_of_citizenship"):
        raw = row.get(field)
        if raw and isinstance(raw, str):
            for part in re.split(r"\s{2,}", raw.strip()):
                c = norm_country(part)
                if c:
                    out.add(c)
    return out


def nationality_agrees(our_nat: str, row: dict) -> bool | None:
    """True/False when both sides have data, None when either side lacks it."""
    ours = norm_country(our_nat)
    theirs = tm_citizenships(row)
    if not ours or not theirs:
        return None
    return ours in theirs


POSITION_FAMILY = {
    "goalkeeper": "GK",
    "defender": "DF",
    "defence": "DF",
    "midfield": "MF",
    "midfielder": "MF",
    "attack": "FW",
    "forward": "FW",
    "striker": "FW",
}


def pos_family(s: str | None) -> str | None:
    if not s or not isinstance(s, str):
        return None
    head = norm_name(s).split("-")[0].strip()
    first = head.split()[0] if head.split() else ""
    return POSITION_FAMILY.get(head) or POSITION_FAMILY.get(first)


def parse_dob(raw) -> date | None:
    if raw is None or (isinstance(raw, float) and pd.isna(raw)):
        return None
    s = str(raw)[:10]
    try:
        d = date.fromisoformat(s)
    except ValueError:
        return None
    if d.year < 1900 or d > TODAY:
        return None
    return d


def implied_age(dob: date, on: date | None = None) -> float:
    ref = on or TODAY
    return (ref - dob).days / 365.25


# --- Data loading -------------------------------------------------------------


def _download(url: str, dest: Path, desc: str) -> None:
    log.info(f"Downloading {desc}...")
    resp = requests.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT)
    resp.raise_for_status()
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(resp.content)
    log.info(f"Cached {desc} -> {dest} ({dest.stat().st_size:,} bytes)")


def load_salimt() -> pd.DataFrame:
    if not SALIMT_CACHE.exists():
        _download(SALIMT_URL, SALIMT_CACHE, "salimt player_profiles.csv (~26MB)")
    else:
        log.info(f"Using cached salimt profiles: {SALIMT_CACHE}")
    df = pd.read_csv(SALIMT_CACHE, low_memory=False)
    # player_name carries a "(12345)" disambiguation suffix — strip it.
    df["clean_name"] = df["player_name"].astype(str).str.replace(
        r"\s*\(\d+\)\s*$", "", regex=True
    )
    return df


def load_tm_datasets() -> pd.DataFrame:
    if not TMD_CACHE.exists():
        log.info("Fetching DVC directory listing...")
        resp = requests.get(DVC_BASE + DVC_DIR_PATH, headers=HEADERS, timeout=REQUEST_TIMEOUT)
        resp.raise_for_status()
        file_index = {e["relpath"]: e["md5"] for e in resp.json()}
        md5 = file_index["players.csv.gz"]
        url = f"{DVC_BASE}files/md5/{md5[:2]}/{md5[2:]}"
        log.info("Downloading transfermarkt-datasets players.csv.gz...")
        resp = requests.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT)
        resp.raise_for_status()
        raw = gzip.decompress(resp.content)
        TMD_CACHE.parent.mkdir(parents=True, exist_ok=True)
        TMD_CACHE.write_bytes(raw)
        log.info(f"Cached -> {TMD_CACHE} ({len(raw):,} bytes)")
    else:
        log.info(f"Using cached transfermarkt-datasets players: {TMD_CACHE}")
    return pd.read_csv(TMD_CACHE, low_memory=False)


def source_rows(df: pd.DataFrame, source: str) -> list[dict]:
    """Uniform candidate dicts from either source."""
    rows = []
    if source == "salimt":
        cols = [
            "player_id", "clean_name", "name_in_home_country", "player_slug",
            "date_of_birth", "citizenship", "main_position", "position",
            "current_club_name",
        ]
        sub = df[[c for c in cols if c in df.columns]]
        for r in sub.itertuples(index=False):
            d = r._asdict()
            rows.append({
                "tm_id": int(d["player_id"]),
                "source": source,
                "names": [d.get("clean_name"), d.get("name_in_home_country"),
                          str(d.get("player_slug") or "").replace("-", " ")],
                "dob": parse_dob(d.get("date_of_birth")),
                "citizenship": d.get("citizenship"),
                "position": d.get("main_position") or d.get("position"),
                "club": d.get("current_club_name"),
            })
    else:
        cols = [
            "player_id", "name", "first_name", "last_name", "date_of_birth",
            "country_of_citizenship", "position", "current_club_name",
        ]
        sub = df[[c for c in cols if c in df.columns]]
        for r in sub.itertuples(index=False):
            d = r._asdict()
            fn = d.get("first_name")
            ln = d.get("last_name")
            combo = f"{fn} {ln}" if isinstance(fn, str) and isinstance(ln, str) else None
            rows.append({
                "tm_id": int(d["player_id"]),
                "source": source,
                "names": [d.get("name"), combo],
                "dob": parse_dob(d.get("date_of_birth")),
                "country_of_citizenship": d.get("country_of_citizenship"),
                "position": d.get("position"),
                "club": d.get("current_club_name"),
            })
    return rows


# --- Career corroboration -------------------------------------------------------


def build_career_maps() -> tuple[dict[str, int], dict[str, set[str]]]:
    """By normalized player name: first recorded career year, and club set
    (normalized short forms) from career_paths.json + transfers.json."""
    first_year: dict[str, int] = {}
    clubs: dict[str, set[str]] = {}

    cp_path = DATA_DIR / "career_paths.json"
    if cp_path.exists():
        for p in json.loads(cp_path.read_text()):
            key = norm_name(p.get("name"))
            years = [s.get("from") for s in p.get("career", []) if isinstance(s.get("from"), int)]
            if key and years:
                y = min(years)
                first_year[key] = min(first_year.get(key, y), y)
            for s in p.get("career", []):
                if s.get("club"):
                    clubs.setdefault(key, set()).add(normalize_club(s["club"]))

    tr_path = DATA_DIR / "transfers.json"
    if tr_path.exists():
        for p in json.loads(tr_path.read_text()):
            key = norm_name(p.get("player_name"))
            for t in p.get("transfers", []):
                dj = t.get("date_joined")
                if dj and re.match(r"^\d{4}", str(dj)):
                    y = int(str(dj)[:4])
                    first_year[key] = min(first_year.get(key, y), y)
                if t.get("club_name"):
                    clubs.setdefault(key, set()).add(normalize_club(t["club_name"]))
    return first_year, clubs


# --- Matching ----------------------------------------------------------------


def name_verified(our_names: list[str], cand: dict) -> str | None:
    """'exact' if any candidate name equals ours after folding (or same token
    set), 'tokens' if one name's tokens are a subset of the other's."""
    our_norms = {norm_name(n) for n in our_names if n}
    our_keys = {token_key(n) for n in our_names if n}
    our_tokens = [set(n.split()) for n in our_norms if n]
    best = None
    for raw in cand["names"]:
        n = norm_name(raw)
        if not n:
            continue
        if n in our_norms or token_key(raw) in our_keys:
            return "exact"
        toks = set(n.split())
        for ours in our_tokens:
            if ours and toks and (ours <= toks or toks <= ours):
                best = "tokens"
    return best


def main() -> None:
    players_db = json.loads((DATA_DIR / "players_db_v1.json").read_text())
    fame_by_id = json.loads((DATA_DIR / "fame_by_id.json").read_text())
    db_by_id = {p["id"]: p for p in players_db}

    pool = {
        int(pid): db_by_id[int(pid)]
        for pid, fame in fame_by_id.items()
        if fame.get("fame_score", 0) >= FAME_THRESHOLD and int(pid) in db_by_id
    }
    active_pool = {pid for pid, p in pool.items() if p.get("status") != "retired"}
    log.info(
        f"DB players: {len(players_db)}; fame>={FAME_THRESHOLD} pool: {len(pool)} "
        f"({len(active_pool)} active)"
    )

    salimt_rows = source_rows(load_salimt(), "salimt")
    tmd_rows = source_rows(load_tm_datasets(), "tmd")
    log.info(f"Source rows: salimt={len(salimt_rows):,}, tm-datasets={len(tmd_rows):,}")

    by_id: dict[int, list[dict]] = {}
    by_name: dict[str, list[dict]] = {}
    for cand in salimt_rows + tmd_rows:
        by_id.setdefault(cand["tm_id"], []).append(cand)
        seen_keys = set()
        for raw in cand["names"]:
            for key in (norm_name(raw), token_key(raw)):
                if key and key not in seen_keys:
                    seen_keys.add(key)
                    by_name.setdefault(key, []).append(cand)

    first_year_by_name, clubs_by_name = build_career_maps()

    result: dict[str, str] = {}
    accepted_meta: list[tuple[int, str, date, str]] = []  # id, name, dob, stage
    skips: Counter[str] = Counter()
    skip_log: list[str] = []

    def skip(pid: int, name: str, reason: str, detail: str = "") -> None:
        skips[reason] += 1
        skip_log.append(f"  [{reason}] {pid} {name}{(' — ' + detail) if detail else ''}")

    def status_bounds(p: dict) -> tuple[float, float]:
        return (14.0, 50.0) if p.get("status") != "retired" else (14.0, 90.0)

    def passes_gate(pid: int, p: dict, dob: date, min_debut: int = 13) -> str | None:
        """Return a skip reason, or None if the DOB passes all bounds.

        min_debut is 13 by default; exact-name id-joins pass 8 because
        career_paths.json records youth-academy stints (e.g. Dani Olmo
        joined Barcelona's academy in 2007 aged 9) and an id+exact-name
        match is already high-confidence.
        """
        lo, hi = status_bounds(p)
        age = implied_age(dob)
        if not (lo <= age <= hi):
            return f"implausible_current_age ({age:.1f})"
        fy = first_year_by_name.get(norm_name(p["name"]))
        if fy:
            debut_age = fy - dob.year
            if not (min_debut <= debut_age <= 35):
                return f"implausible_debut_age ({debut_age} in {fy})"
        return None

    for pid in sorted(pool):
        p = pool[pid]
        our_names = [p.get("name"), p.get("normalized_name")]
        our_nat = p.get("nationality")
        key = norm_name(p["name"])

        # ---- Stage A: id join, name-verified --------------------------------
        id_hits = []
        for cand in by_id.get(pid, []):
            quality = name_verified(our_names, cand)
            if quality is None:
                continue
            if quality == "tokens" and nationality_agrees(our_nat, cand) is False:
                continue  # weak name + nationality clash: don't trust the id hit
            if cand["dob"]:
                id_hits.append((quality, cand))
        if id_hits:
            dobs = {c["dob"] for _q, c in id_hits}
            if len(dobs) > 1:
                skip(pid, p["name"], "dob_conflict",
                     "; ".join(f"{c['source']}={c['dob']}" for _q, c in id_hits))
                continue
            dob = dobs.pop()
            exact = any(q == "exact" for q, _c in id_hits)
            reason = passes_gate(pid, p, dob, min_debut=8 if exact else 13)
            if reason:
                skip(pid, p["name"], "failed_validation_gate", reason)
                continue
            result[str(pid)] = f"{dob.isoformat()} 00:00:00"
            accepted_meta.append((pid, p["name"], dob, "id"))
            continue
        if by_id.get(pid):
            # id existed in a source but the name didn't corroborate: the id
            # spaces disagree for this player — fall through to the name join.
            skips["id_hit_name_mismatch_fell_through"] += 0  # informational only

        # ---- Stage B: name join with namesake disambiguation ----------------
        cand_by_tm: dict[int, dict] = {}
        for k in {key, token_key(p["name"]), norm_name(p.get("normalized_name") or "")}:
            for cand in by_name.get(k, []):
                if cand["dob"]:
                    cand_by_tm.setdefault(cand["tm_id"], cand)
        candidates = [
            c for c in cand_by_tm.values()
            if nationality_agrees(our_nat, c) is not False
        ]
        if not candidates:
            skip(pid, p["name"], "no_match")
            continue

        our_clubs = set(clubs_by_name.get(key, set()))
        if p.get("current_team"):
            our_clubs.add(normalize_club(p["current_team"]))

        def club_corroborated(c: dict) -> bool:
            return bool(c.get("club")) and normalize_club(c["club"]) in our_clubs

        def any_corroboration(c: dict) -> bool:
            if club_corroborated(c):
                return True
            fy = first_year_by_name.get(key)
            if fy and c["dob"] and 14 <= (fy - c["dob"].year) <= 30:
                return True
            fam_ours, fam_theirs = pos_family(p.get("position")), pos_family(c.get("position"))
            if fam_ours and fam_theirs and fam_ours == fam_theirs \
                    and nationality_agrees(our_nat, c) is True:
                return True
            return False

        # De-duplicate candidates that agree on the DOB (same person under
        # two TM ids across sources is impossible; same DOB namesakes are not
        # distinguishable anyway, so require corroboration below).
        distinct_dobs = {c["dob"] for c in candidates}
        chosen = None
        if len(candidates) == 1 or len(distinct_dobs) == 1:
            c = candidates[0]
            if nationality_agrees(our_nat, c) is not True and len(candidates) > 1:
                skip(pid, p["name"], "ambiguous_name", "same-DOB candidates w/o nationality")
                continue
            has_career = key in first_year_by_name or bool(our_clubs)
            if any_corroboration(c) or not has_career:
                chosen = c
            else:
                skip(pid, p["name"], "no_corroboration")
                continue
        else:
            club_hits = [c for c in candidates if club_corroborated(c)]
            if len({c["dob"] for c in club_hits}) == 1:
                chosen = club_hits[0]
            else:
                skip(pid, p["name"], "ambiguous_name",
                     f"{len(candidates)} namesakes, club corroboration matched "
                     f"{len(club_hits)}")
                continue

        dob = chosen["dob"]
        reason = passes_gate(pid, p, dob)
        if reason:
            skip(pid, p["name"], "failed_validation_gate", reason)
            continue
        result[str(pid)] = f"{dob.isoformat()} 00:00:00"
        accepted_meta.append((pid, p["name"], dob, "name"))

    # ---- Ground-truth gate (hard fail: write nothing on mismatch) -----------
    gt_report = []
    gt_failed = False
    pool_by_norm = {norm_name(p["name"]): pid for pid, p in pool.items()}
    for gt_name, gt_year in GROUND_TRUTHS.items():
        pid = pool_by_norm.get(gt_name)
        if pid is None:
            gt_report.append(f"  {gt_name}: not in DB pool — skipped")
            continue
        entry = result.get(str(pid))
        if not entry:
            gt_report.append(f"  {gt_name} (id {pid}): NO ENTRY PRODUCED — FAIL")
            gt_failed = True
        elif int(entry[:4]) != gt_year:
            gt_report.append(f"  {gt_name} (id {pid}): got {entry[:10]}, expected {gt_year} — FAIL")
            gt_failed = True
        else:
            gt_report.append(f"  {gt_name} (id {pid}): {entry[:10]} — OK")

    log.info("Ground-truth checks:")
    for line in gt_report:
        log.info(line)
    if gt_failed:
        log.error("Ground-truth validation FAILED — aborting without writing output.")
        sys.exit(1)

    # ---- Write ---------------------------------------------------------------
    out_path = DATA_DIR / "player_ages.json"
    ordered = {k: result[k] for k in sorted(result, key=int)}
    out_path.write_text(json.dumps(ordered, indent=2, ensure_ascii=False) + "\n")
    log.info(f"Wrote {len(ordered)} verified entries to {out_path}")

    # ---- Report ----------------------------------------------------------------
    matched_active = sum(1 for pid, *_ in accepted_meta if pid in active_pool)
    by_stage = Counter(stage for *_x, stage in accepted_meta)
    print("\n===== player_ages rebuild report =====")
    print(f"DB players:                {len(players_db)}")
    print(f"fame>={FAME_THRESHOLD} pool:            {len(pool)} ({len(active_pool)} active)")
    print(f"matched + verified:        {len(result)} "
          f"(id-join: {by_stage.get('id', 0)}, name-join: {by_stage.get('name', 0)})")
    print(f"skipped:                   {len(pool) - len(result)}")
    for reason, n in skips.most_common():
        print(f"    {reason}: {n}")
    print(f"coverage of ACTIVE pool:   {matched_active}/{len(active_pool)} "
          f"({100.0 * matched_active / max(1, len(active_pool)):.1f}%)")
    print("\nSkip details:")
    for line in skip_log:
        print(line)

    print("\n25 random spot-checks (name, DOB, implied age today):")
    rng = random.Random(20260713)
    for pid, name, dob, stage in sorted(rng.sample(accepted_meta, min(25, len(accepted_meta)))):
        status = pool[pid].get("status", "active")
        print(f"  {pid:>8}  {name:<28} {dob}  age {implied_age(dob):5.1f}  "
              f"[{status}, {stage}-join]")


if __name__ == "__main__":
    main()
