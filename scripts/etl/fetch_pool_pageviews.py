#!/usr/bin/env python3
"""Fetch REAL 12-month Wikipedia pageviews for the fame pool.

Replaces the hand-tuned wikipedia_pageviews estimates (see
generate_popularity_metrics.js KNOWN_PLAYERS) with measured data:

  1. Resolve each fame_by_id player (fame >= 50) to an English Wikipedia
     title via the MediaWiki search API ("<name> footballer").
  2. Fetch monthly per-article pageviews (user traffic only) for
     2025-07..2026-06 from the Wikimedia REST pageviews API and sum them.

Writes {players_db_id: {name, title, pageviews_12mo, confidence}} to the
audit scratchpad. Paced ~0.35s/request with 429/503 backoff per the
Wikimedia etiquette this repo has already learned the hard way
(one title per pageviews request; explicit User-Agent). stdlib only.
"""
import json
import os
import sys
import time
import urllib.parse
import urllib.request

DATA = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data"))
OUT = ("/private/tmp/claude-501/-Users-jasur-workspace-football/"
       "622f5dd0-aced-4c1e-af52-4c947b59a401/scratchpad/audit_out/pool_pageviews.json")
UA = {"User-Agent": "FootballTriviaETL/1.0 (jasur.shukurov29@gmail.com) python-urllib"}
FAME_MIN = 50.0
START, END = "2025070100", "2026063000"


def get(url, retries=4):
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=20) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            if e.code in (429, 503):
                wait = float(e.headers.get("Retry-After") or 2 ** (attempt + 1))
                time.sleep(min(wait, 30))
                continue
            return None
        except Exception:  # noqa: BLE001
            time.sleep(2 ** attempt)
    return None


def resolve_title(name):
    q = urllib.parse.quote(f"{name} footballer")
    obj = get("https://en.wikipedia.org/w/api.php?action=query&list=search"
              f"&srsearch={q}&srlimit=1&format=json")
    hits = (((obj or {}).get("query") or {}).get("search") or [])
    return hits[0]["title"] if hits else None


def pageviews(title):
    t = urllib.parse.quote(title.replace(" ", "_"), safe="")
    obj = get("https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/"
              f"en.wikipedia/all-access/user/{t}/monthly/{START}/{END}")
    if not obj:
        return None
    return sum(it.get("views", 0) for it in obj.get("items", []))


def main():
    fame = json.load(open(os.path.join(DATA, "fame_by_id.json")))
    db = {p["id"]: p for p in json.load(open(os.path.join(DATA, "players_db_v1.json")))}
    pool = sorted(((int(k), v) for k, v in fame.items() if v["fame_score"] >= FAME_MIN),
                  key=lambda kv: -kv[1]["fame_score"])
    out = {}
    if os.path.exists(OUT):  # resumable
        out = json.load(open(OUT))
    done = 0
    for pid, entry in pool:
        if str(pid) in out:
            continue
        name = entry["name"]
        title = resolve_title(name)
        time.sleep(0.35)
        views = pageviews(title) if title else None
        time.sleep(0.35)
        nat = (db.get(pid) or {}).get("nationality", "")
        out[str(pid)] = {
            "name": name,
            "title": title,
            "pageviews_12mo": views,
            "confidence": "resolved" if views is not None else "unresolved",
            "nationality": nat,
        }
        done += 1
        if done % 50 == 0:
            json.dump(out, open(OUT, "w"), ensure_ascii=False, indent=0)
            print(f"{done} fetched ({len(out)}/{len(pool)} total)", flush=True)
    json.dump(out, open(OUT, "w"), ensure_ascii=False, indent=0)
    resolved = sum(1 for v in out.values() if v["pageviews_12mo"] is not None)
    print(f"DONE {len(out)} players, {resolved} resolved -> {OUT}")


if __name__ == "__main__":
    sys.stdout.reconfigure(line_buffering=True)
    main()
