"""Shared helpers for the player-data ETL pipeline (stdlib only)."""
import json
import os
import re
import unicodedata

# Repo root = two levels up from this file (scripts/etl/common.py -> repo).
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DATA_DIR = os.path.join(REPO_ROOT, "data")

PLAYERS_DB = os.path.join(DATA_DIR, "players_db_v1.json")
FAME_SCORES = os.path.join(DATA_DIR, "fame_scores.json")
PLAYER_AGES = os.path.join(DATA_DIR, "player_ages.json")
CLUB_ID_MAP = os.path.join(DATA_DIR, "club_id_map.json")
TEAM_COLORS_TS = os.path.join(DATA_DIR, "teamColors.ts")

# "Today" for age math. Matches the pipeline's reference date (July 2026).
REFERENCE_YEAR = 2026


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def dump_json(path, obj):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)


def norm_name(s):
    """Accent-folded, lowercased, trimmed name.

    Mirrors lib/higherLowerGenerator.ts so the ETL joins fame_scores to
    players_db the same way the app does.
    """
    if not s:
        return ""
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return s.lower().strip()


def player_norm_keys(p):
    """Candidate join keys for a players_db row."""
    keys = set()
    nn = p.get("normalized_name")
    if nn:
        keys.add(nn.strip().lower())
    keys.add(norm_name(p.get("name", "")))
    return {k for k in keys if k}


def build_fame_by_norm(fame_scores):
    """normalized name -> best (highest fame_score) fame entry."""
    out = {}
    for entry in fame_scores:
        key = norm_name(entry.get("name", ""))
        if not key:
            continue
        prev = out.get(key)
        if prev is None or entry.get("fame_score", 0) > prev.get("fame_score", 0):
            out[key] = entry
    return out


def fame_for_player(p, fame_by_norm):
    """Return the fame entry matching a players_db row, or None."""
    for k in player_norm_keys(p):
        e = fame_by_norm.get(k)
        if e is not None:
            return e
    return None


def birth_year_from_ages(ages, player_id):
    """Extract a 4-digit birth year from player_ages.json for an id, or None."""
    raw = ages.get(str(player_id))
    if not raw:
        return None
    m = re.match(r"(\d{4})", str(raw))
    return int(m.group(1)) if m else None


def age_from_ages(ages, player_id):
    by = birth_year_from_ages(ages, player_id)
    if by is None:
        return None
    return REFERENCE_YEAR - by


# --- team / badge resolution (heuristic, for reporting only) -----------------

_SUFFIX_TOKENS = {
    "football", "club", "fc", "cf", "afc", "ac", "as", "ss", "ssc", "sc",
    "de", "futbol", "calcio", "spa", "sad", "ev", "gmbh", "fussball",
    "fußball", "associazione", "sportiva", "societa", "società", "balompie",
    "balompié", "und", "co", "kgaa", "the", "e", "sportif",
    # German/Italian/Spanish descriptor words in official long names
    "verein", "fur", "leibesubungen", "bewegungsspiele", "von", "rasenballsport",
    "unione", "real", "club", "de", "asociacion", "association", "aktien",
    # year suffixes ("1893", "1909", ...) and single letters from "S.p.A." etc.
}

# Anglicisation folds so official DB spellings collapse onto teamColors keys.
_TOKEN_FOLDS = [("munchen", "munich")]

# Generic club words that on their own don't identify a club; used to avoid
# false-positive substring matches in the club resolver.
_GENERIC_CLUB_TOKENS = {
    "united", "city", "town", "athletic", "sporting", "rovers", "county",
    "albion", "wanderers", "rangers", "olympic", "olympique", "atletico",
    "racing", "dynamo", "sporting",
}


def _team_token(name):
    """Collapse a team name to a comparable alnum token bag string."""
    n = norm_name(name)
    n = re.sub(r"[^a-z0-9 ]", " ", n)
    toks = []
    for t in n.split():
        if not t or t in _SUFFIX_TOKENS:
            continue
        if t.isdigit():  # drop founding-year tokens like 1893, 1909
            continue
        if len(t) == 1:  # drop stray initials from "S. A. D." etc.
            continue
        for a, b in _TOKEN_FOLDS:
            t = t.replace(a, b)
        toks.append(t)
    return "".join(toks)


def load_team_color_keys():
    """Parse the object keys out of data/teamColors.ts."""
    try:
        with open(TEAM_COLORS_TS, "r", encoding="utf-8") as f:
            src = f.read()
    except FileNotFoundError:
        return []
    # Grab the body of the teamColors object literal.
    start = src.find("teamColors")
    body = src[start:] if start != -1 else src
    keys = []
    # Quoted keys: 'Real Madrid': {  or  "Real Madrid": {
    keys += re.findall(r"""["']([^"']+)["']\s*:\s*\{""", body)
    # Bare identifier keys: Arsenal: {
    keys += re.findall(r"(?m)^\s*([A-Za-z][A-Za-z0-9]*)\s*:\s*\{", body)
    # Drop the TeamColor field names that also match `word: {`-ish patterns.
    blacklist = {"primary", "secondary", "pattern"}
    return [k for k in keys if k not in blacklist]


def build_badge_resolver():
    keys = load_team_color_keys()
    tokens = {}
    for k in keys:
        t = _team_token(k)
        if t:
            tokens[t] = k
    def resolve(team_name):
        if not team_name:
            return None
        t = _team_token(team_name)
        if not t:
            return None
        if t in tokens:
            return tokens[t]
        # substring either direction (handles long official vs short names)
        for kt, orig in tokens.items():
            if len(kt) >= 5 and (kt in t or t in kt):
                return orig
        return None
    return resolve


def build_club_resolver(players, club_map=None):
    """Resolve a researcher-supplied common club name to the EXACT
    current_team string the app indexes on (Grid matches these verbatim).

    Returns resolve(name) -> (official_string | None, method). Tiers:
      exact -> normalized -> club_id_map alias group -> unique token equality
      -> unique token substring. Anything ambiguous/unknown returns None so the
    caller can log it for manual review instead of guessing wrong.
    """
    counts = {}
    for p in players:
        t = (p.get("current_team") or "").strip()
        if t:
            counts[t] = counts.get(t, 0) + 1
    db_teams = sorted(counts)
    db_set = set(db_teams)
    norm_to_db = {}
    token_to_db = {}
    for t in db_teams:
        norm_to_db.setdefault(norm_name(t), t)
        token_to_db.setdefault(_team_token(t), set()).add(t)

    def _canonical(cands):
        # players_db stores some clubs under several strings (e.g. "Real Madrid"
        # vs "Real Madrid Club de Fútbol"); the Grid pool uses the majority form,
        # so pick the candidate the most players already use (tiebreak: longest).
        return max(cands, key=lambda t: (counts.get(t, 0), len(t), t))

    # club_id_map: normalized name -> the full list of names in that club entry
    # (canonical_name + aliases), so a common name can reach its official form.
    alias_group = {}
    if club_map is None:
        try:
            club_map = load_json(CLUB_ID_MAP).get("clubs", [])
        except FileNotFoundError:
            club_map = []
    for c in club_map:
        names = [c.get("canonical_name")] + list(c.get("aliases") or [])
        names = [n for n in names if n]
        for n in names:
            alias_group.setdefault(norm_name(n), names)

    def resolve(name):
        if not name or not name.strip():
            return None, "empty"
        raw = name.strip()
        n = norm_name(raw)

        # Collect all "strong" candidates (same club by exact/normalized/alias/
        # token identity), then pick the majority db representation.
        strong = set()
        if raw in db_set:
            strong.add(raw)
        if n in norm_to_db:
            strong.add(norm_to_db[n])
        for cand in alias_group.get(n, ()):
            if cand in db_set:
                strong.add(cand)
            elif norm_name(cand) in norm_to_db:
                strong.add(norm_to_db[norm_name(cand)])
        tk = _team_token(raw)
        if tk and tk in token_to_db:
            strong |= token_to_db[tk]

        if strong:
            best = _canonical(strong)
            method = "exact" if best == raw else "canonical"
            return best, method

        # Fallback: unique token-substring match (handles long official vs short).
        # Skip generic single-word tokens ("united", "city") to avoid mapping an
        # unknown "* United" onto the one db club that reduced to just "united".
        if tk and len(tk) >= 6 and tk not in _GENERIC_CLUB_TOKENS:
            matches = set()
            for kt, teams in token_to_db.items():
                if (len(kt) >= 6 and kt not in _GENERIC_CLUB_TOKENS
                        and (kt in tk or tk in kt)):
                    matches |= teams
            if len(matches) == 1:
                return next(iter(matches)), "token_substring"
        return None, "unresolved"

    return resolve
