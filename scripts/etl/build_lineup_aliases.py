#!/usr/bin/env python3
"""Build data/lineup_aliases.json: lineup-name -> players_db id identity layer.

Problem: Missing XI matches guesses by folded name string only. ~2k lineup
entries (of ~5k) don't exist in players_db under the lineup's spelling, so the
game appends a synthetic entry for them. That keeps them typeable, BUT when the
SAME human exists in the DB under a different spelling ("Sergio Aguero" in the
DB vs "Aguero" on the team sheet), picking the real DB player from search
scores WRONG and costs a life.

This script maps each such lineup name to the intended players_db id (or a
career_paths-only id, offset +100000 exactly like getAllPlayersWithCareer).

PRECISION over recall: a wrong alias turns a wrong guess into a "correct" one,
which is worse than the status quo (the synthetic spelling still works), so
ambiguous names simply stay synthetic. Concretely (each rule was tuned against
a manual review file; generic fuzzy matching was tried and REMOVED because it
mapped wrong humans — Andy Cole -> Ashley Cole, Thomas Linke -> Thomas Kleine):

Name evidence (must anchor on the SURNAME, never a shared first name):
  - strong-fold equality: extends NFD folding with ø/ß/đ/ł/æ... which the
    app's foldName can't fold ("Jorgensen" == "Jørgensen")
  - surname subset: lineup tokens are a subset/superset of the candidate's and
    the lineup's LAST token is part of the shared evidence
    ("Aguero" ⊂ "Sergio Aguero", "Cruyff" ⊂ "Johan Cruyff")
  - initial form: "R. Baggio" -> first-initial match + exact surname
  - nickname table: "Ignacio Fernandez" ~ "Nacho Fernandez" (curated pairs)
  - mononym: DB name is a single token equal to the lineup's FIRST token
    ("Emerson Palmieri" -> DB "Emerson") — accepted ONLY with club-career
    corroboration, since first names alone routinely hit the wrong human

Hard gates on every candidate:
  - nationality for international matches (with historical aliases:
    West Germany -> Germany, USSR -> successors, ...)
  - era plausibility where known: DOB (data/player_ages.json), retired_year,
    status=active (implies no pre-2002 caps), career-span windows

Acceptance (after gates):
  - international match: unique surviving candidate
  - club match: unique candidate WITH career-club overlap for the match year,
    OR unique candidate whose surname evidence is rare (token df <= 12) AND
    who is famous enough to plausibly start the match (fame >= 45) — this
    keeps "Alaba" -> David Alaba while rejecting low-fame modern namesakes
    (Lucas Scholl for Mehmet Scholl's "Scholl", etc.)
  - two lineup slots resolving to one human: both dropped (data smell)

players_db carries duplicate rows for some humans (e.g. 39073 "Émerson" and
181778 "Emerson" are both Emerson Palmieri — same club, position and market
value). Survivors with the same strong-folded name AND the same current_team
are collapsed into one identity carrying ALL its row ids, and the alias file
stores id ARRAYS so picking either duplicate row in search counts.

Output shape (only names whose folded spelling is NOT in the guess pool):
  { "<match_id>": { "<folded lineup name>": [<player id>, ...], ... }, ... }

Run:  python3 scripts/etl/build_lineup_aliases.py [--report]
"""

import json
import re
import sys
import unicodedata
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data"

CAREER_ID_OFFSET = 100_000  # mirrors getAllPlayersWithCareer in lib/playerData.ts

# Characters NFD folding can't reduce (the app's foldName has the same blind
# spot, which is exactly why these need the id-alias layer).
STRONG_FOLD = str.maketrans({
    "ø": "o", "đ": "d", "ð": "d", "þ": "th", "ł": "l", "æ": "ae", "œ": "oe",
    "ı": "i", "ħ": "h", "ŧ": "t", "ß": "ss",
})


def fold(s: str) -> str:
    """Match lib/matchData.ts foldName exactly (JSON keys must agree with it)."""
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    return s.lower().strip()


def strong_fold(s: str) -> str:
    return fold(s).translate(STRONG_FOLD)


def tokens(s: str) -> list[str]:
    return [t for t in re.split(r"[\s\-'.]+", strong_fold(s)) if t]


# Curated first-name nickname equivalences (folded). Kept deliberately small —
# every pair must be unambiguous in football usage.
NICKNAMES = [
    {"nacho", "ignacio"},
    {"rafa", "rafael"},
    {"santi", "santiago"},
    {"juanma", "juan manuel"},
    {"pepe", "jose"},
    {"kiko", "francisco"},
    {"edu", "eduardo"},
    {"fred", "frederico"},
    {"maxi", "maximiliano"},
    {"ale", "alejandro"},
]


def nickname_pair(a: str, b: str) -> bool:
    return any(a in s and b in s for s in NICKNAMES)


# Hand-verified aliases the automatic rules can't prove from local data alone
# (folded lineup name -> players_db row ids, ALL duplicate rows of the human).
# Only add entries after checking the DB rows and the actual match lineups.
MANUAL_ALIASES: dict[str, list[int]] = {
    # Emerson Palmieri (Chelsea EL final 2019, Italy Euro 2020 final): rows
    # 181778 (Italy/Marseille) and 39073 (duplicate row, mislabeled Brazil —
    # same club/position/value; the Brazilian Emerson retired in 2011).
    "emerson palmieri": [181778, 39073],
}


# Historical / spelling country aliases (folded team name -> folded DB nationalities)
COUNTRY_ALIASES: dict[str, set[str]] = {
    "west germany": {"germany"},
    "east germany": {"germany"},
    "soviet union": {"russia", "ukraine", "belarus", "georgia", "armenia", "lithuania"},
    "ussr": {"russia", "ukraine", "belarus", "georgia", "armenia", "lithuania"},
    "yugoslavia": {
        "serbia", "croatia", "bosnia-herzegovina", "bosnia and herzegovina",
        "montenegro", "north macedonia", "slovenia",
    },
    "czechoslovakia": {"czech republic", "czechia", "slovakia"},
    "holland": {"netherlands"},
    "usa": {"united states", "usa"},
    "united states": {"united states", "usa"},
    "south korea": {"south korea", "korea, south", "korea republic"},
    "ireland": {"ireland", "republic of ireland"},
    "republic of ireland": {"ireland", "republic of ireland"},
    "china": {"china", "china pr"},
    "cote d'ivoire": {"cote d'ivoire", "ivory coast"},
    "ivory coast": {"cote d'ivoire", "ivory coast"},
    "dr congo": {"dr congo", "congo dr", "congo, dr"},
    "cape verde": {"cape verde", "cabo verde"},
}


def match_year(m: dict) -> int:
    d = (m.get("date") or "")[:4]
    if d.isdigit():
        return int(d)
    hit = re.search(r"(\d{4})", str(m.get("season", "")))
    return int(hit.group(1)) if hit else 2000


class Candidate:
    __slots__ = ("cid", "name", "folded", "strong", "toks", "nationality",
                 "status", "retired_year", "dob_year", "clubs", "fame",
                 "current_team")

    def __init__(self, cid, name, nationality, status=None, retired_year=None,
                 dob_year=None, clubs=None, fame=None, current_team=None):
        self.cid = cid
        self.name = name
        self.folded = fold(name)
        self.strong = strong_fold(name)
        self.toks = tokens(name)
        self.nationality = fold(nationality or "")
        self.status = status
        self.retired_year = retired_year
        self.dob_year = dob_year
        self.clubs = clubs or []  # (folded club, from_year|None, to_year|None)
        self.fame = fame
        self.current_team = fold(current_team or "")


def load():
    players = json.loads((DATA / "players_db_v1.json").read_text())
    careers = json.loads((DATA / "career_paths.json").read_text())
    matches = json.loads((DATA / "matches_db.json").read_text())
    ages = json.loads((DATA / "player_ages.json").read_text())
    transfers = json.loads((DATA / "transfers.json").read_text())
    fame_by_id = json.loads((DATA / "fame_by_id.json").read_text())
    fame_scores = json.loads((DATA / "fame_scores.json").read_text())
    return players, careers, matches, ages, transfers, fame_by_id, fame_scores


def build_candidates(players, careers, ages, transfers, fame_by_id, fame_scores):
    spans_by_name: dict[str, list] = defaultdict(list)
    for cp in careers:
        for e in cp.get("career", []):
            spans_by_name[fold(cp["name"])].append((fold(e["club"]), e.get("from"), e.get("to")))
    for th in transfers:
        for t in th.get("transfers", []):
            fy = int(t["date_joined"][:4]) if t.get("date_joined") else None
            ty = int(t["date_left"][:4]) if t.get("date_left") else None
            spans_by_name[fold(th["player_name"])].append((fold(t["club_name"]), fy, ty))

    fame_by_name: dict[str, float] = {}
    for e in fame_scores:
        k = fold(e["name"])
        fame_by_name[k] = max(fame_by_name.get(k, 0), e.get("fame_score", 0))

    cands: list[Candidate] = []
    db_folded = set()
    for p in players:
        dob = ages.get(str(p["id"]))
        fid = fame_by_id.get(str(p["id"]))
        cands.append(Candidate(
            p["id"], p["name"], p.get("nationality"),
            status=p.get("status"), retired_year=p.get("retired_year"),
            dob_year=int(dob[:4]) if dob else None,
            clubs=spans_by_name.get(fold(p["name"]), []),
            fame=fid.get("fame_score") if fid else fame_by_name.get(fold(p["name"])),
            current_team=p.get("current_team"),
        ))
        db_folded.add(fold(p["name"]))
    for cp in careers:
        f = fold(cp["name"])
        if f in db_folded:
            continue
        last_to = max((e["to"] for e in cp.get("career", []) if isinstance(e.get("to"), int)),
                      default=None)
        cands.append(Candidate(
            CAREER_ID_OFFSET + cp["id"], cp["name"], cp.get("nationality"),
            retired_year=last_to,
            clubs=spans_by_name.get(f, []),
            fame=fame_by_name.get(f),
        ))
        db_folded.add(f)
    return cands, db_folded


def era_ok(c: Candidate, year: int) -> bool:
    if c.dob_year is not None:
        return 15 <= year - c.dob_year <= 43
    if c.retired_year is not None:
        if year > c.retired_year + 1 or year < c.retired_year - 24:
            return False
    elif year < 2003:
        # No DOB and no retired_year: every such players_db row is part of the
        # modern snapshot (all ingested legends carry status+retired_year), so
        # the candidate was active ~2025 and can't have started a pre-2003
        # match. This is what keeps "Di Livio" (Italy 1998, Angelo) from
        # mapping to Lorenzo Di Livio (his son, in the DB with no metadata).
        return False
    if c.clubs:
        froms = [f for _, f, _ in c.clubs if isinstance(f, int)]
        tos = [t for _, _, t in c.clubs if isinstance(t, int)]
        if froms and year < min(froms) - 1:
            return False
        if froms and tos and len(tos) == len(c.clubs) and year > max(tos) + 1:
            return False
    return True


def nationality_ok(c: Candidate, team_folded: str, is_international: bool) -> bool:
    if not is_international:
        return True
    allowed = COUNTRY_ALIASES.get(team_folded, {team_folded})
    return c.nationality in allowed


def club_overlap(c: Candidate, team_folded: str, year: int) -> bool:
    for club, fy, ty in c.clubs:
        if club and (club in team_folded or team_folded in club):
            lo = (fy - 1) if isinstance(fy, int) else -9999
            hi = (ty + 1) if isinstance(ty, int) else 9999
            if lo <= year <= hi:
                return True
    return False


def name_evidence(lt: list[str], l_strong: str, c: Candidate, df) -> tuple[str, int] | None:
    """(kind, rarest shared-token df) if candidate plausibly IS the lineup name.

    Kinds: 'exact' (strong-fold equality), 'surname' (subset anchored on the
    lineup's last token), 'initial' ("R. Baggio"), 'nickname', and 'mononym'
    (weak — needs club corroboration to be accepted).
    """
    if l_strong == c.strong:
        return ("exact", 0)
    ls, cs = set(lt), set(c.toks)
    if not ls or not cs:
        return None
    shared = ls & cs
    # initial form: "r baggio" (from "R. Baggio")
    if len(lt) == 2 and len(lt[0]) == 1 and c.toks:
        if lt[1] in cs and c.toks[0][:1] == lt[0]:
            return ("initial", df.get(lt[1], 0))
    # nickname first token + all remaining tokens identical
    if len(lt) >= 2 and len(c.toks) >= 2 and lt[1:] == c.toks[1:] and nickname_pair(lt[0], c.toks[0]):
        return ("nickname", df.get(lt[-1], 0))
    if shared and (ls <= cs or cs <= ls):
        if lt[-1] in shared:
            return ("surname", min(df.get(t, 0) for t in shared))
        # DB mononym equal to the lineup's first name ("Emerson Palmieri" -> "Emerson")
        if len(c.toks) == 1 and c.toks[0] == lt[0]:
            return ("mononym", df.get(lt[0], 0))
    return None


def main():
    report = "--report" in sys.argv
    players, careers, matches, ages, transfers, fame_by_id, fame_scores = load()
    cands, db_folded = build_candidates(players, careers, ages, transfers, fame_by_id, fame_scores)

    df: dict[str, int] = defaultdict(int)
    for c in cands:
        for t in set(c.toks):
            df[t] += 1

    countries = {fold(p.get("nationality") or "") for p in players}
    countries.discard("")
    countries.update(COUNTRY_ALIASES.keys())

    by_token: dict[str, list[Candidate]] = defaultdict(list)
    for c in cands:
        for t in set(c.toks):
            by_token[t].append(c)

    aliases: dict[str, dict[str, list[int]]] = {}
    stats = defaultdict(int)
    review = []
    missing_entries = 0

    for m in matches:
        year = match_year(m)
        for side in ("a", "b"):
            team_folded = fold(m[f"opponent_{side}"])
            is_international = team_folded in countries
            side_map: dict[str, list[int]] = {}
            for name in m[f"lineup_{side}_names"]:
                lf = fold(name)
                if lf in db_folded:
                    continue  # typeable already; the name layer handles it
                missing_entries += 1
                if lf in MANUAL_ALIASES:
                    side_map[lf] = list(MANUAL_ALIASES[lf])
                    stats["manual"] += 1
                    continue
                lt = tokens(name)
                l_strong = strong_fold(name)
                shortlist = {id(c): c for t in lt for c in by_token.get(t, [])}
                # strong-fold equality can share no token (rare); sweep same-initial
                if not shortlist and l_strong:
                    for c in cands:
                        if c.strong == l_strong:
                            shortlist[id(c)] = c
                survivors = []
                for c in shortlist.values():
                    ev = name_evidence(lt, l_strong, c, df)
                    if not ev:
                        continue
                    if not nationality_ok(c, team_folded, is_international):
                        continue
                    if not era_ok(c, year):
                        continue
                    survivors.append((ev, club_overlap(c, team_folded, year), c))

                if not survivors:
                    stats["no-candidate"] += 1
                    continue

                # Collapse players_db duplicate rows: same strong-folded name AND
                # same current_team means one human ingested twice; keep every
                # row id so picking either duplicate in search counts.
                groups: dict[tuple, list] = {}
                for s in survivors:
                    groups.setdefault((s[2].strong, s[2].current_team), []).append(s)
                idents = []
                for g in groups.values():
                    ev = max((s[0] for s in g), key=lambda e: e[0] != "mononym")
                    corro = any(s[1] for s in g)
                    idents.append((ev, corro, g[0][2], [s[2].cid for s in g]))

                strong_surv = [s for s in idents if s[0][0] != "mononym"]
                corroborated = [s for s in idents if s[1]]
                accept = None
                why = ""
                if len(corroborated) == 1 and (
                    len(idents) == 1 or corroborated[0][0][0] != "mononym" or len(strong_surv) == 0
                ):
                    # career-club overlap for the match year singles one human out
                    accept = corroborated[0]
                    why = f"corro-{corroborated[0][0][0]}"
                elif len(strong_surv) == 1 and not corroborated:
                    ev, _, c, _ids = strong_surv[0]
                    if is_international:
                        accept, why = strong_surv[0], f"intl-{ev[0]}"
                    elif ev[0] == "exact":
                        accept, why = strong_surv[0], "exact"
                    elif ev[1] <= 12 and (c.fame or 0) >= 45:
                        # club match, no career data: rare surname + famous enough
                        # to plausibly start this match
                        accept, why = strong_surv[0], f"club-{ev[0]}"
                    else:
                        stats["club-unverifiable"] += 1
                elif len(idents) > 1:
                    stats["ambiguous"] += 1
                    if report:
                        review.append(
                            f"AMBIG {m['match_id']} [{name}] -> "
                            + "; ".join(f"{c.name}({c.cid},{ev[0]},corro={co})" for ev, co, c, _ in idents[:4])
                        )
                else:
                    stats["mononym-uncorroborated"] += 1

                if accept is None:
                    continue
                _, _, c, ids = accept
                taken = {i for v in side_map.values() for i in v}
                if taken & set(ids):
                    for k in [k for k, v in side_map.items() if set(v) & set(ids)]:
                        del side_map[k]
                    stats["dropped-collision"] += 1
                    continue
                side_map[lf] = ids
                stats[why] += 1
                if report:
                    review.append(
                        f"MAP   {m['match_id']} ({m[f'opponent_{side}']} {year}) [{name}] -> "
                        f"{c.name} (ids {ids}, {why}, fame={c.fame})"
                    )
            if side_map:
                aliases.setdefault(m["match_id"], {}).update(side_map)

    mapped = sum(len(v) for v in aliases.values())
    out = DATA / "lineup_aliases.json"
    out.write_text(json.dumps(aliases, indent=1, ensure_ascii=False, sort_keys=True) + "\n")
    print(f"lineup entries with no DB spelling: {missing_entries}")
    print(f"alias-mapped to a DB identity:      {mapped}")
    print(f"stayed synthetic:                   {missing_entries - mapped}")
    for k in sorted(stats):
        print(f"  {k}: {stats[k]}")
    print(f"wrote {out}")
    if report:
        rp = DATA / "research_patches" / "lineup_alias_review.txt"
        rp.write_text("\n".join(review) + "\n")
        print(f"review report: {rp} ({len(review)} lines)")


if __name__ == "__main__":
    main()
