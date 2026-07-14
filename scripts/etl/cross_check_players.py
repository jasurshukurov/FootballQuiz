#!/usr/bin/env python3
"""
cross_check_players.py — Stage 1 of the full player-DB verification sweep.

BULK cross-check of data/players_db_v1.json against the public
transfermarkt-datasets players.csv (same DVC/R2 source and cache that
scripts/etl/fetch_transfermarkt_datasets.py and scripts/fetch_player_ages.py
use). DETECTS mismatches only — modifies no app data. A later Wikipedia
wave verifies every flag before anything is patched.

Join logic (factored from scripts/fetch_player_ages.py, the proven join):
  Our players_db ids ARE genuine Transfermarkt player ids for scraped
  players (verified: 8198=Ronaldo, 28003=Messi, ...), EXCEPT hand-added
  legends with synthetic ids >= 1_600_000.

  Stage A — id join, name-verified: our id looked up in TM; a hit counts
    only if the TM name matches ours (diacritics-folded exact / token-set
    match, token matches additionally require nationality agreement).
  Stage B — name join with namesake disambiguation (id miss or name
    mismatch): candidates by normalized / token-sorted name, nationality
    must not clash; corroborations = club overlap with our career clubs
    (via scripts/etl/club_normalizer), plausible debut age from TM DOB,
    or position family + nationality.

  Confidence buckets:
    exact-corroborated — id+exact-name, id+token-name+nationality, or
                         name join with a positive corroboration
    name-only          — single name candidate without corroboration
                         (compared anyway, tagged so the Wikipedia wave
                         can weigh it)
    unmatched          — no acceptable TM row

Field checks (players whose status != 'retired', i.e. active by app
convention — status:null counts as active in every generator):
  current_team  — both sides through club_normalizer.normalize_club, plus
                  a generic-token equality fallback (so "Fenerbahce" ==
                  "Fenerbahçe Spor Kulübü"); same canonical club = NOT a
                  mismatch. TM rows freeze at the last TRACKED club when a
                  player leaves TM-covered competitions (Saudi/MLS/South
                  America...), so mismatches on rows with a stale
                  last_season are usually TM staleness, not our error —
                  they are kept only for the fame>=55 exposure pool and
                  otherwise counted in the summary.
  status        — repo convention: NEVER trust last_season blindly, so
                  "TM last_season <= 2024 but ours says active" is a FLAG
                  for review, not a verdict. Explicit status='active' is
                  always flagged; status=null (the entire historical DB)
                  is flagged only for fame>=55 (suppressed count in the
                  summary). The reverse (ours retired, TM played 2025/26)
                  is flagged too.
  league        — our league is big-5-or-empty by convention, and players
                  outside the big 5 intentionally keep a stale big-5
                  string (known July-2026 quirk) — so only flagged when
                  TM places the player in a big-5 league that differs
                  from ours.
  market_value  — flagged only on order-of-magnitude drift (>3x or <1/3);
                  values go stale legitimately. Ours=0 means unknown.

Output: data/research_batches/sweep2026_mismatches.json
  { sweep, generated, source, join_stats, mismatch_counts_by_field,
    unmatched_fame55: [...], mismatches: [{id, name, fame, field, ours,
    theirs, confidence, note}] (fame desc) }

Usage:
    python3 scripts/etl/cross_check_players.py
"""

from __future__ import annotations

import gzip
import json
import logging
import re
import sys
from collections import Counter
from datetime import date, datetime, timezone
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

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = PROJECT_ROOT / "data"
CACHE_DIR = DATA_DIR / "cache"
OUT_PATH = DATA_DIR / "research_batches" / "sweep2026_mismatches.json"

sys.path.insert(0, str(PROJECT_ROOT / "scripts" / "etl"))
from club_normalizer import normalize_club  # noqa: E402

# --- Source (same DVC remote + cache as fetch_player_ages.py) ---------------

DVC_BASE = "https://pub-e682421888d945d684bcae8890b0ec20.r2.dev/dvc/"
DVC_DIR_PATH = "files/md5/0f/72998dde02fc0ca9a9a172f92c609e.dir"
TMD_CACHE = CACHE_DIR / "tm_datasets_players.csv"
REQUEST_TIMEOUT = 120
HEADERS = {"User-Agent": "football-etl/1.0"}

SYNTHETIC_ID_FLOOR = 1_600_000  # hand-added legends, never in TM datasets

# TM current season in this dataset snapshot is 2025 (=2025/26). A player
# whose last_season <= 2024 has no recorded 2025/26 appearance.
STALE_SEASON_CUTOFF = 2024

BIG5 = {"Premier League", "La Liga", "Bundesliga", "Serie A", "Ligue 1"}
COMPETITION_MAP = {  # TM domestic competition id -> league label
    "GB1": "Premier League", "ES1": "La Liga", "L1": "Bundesliga",
    "IT1": "Serie A", "FR1": "Ligue 1",
}

MV_RATIO = 3.0  # order-of-magnitude drift threshold

FAME_EXPOSURE = 55.0  # high-exposure pool threshold

SPOT_CHECK_NAMES = [
    "Kylian Mbappé", "Erling Haaland", "Jude Bellingham", "Lionel Messi",
    "Cristiano Ronaldo", "Vinicius Junior", "Mohamed Salah", "Harry Kane",
    "Lamine Yamal", "Kevin De Bruyne",
]

TODAY = date.today()

# --- Normalization helpers (copied from scripts/fetch_player_ages.py) -------

_PUNCT_RE = re.compile(r"[^a-z0-9 ]+")
_WS_RE = re.compile(r"\s+")


def norm_name(s) -> str:
    """Diacritics-folded, lowercased, punctuation-stripped name."""
    if not s or not isinstance(s, str):
        return ""
    s = unidecode(s).lower()
    s = _PUNCT_RE.sub(" ", s)
    return _WS_RE.sub(" ", s).strip()


def token_key(s) -> str:
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


def norm_country(s) -> str:
    n = norm_name(s)
    return COUNTRY_ALIASES.get(n, n)


def nationality_agrees(our_nat, their_nat) -> bool | None:
    """True/False when both sides have data, None when either side lacks it."""
    ours = norm_country(our_nat)
    theirs = norm_country(their_nat)
    if not ours or not theirs:
        return None
    return ours == theirs


POSITION_FAMILY = {
    "goalkeeper": "GK", "defender": "DF", "defence": "DF",
    "midfield": "MF", "midfielder": "MF",
    "attack": "FW", "forward": "FW", "striker": "FW",
}


def pos_family(s) -> str | None:
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
    if d.year < 1880 or d > TODAY:
        return None
    return d


# Generic tokens carrying no club identity — used by the secondary
# club-equality fallback when normalize_club canonical forms differ
# (e.g. "Fenerbahce" vs "Fenerbahçe Spor Kulübü").
_GENERIC_CLUB_TOKENS = {
    "fc", "cf", "sc", "afc", "cfc", "sk", "jk", "bk", "fk", "if",
    "ac", "as", "ss", "ssc", "sv", "vfl", "vfb", "bsc", "kv",
    "cd", "ud", "sd", "rc", "rcd", "ca", "cr", "se", "ec", "fr",
    "club", "clube", "futbol", "futebol", "football", "fussball",
    "calcio", "spor", "kulubu", "societa", "sportiva", "associazione",
    "unione", "sport", "de", "do", "da", "e", "of", "sad", "spa",
}


def _club_tokens(s: str) -> frozenset[str]:
    s = unidecode(s).lower()
    s = _PUNCT_RE.sub(" ", s)
    return frozenset(t for t in s.split() if t not in _GENERIC_CLUB_TOKENS)


def clubs_same(a: str, b: str) -> bool:
    """Canonical-form match via normalize_club, with a strict token-set
    equality fallback (generic words like FC / Spor Kulübü removed)."""
    if normalize_club(a) == normalize_club(b):
        return True
    ta, tb = _club_tokens(a), _club_tokens(b)
    return bool(ta) and ta == tb


def _s(v) -> str:
    """Pandas cell -> stripped string ('' for NaN/None)."""
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return ""
    return str(v).strip()


# --- Data loading ------------------------------------------------------------


def load_tm_datasets() -> pd.DataFrame:
    if not TMD_CACHE.exists():
        log.info("Fetching DVC directory listing...")
        resp = requests.get(DVC_BASE + DVC_DIR_PATH, headers=HEADERS,
                            timeout=REQUEST_TIMEOUT)
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


def tm_rows(df: pd.DataFrame) -> list[dict]:
    """Uniform candidate dicts (one per TM player)."""
    rows = []
    for r in df.itertuples(index=False):
        d = r._asdict()
        fn, ln = _s(d.get("first_name")), _s(d.get("last_name"))
        combo = f"{fn} {ln}".strip() if (fn or ln) else ""
        ls = d.get("last_season")
        rows.append({
            "tm_id": int(d["player_id"]),
            "names": [n for n in (_s(d.get("name")), combo) if n],
            "dob": parse_dob(d.get("date_of_birth")),
            "nat": _s(d.get("country_of_citizenship")),
            "position": _s(d.get("position")),
            "club": _s(d.get("current_club_name")),
            "comp": _s(d.get("current_club_domestic_competition_id")),
            "last_season": int(ls) if not pd.isna(ls) else None,
            "mv": None if pd.isna(d.get("market_value_in_eur"))
                  else int(d["market_value_in_eur"]),
        })
    return rows


def build_career_clubs() -> dict[str, set[str]]:
    """Normalized player name -> set of normalized clubs they played for
    (career_paths.json + transfers.json), for namesake corroboration."""
    clubs: dict[str, set[str]] = {}
    first_year: dict[str, int] = {}

    cp_path = DATA_DIR / "career_paths.json"
    if cp_path.exists():
        for p in json.loads(cp_path.read_text()):
            key = norm_name(p.get("name"))
            for s in p.get("career", []):
                if s.get("club"):
                    clubs.setdefault(key, set()).add(normalize_club(s["club"]))
                if isinstance(s.get("from"), int):
                    first_year[key] = min(first_year.get(key, s["from"]), s["from"])

    tr_path = DATA_DIR / "transfers.json"
    if tr_path.exists():
        for p in json.loads(tr_path.read_text()):
            key = norm_name(p.get("player_name"))
            for t in p.get("transfers", []):
                if t.get("club_name"):
                    clubs.setdefault(key, set()).add(normalize_club(t["club_name"]))
                dj = t.get("date_joined")
                if dj and re.match(r"^\d{4}", str(dj)):
                    y = int(str(dj)[:4])
                    first_year[key] = min(first_year.get(key, y), y)
    return clubs, first_year


# --- Matching (from fetch_player_ages.py) ------------------------------------


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

    def fame_of(pid: int) -> float:
        e = fame_by_id.get(str(pid))
        return float(e.get("fame_score", 0.0)) if e else 0.0

    df = load_tm_datasets()
    rows = tm_rows(df)
    log.info(f"DB players: {len(players_db):,}; TM rows: {len(rows):,} "
             f"(max last_season={max(r['last_season'] or 0 for r in rows)})")

    by_id: dict[int, dict] = {r["tm_id"]: r for r in rows}
    by_name: dict[str, list[dict]] = {}
    for r in rows:
        seen = set()
        for raw in r["names"]:
            for key in (norm_name(raw), token_key(raw)):
                if key and key not in seen:
                    seen.add(key)
                    by_name.setdefault(key, []).append(r)

    career_clubs, first_year_by_name = build_career_clubs()

    # ---- Join every DB player ------------------------------------------------
    join_conf: dict[int, str] = {}     # pid -> confidence bucket
    join_row: dict[int, dict] = {}     # pid -> TM row
    join_how: dict[int, str] = {}      # pid -> mechanism detail
    unmatched_reason: dict[int, str] = {}

    for p in players_db:
        pid = p["id"]
        our_names = [p.get("name"), p.get("normalized_name")]
        our_nat = p.get("nationality")
        key = norm_name(p.get("name"))

        # -- Stage A: id join, name-verified (real TM ids only) ---------------
        if pid < SYNTHETIC_ID_FLOOR and pid in by_id:
            cand = by_id[pid]
            quality = name_verified(our_names, cand)
            if quality == "exact":
                join_conf[pid], join_row[pid] = "exact-corroborated", cand
                join_how[pid] = "id+exact-name"
                continue
            if quality == "tokens":
                agree = nationality_agrees(our_nat, cand["nat"])
                if agree is True:
                    join_conf[pid], join_row[pid] = "exact-corroborated", cand
                    join_how[pid] = "id+token-name+nationality"
                    continue
                if agree is None:
                    join_conf[pid], join_row[pid] = "name-only", cand
                    join_how[pid] = "id+token-name"
                    continue
            # name mismatch (or token+nationality clash): id spaces disagree
            # for this player -> fall through to the name join.

        # -- Stage B: name join with namesake disambiguation ------------------
        cand_by_tm: dict[int, dict] = {}
        for k in {key, token_key(p.get("name")),
                  norm_name(p.get("normalized_name") or "")}:
            for cand in by_name.get(k, []):
                cand_by_tm.setdefault(cand["tm_id"], cand)
        candidates = [c for c in cand_by_tm.values()
                      if nationality_agrees(our_nat, c["nat"]) is not False]
        if not candidates:
            join_conf[pid] = "unmatched"
            unmatched_reason[pid] = ("synthetic_id_no_name_match"
                                     if pid >= SYNTHETIC_ID_FLOOR else "no_match")
            continue

        our_clubs = set(career_clubs.get(key, set()))
        if p.get("current_team"):
            our_clubs.add(normalize_club(p["current_team"]))

        def club_corroborated(c: dict) -> bool:
            return bool(c["club"]) and normalize_club(c["club"]) in our_clubs

        def any_corroboration(c: dict) -> bool:
            if club_corroborated(c):
                return True
            fy = first_year_by_name.get(key)
            if fy and c["dob"] and 14 <= (fy - c["dob"].year) <= 30:
                return True
            fam_o, fam_t = pos_family(p.get("position")), pos_family(c["position"])
            if fam_o and fam_t and fam_o == fam_t \
                    and nationality_agrees(our_nat, c["nat"]) is True:
                return True
            return False

        if len(candidates) == 1:
            c = candidates[0]
            if any_corroboration(c):
                join_conf[pid], join_row[pid] = "exact-corroborated", c
                join_how[pid] = "name+corroboration"
            else:
                join_conf[pid], join_row[pid] = "name-only", c
                join_how[pid] = "name-only-single-candidate"
        else:
            club_hits = [c for c in candidates if club_corroborated(c)]
            if len(club_hits) == 1:
                join_conf[pid], join_row[pid] = "exact-corroborated", club_hits[0]
                join_how[pid] = "name+club-disambiguated"
            else:
                join_conf[pid] = "unmatched"
                unmatched_reason[pid] = (
                    f"ambiguous_name ({len(candidates)} namesakes, "
                    f"{len(club_hits)} club-corroborated)")

    # ---- Field comparisons (active players, joined) --------------------------
    mismatches: list[dict] = []

    def add(p, field, ours, theirs, note=""):
        mismatches.append({
            "id": p["id"], "name": p["name"], "fame": fame_of(p["id"]),
            "field": field, "ours": ours, "theirs": theirs,
            "confidence": join_conf[p["id"]], "note": note,
        })

    compared = 0
    suppressed = Counter()  # systematic-artifact flags kept out of the list
    for p in players_db:
        pid = p["id"]
        row = join_row.get(pid)
        if row is None:
            continue
        fame = fame_of(pid)
        our_status = p.get("status")          # 'active' | 'retired' | None
        is_active = our_status != "retired"   # app convention: null = active
        ls = row["last_season"]
        tm_row_stale = ls is not None and ls <= STALE_SEASON_CUTOFF

        # status — flags in both directions, never a verdict (repo rule:
        # don't trust last_season blindly). status=null with a stale
        # last_season describes most of the historical DB, so it is only
        # flagged inside the fame>=55 exposure pool.
        if is_active and tm_row_stale:
            if our_status == "active" or fame >= FAME_EXPOSURE:
                add(p, "status", our_status or "null(=active)",
                    f"last_season={ls}",
                    "FLAG not verdict: TM shows no 2025/26 appearance; "
                    "verify retirement/inactivity via Wikipedia wave")
            else:
                suppressed["status_null_stale_low_fame"] += 1
        elif our_status == "retired" and ls is not None \
                and ls > STALE_SEASON_CUTOFF:
            add(p, "status", "retired", f"last_season={ls}",
                "FLAG: TM records a current-season appearance for a player "
                "we mark retired")

        if not is_active:
            continue  # remaining checks only meaningful for active players
        compared += 1

        # current_team — through the club normalizer. TM freezes the club
        # at the last tracked competition, so mismatches on stale TM rows
        # are usually TM's problem — kept only for the exposure pool.
        ours_club, theirs_club = _s(p.get("current_team")), row["club"]
        if ours_club and theirs_club and not clubs_same(ours_club, theirs_club):
            if not tm_row_stale:
                add(p, "current_team", ours_club, theirs_club,
                    f"normalized: {normalize_club(ours_club)!r} vs "
                    f"{normalize_club(theirs_club)!r}; TM row is current "
                    "(last_season=2025) so this is real signal")
            elif fame >= FAME_EXPOSURE:
                add(p, "current_team", ours_club, theirs_club,
                    f"normalized: {normalize_club(ours_club)!r} vs "
                    f"{normalize_club(theirs_club)!r} (TM row itself stale: "
                    f"last_season={ls}, TM club likely frozen pre-move — "
                    "ours may well be the correct one)")
            else:
                suppressed["current_team_stale_tm_low_fame"] += 1

        # league — only when TM places them in a big-5 league that differs.
        tm_league = COMPETITION_MAP.get(row["comp"])
        our_league = _s(p.get("league"))
        if tm_league and our_league != tm_league:
            add(p, "league", our_league or "(empty)", tm_league,
                f"TM comp={row['comp']}")
        # (TM non-big-5 + our stale big-5 string = known July-2026 quirk,
        #  intentionally NOT flagged.)

        # market_value — order-of-magnitude drift only.
        ours_mv = p.get("market_value")
        theirs_mv = row["mv"]
        if isinstance(ours_mv, (int, float)) and ours_mv > 0 \
                and theirs_mv and theirs_mv > 0:
            ratio = theirs_mv / ours_mv
            if ratio > MV_RATIO or ratio < 1.0 / MV_RATIO:
                add(p, "market_value", int(ours_mv), theirs_mv,
                    f"{ratio:.2f}x drift (values go stale legitimately)")

    mismatches.sort(key=lambda m: (-m["fame"], m["id"]))

    # ---- Unmatched high-exposure players -------------------------------------
    unmatched_famous = sorted(
        ({"id": p["id"], "name": p["name"], "fame": fame_of(p["id"]),
          "status": p.get("status"),
          "reason": unmatched_reason.get(p["id"], "no_match")}
         for p in players_db
         if join_conf.get(p["id"]) == "unmatched"
         and fame_of(p["id"]) >= FAME_EXPOSURE),
        key=lambda e: -e["fame"])

    # ---- Summary --------------------------------------------------------------
    conf_counts = Counter(join_conf.values())
    field_counts = Counter(m["field"] for m in mismatches)
    total = len(players_db)
    joined = conf_counts["exact-corroborated"] + conf_counts["name-only"]
    fame35 = [p for p in players_db if fame_of(p["id"]) >= 35]
    fame35_joined = sum(1 for p in fame35
                        if join_conf.get(p["id"]) != "unmatched")

    summary = {
        "db_players": total,
        "joined": joined,
        "joined_pct": round(100.0 * joined / total, 1),
        "join_confidence": dict(conf_counts),
        "join_mechanisms": dict(Counter(join_how.values())),
        "fame35_joined": f"{fame35_joined}/{len(fame35)}",
        "active_players_compared": compared,
        "mismatch_counts_by_field": dict(field_counts),
        "suppressed_systematic_flags": dict(suppressed),
        "total_mismatch_flags": len(mismatches),
        "players_with_flags": len({m["id"] for m in mismatches}),
        "unmatched_fame55_count": len(unmatched_famous),
    }

    out = {
        "sweep": "full2026",
        "stage": "1-bulk-tm-crosscheck",
        "generated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": "transfermarkt-datasets players.csv "
                  f"(cache {TMD_CACHE.name}, current season 2025/26)",
        "caveat": "DETECTION ONLY. Every entry is a flag for the Wikipedia "
                  "verification wave, not a verdict — especially status "
                  "flags (last_season is unreliable) and market_value "
                  "(goes stale legitimately). current_team flags whose note "
                  "says the TM row is stale usually mean TM froze at the "
                  "last tracked club and OUR value is the newer one. "
                  "Systematic artifact classes below fame 55 are counted "
                  "in summary.suppressed_systematic_flags, not listed.",
        "summary": summary,
        "unmatched_fame55": unmatched_famous,
        "mismatches": mismatches,
    }
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n")
    log.info(f"Wrote {len(mismatches)} flags -> {OUT_PATH}")

    # ---- Console report -------------------------------------------------------
    print("\n===== sweep2026 stage-1 cross-check report =====")
    print(f"DB players:            {total:,}")
    print(f"joined:                {joined:,} ({summary['joined_pct']}%)")
    for k, v in conf_counts.most_common():
        print(f"    {k}: {v:,}")
    print("join mechanisms:")
    for k, v in Counter(join_how.values()).most_common():
        print(f"    {k}: {v:,}")
    print(f"fame>=35 joined:       {summary['fame35_joined']}")
    print(f"active compared:       {compared:,}")
    print(f"mismatch flags:        {len(mismatches):,} "
          f"on {summary['players_with_flags']:,} players")
    for k, v in field_counts.most_common():
        print(f"    {k}: {v:,}")
    print("suppressed systematic flags (counted, not listed):")
    for k, v in suppressed.most_common():
        print(f"    {k}: {v:,}")

    print(f"\nUnmatched fame>={FAME_EXPOSURE:g} "
          f"({len(unmatched_famous)}) — need manual/Wikipedia verification:")
    for e in unmatched_famous:
        print(f"    {e['id']:>8}  {e['name']:<30} fame {e['fame']:5.1f}  "
              f"[{e['reason']}]")

    print("\nTop-50 highest-fame mismatch flags:")
    for m in mismatches[:50]:
        print(f"    {m['fame']:5.1f}  {m['name']:<26} {m['field']:<13} "
              f"ours={str(m['ours'])[:38]!r:<42} theirs={str(m['theirs'])[:38]!r}")

    print("\nSpot-checks (join quality eyeball):")
    db_by_norm = {norm_name(p["name"]): p for p in players_db}
    for nm in SPOT_CHECK_NAMES:
        p = db_by_norm.get(norm_name(nm))
        if not p:
            print(f"    {nm}: NOT IN DB")
            continue
        pid = p["id"]
        row = join_row.get(pid)
        if row is None:
            print(f"    {nm} (id {pid}): UNMATCHED "
                  f"[{unmatched_reason.get(pid, '?')}]")
            continue
        flags = [m["field"] for m in mismatches if m["id"] == pid]
        print(f"    {nm} (id {pid} -> tm {row['tm_id']}, "
              f"{join_conf[pid]}, {join_how[pid]})")
        print(f"        ours:   club={p.get('current_team')!r} "
              f"league={p.get('league')!r} mv={p.get('market_value')} "
              f"status={p.get('status')}")
        print(f"        theirs: club={row['club']!r} comp={row['comp']!r} "
              f"mv={row['mv']} last_season={row['last_season']}")
        print(f"        flags:  {flags or 'none'}")


if __name__ == "__main__":
    main()
