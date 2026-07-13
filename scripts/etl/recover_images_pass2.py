#!/usr/bin/env python3
"""
recover_images_pass2.py -- recover IP-free lead images for the fame>=55 pool
players whose image_url was blanked during the IP-compliance sweep.

Pass 1 (backfill_attributions.py) only tried the exact DB name as the Wikipedia
article title, so ~210 pool players ended up blank: either the article lives at
a disambiguated title ("... (footballer)", "... (footballer, born YYYY)",
"... (soccer)") or the DB spelling carries diacritics/word-order the article
title does not. This pass walks a small ladder of title candidates per player,
resolves each to an English Wikipedia article, and reuses the SAME strict
license rule as pass 1.

For every imageless pool player:
  1. build title candidates, in order:
       exact name; name + " (footballer)";
       name + " (footballer, born YYYY)"  (DOB year from player_ages.json);
       name + " (soccer)"; reversed word order; diacritic-stripped variant.
  2. for each candidate, one Wikipedia query (pageimages + short description +
     intro extract + disambiguation flag). Accept the first candidate whose
     article: is NOT a disambiguation page; mentions football/soccer in its
     description/intro; shares the player's surname (right-person guard); and
     whose lead image is not a crest/logo/badge file.
  3. batch-verify the chosen files' licenses via Commons extmetadata. Accept
     ONLY Public domain / CC0 / CC BY / CC BY-SA (any version, any port) --
     gated through the auditor's own canonical_license() so audit_db.py stays
     green by construction.
  4. accepted -> write the 400px Commons thumb into players_db, set
     image_source, and add an image_attributions.json entry. Otherwise the
     player is left blank (IP-safety wins).

Idempotent & resumable: only players whose image_url is still blank are
retried, and progress is flushed to disk after every chunk, so an interruption
loses nothing. Polite: custom UA, maxlag, backoff, small delays (all inherited
from pass 1's helpers).

Run: python3 scripts/etl/recover_images_pass2.py
"""
import json
import os
import re
import time
import unicodedata
import urllib.parse
import importlib.util
from datetime import datetime

DATA = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data"))
HERE = os.path.dirname(__file__)
FAME_THRESHOLD = 55.0
WIKI = "https://en.wikipedia.org/w/api.php?"
CHUNK = 20                       # players resolved between disk flushes
REJECT_FILE_TOKENS = ("logo", "crest", "badge")


def _load_module(fname, alias):
    spec = importlib.util.spec_from_file_location(alias, os.path.join(HERE, fname))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


# reuse pass-1 network/license helpers (get, acceptable, commons_licenses, ...)
p1 = _load_module("backfill_attributions.py", "p1")
# reuse the auditor's exact license canonicaliser + accepted family set so what
# we write here is, by definition, what the auditor considers IP-free.
audit = _load_module("audit_db.py", "audit_mod")
IP_FREE = audit.IP_FREE_LICENSES
canonical_license = audit.canonical_license


def deaccent(s):
    """Strip diacritics but preserve casing and spacing (for title candidates)."""
    nfkd = unicodedata.normalize("NFKD", s or "")
    return "".join(c for c in nfkd if not unicodedata.combining(c))


def tokens(s):
    """Lowercase, diacritic-free, alphabetic word tokens."""
    return [t for t in re.sub(r"[^a-z ]", " ", deaccent(s).lower()).split() if t]


def title_candidates(name, dob_year):
    cands = []

    def add(c):
        if c and c not in cands:
            cands.append(c)

    add(name)
    add(f"{name} (footballer)")
    if dob_year:
        add(f"{name} (footballer, born {dob_year})")
    add(f"{name} (soccer)")
    parts = name.split()
    if len(parts) > 1:
        add(" ".join(reversed(parts)))
    da = deaccent(name)
    if da != name:
        add(da)
    return cands


def query_article(title):
    """One Wikipedia query for a title. Returns dict or None:
       {title, pageimage, thumb, text, disambig}."""
    q = urllib.parse.urlencode({
        "action": "query", "titles": title,
        "prop": "pageimages|pageterms|pageprops|extracts",
        "piprop": "thumbnail|name", "pithumbsize": "400",
        "wbptterms": "description", "ppprop": "disambiguation",
        "exintro": "1", "explaintext": "1", "exsentences": "3",
        "redirects": "1", "maxlag": "5", "format": "json", "formatversion": "2",
    })
    d = p1.get(WIKI + q)
    pages = (d or {}).get("query", {}).get("pages", [])
    if not pages:
        return None
    p = pages[0]
    if p.get("missing"):
        return None
    desc = " ".join((p.get("terms", {}) or {}).get("description", []))
    return {
        "title": p.get("title", title),
        "pageimage": p.get("pageimage"),
        "thumb": (p.get("thumbnail") or {}).get("source"),
        "text": f"{desc}\n{p.get('extract', '')}",
        "disambig": ("disambiguation" in (p.get("pageprops") or {}))
        or p.get("title", "").endswith("(disambiguation)"),
    }


def resolve(name, dob_year):
    """First acceptable article for `name`. Returns (title, pageimage, thumb)
    or None. License is NOT checked here -- that is done in batch afterwards."""
    surname = None
    toks = tokens(name)
    if toks:
        surname = max(toks, key=len)      # longest token ~= distinctive surname
    for cand in title_candidates(name, dob_year):
        art = query_article(cand)
        time.sleep(0.5)
        if not art or art["disambig"]:
            continue
        if not art["pageimage"] or not art["thumb"]:
            continue
        fname_l = art["pageimage"].lower()
        if any(tok in fname_l for tok in REJECT_FILE_TOKENS):
            continue
        text_l = art["text"].lower()
        if "football" not in text_l and "soccer" not in text_l:
            continue
        # right-person guard: surname must surface in the resolved title or intro
        haystack = tokens(art["title"]) + tokens(art["text"])
        if surname and surname not in haystack:
            continue
        return (art["title"], art["pageimage"], art["thumb"])
    return None


def accept_license(license_short):
    """Strict gate: pass-1 reject rules AND the auditor's own IP-free family set."""
    return p1.acceptable(license_short) and \
        canonical_license(license_short) in IP_FREE


def write_all(players, att):
    json.dump(players, open(os.path.join(DATA, "players_db_v1.json"), "w",
              encoding="utf-8"), ensure_ascii=False, indent=2)
    json.dump(att, open(os.path.join(DATA, "image_attributions.json"), "w",
              encoding="utf-8"), ensure_ascii=False, indent=2)


def main():
    players = json.load(open(os.path.join(DATA, "players_db_v1.json"), encoding="utf-8"))
    att = json.load(open(os.path.join(DATA, "image_attributions.json"), encoding="utf-8"))
    fame_by_id = json.load(open(os.path.join(DATA, "fame_by_id.json"), encoding="utf-8"))
    ages = json.load(open(os.path.join(DATA, "player_ages.json"), encoding="utf-8"))

    def fame(p):
        return (fame_by_id.get(str(p["id"])) or {}).get("fame_score", 0)

    targets = [p for p in players
               if fame(p) >= FAME_THRESHOLD and not p.get("image_url")]
    print(f"imageless pool players (fame>=55): {len(targets)}")
    if not targets:
        print("nothing to do -- all pool players already have images.")
        return

    # one-time timestamped backups, mirroring existing *_backup_YYYYMMDD_HHMMSS.json
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    for base in ("players_db_v1", "image_attributions"):
        src = os.path.join(DATA, f"{base}.json")
        dst = os.path.join(DATA, f"{base}_backup_{stamp}.json")
        with open(src, encoding="utf-8") as fh:
            data = fh.read()
        with open(dst, "w", encoding="utf-8") as fh:
            fh.write(data)
    print(f"backups written with stamp {stamp}")

    by_id = {p["id"]: p for p in players}
    recovered = 0
    still_blank = 0
    lic_breakdown = {}

    for start in range(0, len(targets), CHUNK):
        chunk = targets[start:start + CHUNK]
        # phase A: resolve article + lead image for each player in the chunk
        resolved = {}   # pid -> (title, pageimage, thumb)
        for p in chunk:
            # resumability: skip if a prior (flushed) chunk already filled it
            if by_id[p["id"]].get("image_url"):
                continue
            dob = ages.get(str(p["id"]), "")
            dob_year = dob[:4] if dob and dob[:4].isdigit() else None
            r = resolve(p["name"], dob_year)
            if r:
                resolved[p["id"]] = r

        # phase B: batch license lookup for this chunk's files
        files = sorted({pi for (_, pi, _) in resolved.values()})
        lic = p1.commons_licenses(files) if files else {}

        # phase C: apply accepted ones, blank the rest
        for p in chunk:
            pid = p["id"]
            if by_id[pid].get("image_url"):
                continue
            r = resolved.get(pid)
            ok = False
            if r:
                title, pimg, thumb = r
                meta = lic.get(pimg)
                if meta and accept_license(meta["license"]):
                    by_id[pid]["image_url"] = thumb
                    by_id[pid]["image_source"] = "wikimedia_commons"
                    att[str(pid)] = {
                        "player_name": p["name"],
                        "wikipedia_title": title,
                        "license": meta["license"].lower(),
                        "license_url": meta["license_url"],
                        "artist": meta["artist"],
                        "image_url": thumb,
                    }
                    fam = canonical_license(meta["license"])
                    lic_breakdown[fam] = lic_breakdown.get(fam, 0) + 1
                    recovered += 1
                    ok = True
            if not ok:
                # keep it blank (already ''); ensure source is clean too
                by_id[pid]["image_url"] = ""
                by_id[pid]["image_source"] = ""
                still_blank += 1

        # flush after every chunk so an interruption loses nothing
        write_all(players, att)
        done = min(start + CHUNK, len(targets))
        print(f"  progress {done}/{len(targets)} "
              f"(recovered {recovered}, blank {still_blank})")

    print("-" * 60)
    print(f"recovered (IP-free image): {recovered}")
    print(f"still blank:               {still_blank}")
    print(f"license breakdown:         {lic_breakdown}")


if __name__ == "__main__":
    main()
