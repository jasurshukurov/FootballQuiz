#!/usr/bin/env python3
"""Expand data/matches_db.json with verified starting XIs from Wikipedia.

Source choice (evaluated for the Missing XI pool expansion):
  - openfootball / footballcsv: results & schedules only — NO lineups. Useless.
  - StatsBomb open-data: full lineups, but the dataset license is
    non-commercial; the app is commercial (ads/Pro), so redistribution is not
    clearly permitted. Skipped to respect the app's IP-free constraint.
  - Wikipedia final/famous-match articles: per-match pages carry full starting
    XIs in a stable table format. Lineups are facts (names, shirt numbers) —
    facts are not copyrightable, and we extract data, not prose. SAFE.

What it does:
  1. Generates article titles for every final with a per-match page (World Cup,
     Euros, European Cup/UCL, UEFA Cup/Europa League, Conference League, Cup
     Winners' Cup, FA Cup, League Cup, UEFA Super Cup, Intercontinental Cup,
     Club World Cup, Copa America, Copa Libertadores, AFCON, Asian Cup, Copa
     del Rey, DFB-Pokal, Coppa Italia) plus a small curated list of famous
     matches. Missing pages are skipped silently — NEVER fabricated.
  2. Parses each page: {{Infobox football match}} / {{Football box}} headers
     (team1, team2, score, date) + lineup tables (rows of |POS||no||[[Name]]
     up to the "Substitutes" marker). Two-legged finals pages ("finals") pair
     each {{Football box}} with the two lineup blocks that follow it.
  3. Validates: 11 distinct (folded) names per side, real date, two teams.
     Pages that don't parse CLEANLY are dropped (precision over recall).
  4. Merges into data/matches_db.json:
       - identity = (date, normalized team pair). A fetched match whose
         identity already exists UPDATES that entry's lineups in place
         (Wikipedia is the verification source; several legacy entries had
         mixed-up XIs). Scores/ids/competition strings of existing entries
         are preserved.
       - new identities are appended with a slug id derived from the title.
       - known legacy duplicate rows (same real-world match under two ids)
         are dropped, keeping one id per identity.
  5. Lineup names are transliterated for the characters NFD folding can't
     reduce (ß→ss, ø→o, đ→d, ł→l, ...) so every name stays typeable in the
     search box; ordinary diacritics are kept (foldName handles them).

Throttling: batched revision queries (10 titles/request), 1s spacing,
maxlag=5, retry with backoff on 429/maxlag. Pages are cached on disk.

Run:  python3 scripts/etl/fetch_wikipedia_lineups.py [--dry-run] [--limit N]
"""

import hashlib
import json
import re
import sys
import time
import unicodedata
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data"
CACHE = Path(
    "/private/tmp/claude-501/-Users-jasur-workspace-football/"
    "622f5dd0-aced-4c1e-af52-4c947b59a401/scratchpad/wiki_cache"
)
CACHE.mkdir(parents=True, exist_ok=True)

API = "https://en.wikipedia.org/w/api.php"
UA = {"User-Agent": "FootballTriviaETL/1.0 (contact: jasur.shukurov29@gmail.com)"}

# Same real-world match ingested twice under two ids in the legacy data. The
# kept twin (comment) is verified/updated from its Wikipedia page where one
# exists; identity dedupe below also guards against future re-ingestion.
LEGACY_DUPLICATE_DROPS = {
    "bundesliga-bayern-dortmund-2013-ucl",  # keep ucl-final-2013
    "epl-tottenham-ajax-2019",  # keep ucl-sf-2019-ajax-spurs
    "wc-sf-2010-spain-germany",  # keep wc-sf-2010-germany-spain
    "epl-manutd-arsenal-2-0-2004",  # keep epl-arsenal-manu-49-2004 (Battle of the Buffet page)
    "copa-libertadores-final-2018",  # keep superclasico-2018 (2018 CL finals page, leg 2)
}

TRANSLIT = str.maketrans({
    "ß": "ss", "ø": "o", "Ø": "O", "đ": "d", "Đ": "D", "ð": "d", "Ð": "D",
    "þ": "th", "Þ": "Th", "ł": "l", "Ł": "L", "æ": "ae", "Æ": "Ae",
    "œ": "oe", "Œ": "Oe", "ħ": "h", "Ħ": "H", "ı": "i",
})

POSITIONS = {
    "GK", "SW", "RB", "CB", "LB", "RWB", "LWB", "WB", "DF", "FB",
    "RH", "CH", "LH", "HB", "RM", "CM", "LM", "MF", "DM", "AM", "CDM", "CAM",
    "RW", "LW", "WF", "OR", "IR", "IL", "OL", "SS", "CF", "ST", "FW", "RF", "LF",
}


def fold(s: str) -> str:
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    return s.lower().strip()


def translit(s: str) -> str:
    return s.translate(TRANSLIT)


TEAM_SUFFIX_TOKENS = {
    "fc", "afc", "cf", "ac", "as", "ss", "ssc", "sc", "cd", "cp", "fk", "sk",
    "rc", "rcd", "sv", "vfb", "vfl", "club", "calcio", "de", "cr", "ca",
}
TEAM_ALIASES = {
    "internazionale": "inter milan",
    "inter": "inter milan",
    "bayern munchen": "bayern munich",
    "atletico de madrid": "atletico madrid",
    "sporting clube portugal": "sporting cp",
    "psg": "paris saint germain",
    "manchester utd": "manchester united",
}


def norm_team(name: str) -> str:
    f = re.sub(r"[^a-z0-9 ]+", " ", fold(translit(name)))
    toks = [t for t in f.split() if t not in TEAM_SUFFIX_TOKENS]
    key = " ".join(toks)
    return TEAM_ALIASES.get(key, key)


# ---------------------------------------------------------------------------
# Title generation
# ---------------------------------------------------------------------------

def build_jobs():
    """[(title, competition, season_style)] — season_style 'year' or 'club'."""
    jobs = []

    def add(title, comp, style="club"):
        jobs.append((title, comp, style))

    for y in list(range(1930, 1939, 4)) + list(range(1950, 2023, 4)):
        add(f"{y} FIFA World Cup final", "FIFA World Cup Final", "year")
    for y in range(1960, 2025, 4):
        add(f"UEFA Euro {y} final", "UEFA European Championship Final", "year")
    for y in range(1956, 1993):
        add(f"{y} European Cup final", "European Cup Final")
    for y in range(1993, 2026):
        add(f"{y} UEFA Champions League final", "UEFA Champions League Final")
    for y in range(1972, 2010):
        add(f"{y} UEFA Cup final", "UEFA Cup Final")
    for y in range(2010, 2026):
        add(f"{y} UEFA Europa League final", "UEFA Europa League Final")
    for y in range(2022, 2026):
        add(f"{y} UEFA Europa Conference League final", "UEFA Conference League Final")
        add(f"{y} UEFA Conference League final", "UEFA Conference League Final")
    for y in range(1961, 2000):
        add(f"{y} European Cup Winners' Cup final", "European Cup Winners' Cup Final")
    for y in range(1946, 2026):
        add(f"{y} FA Cup final", "FA Cup Final")
    for y in range(1961, 2026):
        add(f"{y} Football League Cup final", "League Cup Final")
        if y >= 2017:
            add(f"{y} EFL Cup final", "League Cup Final")
    for y in range(1973, 2025):
        add(f"{y} UEFA Super Cup", "UEFA Super Cup")
    for y in range(1960, 2005):
        add(f"{y} Intercontinental Cup", "Intercontinental Cup", "year")
    for y in [2000] + list(range(2005, 2026)):
        add(f"{y} FIFA Club World Cup final", "FIFA Club World Cup Final", "year")
    for y in [1993, 1995, 1997, 1999, 2001, 2004, 2007, 2011, 2015, 2016, 2019, 2021, 2024]:
        add(f"{y} Copa América Final", "Copa America Final", "year")
    for y in range(1960, 2019):
        add(f"{y} Copa Libertadores finals", "Copa Libertadores Final", "year")
    for y in range(2019, 2026):
        add(f"{y} Copa Libertadores final", "Copa Libertadores Final", "year")
    for y in [1957, 1959, 1962, 1963, 1965, 1968, 1970, 1972, 1974, 1978, 1980, 1982,
              1984, 1986, 1988, 1990, 1992, 1994, 1996, 1998, 2000, 2002, 2004, 2006,
              2008, 2010, 2012, 2013, 2015, 2017, 2019, 2021, 2023]:
        add(f"{y} Africa Cup of Nations Final", "Africa Cup of Nations Final", "year")
    for y in [1972, 1976, 1980, 1984, 1988, 1992, 1996, 2000, 2004, 2007, 2011, 2015, 2019, 2023]:
        add(f"{y} AFC Asian Cup final", "AFC Asian Cup Final", "year")
    for y in range(1990, 2026):
        add(f"{y} Copa del Rey final", "Copa del Rey Final")
        add(f"{y} DFB-Pokal Final", "DFB-Pokal Final")
    for y in range(2000, 2026):
        add(f"{y} Coppa Italia final", "Coppa Italia Final")
    # Curated famous non-final matches with dedicated articles.
    add("Battle of the Buffet", "Premier League")
    add("Brazil v Germany (2014 FIFA World Cup)", "FIFA World Cup Semi-Final", "year")
    add("Italy v West Germany (1970 FIFA World Cup)", "FIFA World Cup Semi-Final", "year")
    add("Argentina v England (1986 FIFA World Cup)", "FIFA World Cup Quarter-Final", "year")

    # de-dup titles (EFL/UECL alternates)
    seen, out = set(), []
    for j in jobs:
        if j[0] not in seen:
            seen.add(j[0])
            out.append(j)
    return out


# ---------------------------------------------------------------------------
# Fetching (batched, cached, throttled)
# ---------------------------------------------------------------------------

def cache_path(title: str) -> Path:
    return CACHE / (hashlib.md5(title.encode()).hexdigest() + ".json")


def fetch_batch(titles):
    """Fetch wikitext for up to 10 titles; returns {requested_title: text|None}."""
    q = urllib.parse.urlencode({
        "action": "query", "prop": "revisions", "rvprop": "content",
        "rvslots": "main", "format": "json", "redirects": 1, "maxlag": 5,
        "titles": "|".join(titles),
    })
    for attempt in range(5):
        try:
            req = urllib.request.Request(f"{API}?{q}", headers=UA)
            with urllib.request.urlopen(req, timeout=60) as r:
                d = json.load(r)
            if "error" in d and d["error"].get("code") == "maxlag":
                time.sleep(5 * (attempt + 1))
                continue
            break
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(10 * (attempt + 1))
                continue
            raise
    else:
        raise RuntimeError("wikipedia API kept throttling")

    # map redirects/normalization back to the requested titles
    back = {}
    for r in d["query"].get("normalized", []) + d["query"].get("redirects", []):
        back[r["to"]] = back.get(r["from"], r["from"])
        # chain: requested -> normalized -> redirected
    resolved = {}
    for t in titles:
        cur = t
        changed = True
        while changed:
            changed = False
            for r in d["query"].get("normalized", []) + d["query"].get("redirects", []):
                if r["from"] == cur:
                    cur = r["to"]
                    changed = True
        resolved[cur] = t
    out = {t: None for t in titles}
    for p in d["query"]["pages"].values():
        req_title = resolved.get(p.get("title"))
        if req_title is None:
            continue
        if "revisions" in p:
            out[req_title] = p["revisions"][0]["slots"]["main"]["*"]
    return out


def get_pages(titles):
    """Cached wikitext for titles ('' cached = missing page)."""
    result = {}
    to_fetch = []
    for t in titles:
        cp = cache_path(t)
        if cp.exists():
            result[t] = json.loads(cp.read_text())["text"] or None
        else:
            to_fetch.append(t)
    for i in range(0, len(to_fetch), 10):
        batch = to_fetch[i:i + 10]
        got = fetch_batch(batch)
        for t in batch:
            cache_path(t).write_text(json.dumps({"text": got[t] or ""}))
            result[t] = got[t]
        print(f"  fetched {min(i + 10, len(to_fetch))}/{len(to_fetch)}", flush=True)
        time.sleep(1.0)
    return result


# ---------------------------------------------------------------------------
# Wikitext parsing
# ---------------------------------------------------------------------------

MONTHS = {m.lower(): i for i, m in enumerate(
    ["January", "February", "March", "April", "May", "June", "July",
     "August", "September", "October", "November", "December"], 1)}


def parse_date(raw: str):
    m = re.search(r"\{\{[Ss]tart date\|(\d{4})\|(\d{1,2})\|(\d{1,2})", raw)
    if m:
        return f"{int(m.group(1)):04d}-{int(m.group(2)):02d}-{int(m.group(3)):02d}"
    m = re.search(r"(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})", raw)
    if m and m.group(2).lower() in MONTHS:
        return f"{int(m.group(3)):04d}-{MONTHS[m.group(2).lower()]:02d}-{int(m.group(1)):02d}"
    m = re.search(r"([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})", raw)
    if m and m.group(1).lower() in MONTHS:
        return f"{int(m.group(3)):04d}-{MONTHS[m.group(1).lower()]:02d}-{int(m.group(2)):02d}"
    return None


def strip_markup(s: str) -> str:
    s = re.sub(r"<ref[^>]*/>", "", s)
    s = re.sub(r"<ref[^>]*>.*?</ref>", "", s, flags=re.S)
    s = re.sub(r"\{\{refn[^}]*\}\}", "", s)
    s = re.sub(r"&(ndash|mdash|minus);", "-", s)
    s = s.replace("&nbsp;", " ")
    return s


# FIFA trigrammes used by {{fb|XXX}} / {{fb-rt|XXX}} in footballbox headers
# (two-legged finals and replays); only codes plausible in our sources.
FB_CODES = {
    "ITA": "Italy", "YUG": "Yugoslavia", "ESP": "Spain", "URS": "Soviet Union",
    "FRG": "West Germany", "GDR": "East Germany", "GER": "Germany",
    "TCH": "Czechoslovakia", "CZE": "Czech Republic", "SVK": "Slovakia",
    "NED": "Netherlands", "DEN": "Denmark", "POR": "Portugal", "GRE": "Greece",
    "FRA": "France", "ENG": "England", "SCO": "Scotland", "WAL": "Wales",
    "NIR": "Northern Ireland", "IRL": "Republic of Ireland", "BEL": "Belgium",
    "SWE": "Sweden", "NOR": "Norway", "FIN": "Finland", "ISL": "Iceland",
    "AUT": "Austria", "SUI": "Switzerland", "TUR": "Turkey", "RUS": "Russia",
    "POL": "Poland", "HUN": "Hungary", "ROU": "Romania", "BUL": "Bulgaria",
    "CRO": "Croatia", "SRB": "Serbia", "BIH": "Bosnia and Herzegovina",
    "MKD": "North Macedonia", "SVN": "Slovenia", "UKR": "Ukraine",
    "BRA": "Brazil", "ARG": "Argentina", "URU": "Uruguay", "CHI": "Chile",
    "COL": "Colombia", "PER": "Peru", "PAR": "Paraguay", "ECU": "Ecuador",
    "BOL": "Bolivia", "VEN": "Venezuela", "MEX": "Mexico", "USA": "United States",
    "CAN": "Canada", "CRC": "Costa Rica", "JPN": "Japan", "KOR": "South Korea",
    "PRK": "North Korea", "KSA": "Saudi Arabia", "IRN": "Iran", "IRQ": "Iraq",
    "AUS": "Australia", "QAT": "Qatar", "KUW": "Kuwait", "UAE": "United Arab Emirates",
    "CHN": "China", "EGY": "Egypt", "CMR": "Cameroon", "NGA": "Nigeria",
    "GHA": "Ghana", "ALG": "Algeria", "TUN": "Tunisia", "MAR": "Morocco",
    "CIV": "Ivory Coast", "SEN": "Senegal", "ZAM": "Zambia", "RSA": "South Africa",
    "ZAI": "Zaire", "COD": "DR Congo", "MLI": "Mali", "BFA": "Burkina Faso",
    "GUI": "Guinea", "ETH": "Ethiopia", "SUD": "Sudan", "CGO": "Congo",
    "ANG": "Angola", "LBY": "Libya", "UGA": "Uganda",
}


def extract_team(raw: str):
    """Team display name from an infobox/footballbox team value."""
    raw = strip_markup(raw)
    fb = re.search(r"\{\{fb[a-z-]*\|([A-Z]{3})[|}]", raw) or re.search(
        r"#invoke:flagg[^}]*\|([A-Z]{3})\s*[|}]", raw
    )
    raw2 = re.sub(r"\{\{(flagicon|flagdeco|fb|flag)[^}]*\}\}", "", raw, flags=re.I)
    m = re.search(r"\[\[([^\]|]+)\|([^\]]+)\]\]", raw2)
    if m:
        return m.group(2).strip()
    m = re.search(r"\[\[([^\]|]+)\]\]", raw2)
    if m:
        return m.group(1).strip()
    # no wikilink: a bare {{fb|CODE}} national-team value (footballboxes)
    if fb and fb.group(1) in FB_CODES:
        return FB_CODES[fb.group(1)]
    txt = re.sub(r"[{}\[\]']", "", raw2).strip()
    return txt or None


def extract_player(cell: str):
    """Player display name from a lineup name cell."""
    cell = strip_markup(cell)
    m = re.search(r"\{\{sortname\|([^}|]+)\|([^}|]+)", cell)
    if m:
        return f"{m.group(1).strip()} {m.group(2).strip()}"
    m = re.search(r"\{\{(?:interlanguage link|ill)\|([^}|]+)", cell, flags=re.I)
    if m:
        return m.group(1).strip()
    for link in re.finditer(r"\[\[([^\]|]+)(?:\|([^\]]+))?\]\]", cell):
        target = link.group(1)
        if "captain" in target.lower():
            continue
        return (link.group(2) or link.group(1)).strip()
    txt = re.sub(r"\{\{[^}]*\}\}", "", cell)
    txt = re.sub(r"\[\[[^\]]*[Cc]aptain[^\]]*\]\]", "", txt)  # bare captain link
    txt = re.sub(r"\([^)]*\)", "", txt)  # (c) / parenthetical leftovers
    txt = re.sub(r"[{}\[\]'|]", " ", txt).strip()
    txt = re.sub(r"\s+", " ", txt)
    return txt if len(txt) > 2 else None


HEADER_RE = re.compile(r"\{\{\s*(Infobox football match|[Ff]ootball\s?box)", re.I)
# plain "|GK ||" or abbr-wrapped "|{{abbr|RB|Right-back}} ||"
ROW_RE = re.compile(r"^\|\s*(?:\{\{abbr\|)?([A-Z]{1,4})(?:\|[^}]*\}\})?\s*\|\|")
NUM_CELL_RE = re.compile(r"^\s*'{0,3}\d{1,2}'{0,3}\s*$")


def lineup_row_name(ln: str):
    """Player name if this table line is a lineup row, else None.

    Handles "|GK ||'''1'''||[[Name]]", "|{{abbr|CB|Centre-back}} ||...",
    vintage number-less "|GK ||[[Name]]", and position-less
    "| ||'''1'''||[[Name]]" (1950s-60s domestic finals)."""
    if not ln.startswith("|") or ln.startswith(("|-", "|}")):
        return None
    cells = ln.split("||")
    if len(cells) < 2:
        return None
    m = ROW_RE.match(ln)
    if m and m.group(1) in POSITIONS:
        name_cell = cells[2] if len(cells) >= 3 else cells[1]
        return extract_player(name_cell)
    # empty position cell + shirt-number cell + name cell
    if cells[0].lstrip("|").strip() == "" and len(cells) >= 3 and NUM_CELL_RE.match(cells[1]):
        return extract_player(cells[2])
    return None


def parse_page(text: str):
    """Return (headers, blocks): headers = [{line, team1, team2, score, date}],
    blocks = [(line, [names])] of STARTER rows only."""
    lines = text.split("\n")

    headers = []
    i = 0
    while i < len(lines):
        if HEADER_RE.search(lines[i]):
            h = {"line": i, "team1": None, "team2": None, "score": None, "date": None}
            depth = 0
            for j in range(i, min(i + 120, len(lines))):
                ln = lines[j]
                depth += ln.count("{{") - ln.count("}}")
                m = re.match(r"^\s*\|\s*(team1|team2|date|score|team1score|team2score)\s*=\s*(.*)$", ln)
                if m:
                    key, val = m.group(1), m.group(2)
                    if key in ("team1", "team2") and h[key] is None:
                        h[key] = extract_team(val)
                    elif key == "date" and h["date"] is None:
                        h["date"] = parse_date(val)
                    elif key == "score" and h["score"] is None:
                        sm = re.search(r"(\d+)\s*[–—-]\s*(\d+)", strip_markup(val))
                        if sm:
                            h["score"] = f"{sm.group(1)}-{sm.group(2)}"
                    elif key in ("team1score", "team2score"):
                        sm = re.search(r"\d+", strip_markup(val))
                        if sm:
                            h[key] = sm.group(0)
                if depth <= 0 and j > i:
                    break
            if h.get("team1score") and h.get("team2score") and not h["score"]:
                h["score"] = f"{h['team1score']}-{h['team2score']}"
            h.pop("team1score", None)
            h.pop("team2score", None)
            headers.append(h)
            i = j
        i += 1

    blocks = []
    current, start_line, skipping = [], None, False
    for idx, ln in enumerate(lines):
        name = lineup_row_name(ln)
        if name is not None:
            if not skipping:
                if start_line is None:
                    start_line = idx
                current.append(name)
            continue
        stripped = ln.strip()
        # only table rows may flip the subs flag (prose mentions must not),
        # and a new table always resets it even when no XI row accumulated.
        if stripped.startswith(("|", "!")) and "Substitut" in ln:
            skipping = True
        elif stripped.startswith("{|"):
            skipping = False
        if "'''Manager" in ln or stripped == "|}":
            if current:
                blocks.append((start_line, current))
            current, start_line, skipping = [], None, False
    if current:
        blocks.append((start_line, current))
    return headers, blocks


def assemble(title, comp, style, text, notes):
    """Yield match dicts parsed from one page."""
    headers, blocks = parse_page(text)
    blocks = [b for b in blocks if len(b[1]) == 11]
    if not headers or not blocks:
        notes.append(f"SKIP {title}: headers={len(headers)} xi-blocks={len(blocks)}")
        return

    # assign each block to the nearest preceding header that has both teams
    usable = [h for h in headers if h["team1"] and h["team2"]]
    if not usable:
        notes.append(f"SKIP {title}: no usable header")
        return
    per_header = {id(h): [] for h in usable}
    for line, names in blocks:
        prior = [h for h in usable if h["line"] <= line]
        if prior:
            per_header[id(prior[-1])].append(names)

    made = 0
    for h in usable:
        bl = per_header[id(h)]
        if len(bl) != 2:
            continue
        if not h["date"]:
            notes.append(f"SKIP {title}: header without date")
            continue
        a, b = bl
        year = int(h["date"][:4])
        if not (1870 <= year <= 2026):
            continue
        names_a = [translit(n).strip() for n in a]
        names_b = [translit(n).strip() for n in b]
        if len({fold(n) for n in names_a}) != 11 or len({fold(n) for n in names_b}) != 11:
            notes.append(f"SKIP {title}: duplicate names in an XI")
            continue
        t1, t2 = translit(h["team1"]).strip(), translit(h["team2"]).strip()
        if not t1 or not t2 or norm_team(t1) == norm_team(t2):
            notes.append(f"SKIP {title}: bad teams {t1!r} vs {t2!r}")
            continue
        season = str(year) if style == "year" else f"{year - 1}-{str(year)[-2:]}"
        slug = re.sub(r"[^a-z0-9]+", "-", fold(translit(title))).strip("-")
        made += 1
        yield {
            "match_id": slug if made == 1 else f"{slug}-leg{made}",
            "date": h["date"],
            "competition": comp,
            "season": season,
            "opponent_a": t1,
            "opponent_b": t2,
            "score": h["score"] or "",
            "lineup_a_ids": [0] * 11,
            "lineup_b_ids": [0] * 11,
            "lineup_a_names": names_a,
            "lineup_b_names": names_b,
        }
    if made == 0:
        notes.append(f"SKIP {title}: no header paired with exactly 2 XI blocks")


# ---------------------------------------------------------------------------
# Merge
# ---------------------------------------------------------------------------

def identity(m):
    return (m["date"], frozenset([norm_team(m["opponent_a"]), norm_team(m["opponent_b"])]))


def main():
    dry = "--dry-run" in sys.argv
    limit = None
    for a in sys.argv:
        if a.startswith("--limit"):
            limit = int(a.split("=")[1])

    jobs = build_jobs()
    if limit:
        jobs = jobs[:limit]
    print(f"{len(jobs)} candidate pages")
    pages = get_pages([t for t, _, _ in jobs])

    notes = []
    fetched = sum(1 for v in pages.values() if v)
    parsed = []
    for title, comp, style in jobs:
        text = pages.get(title)
        if not text:
            continue
        parsed.extend(assemble(title, comp, style, text, notes))
    print(f"pages existing: {fetched}/{len(jobs)}; matches parsed: {len(parsed)}")

    matches = json.loads((DATA / "matches_db.json").read_text())
    before = len(matches)
    matches = [m for m in matches if m["match_id"] not in LEGACY_DUPLICATE_DROPS]
    dropped = before - len(matches)

    by_identity = {identity(m): m for m in matches}
    existing_ids = {m["match_id"] for m in matches}

    updated, added, dup_new = 0, 0, 0
    for nm in parsed:
        key = identity(nm)
        ex = by_identity.get(key)
        if ex is not None:
            # verify/update lineups in place, preserving id/competition/score
            if norm_team(ex["opponent_a"]) == norm_team(nm["opponent_a"]):
                la, lb = nm["lineup_a_names"], nm["lineup_b_names"]
            else:
                la, lb = nm["lineup_b_names"], nm["lineup_a_names"]
            if ex["lineup_a_names"] != la or ex["lineup_b_names"] != lb:
                ex["lineup_a_names"] = la
                ex["lineup_b_names"] = lb
                updated += 1
            continue
        if nm["match_id"] in existing_ids:
            nm["match_id"] += "-wp"
        if identity(nm) in by_identity:
            dup_new += 1
            continue
        by_identity[key] = nm
        existing_ids.add(nm["match_id"])
        matches.append(nm)
        added += 1

    print(f"legacy duplicate rows dropped: {dropped}")
    print(f"existing entries lineup-verified/updated: {updated}")
    print(f"new matches added: {added} (skipped as duplicate-new: {dup_new})")
    print(f"final pool size: {len(matches)}")
    for n in notes[:40]:
        print(" ", n)
    print(f"({len(notes)} skip notes total)")

    if not dry:
        (DATA / "matches_db.json").write_text(
            json.dumps(matches, indent=1, ensure_ascii=False) + "\n"
        )
        print("wrote data/matches_db.json")
        rp = DATA / "research_patches" / "wikipedia_lineups_report.txt"
        rp.write_text("\n".join(notes) + "\n")


if __name__ == "__main__":
    main()
