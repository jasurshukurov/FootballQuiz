#!/usr/bin/env python3
"""Pass 3 for pool_pageviews.json: evict non-footballer articles + retry gaps.

Pass 2's exact-title strategy can land on a MORE famous non-footballer
namesake (found live: our Carlos Alcaraz, the Argentine midfielder, resolved
to the tennis player's article at 6.9M views). Batched description check
(50 titles/request): any resolved title whose Wikidata description does not
look like an association-football player is re-resolved via search with
"footballer" and its views refetched. Also retries entries still unresolved.
stdlib only.
"""
import json
import re
import sys
import time
import unicodedata
import urllib.parse
import urllib.request

OUT = ("/private/tmp/claude-501/-Users-jasur-workspace-football/"
       "622f5dd0-aced-4c1e-af52-4c947b59a401/scratchpad/audit_out/pool_pageviews.json")
UA = {"User-Agent": "FootballTriviaETL/1.0 (jasur.shukurov29@gmail.com) python-urllib"}
START, END = "2025070100", "2026063000"
FOOTBALL = re.compile(r"footballer|football (player|manager|coach)|soccer", re.I)
# "American football coach" satisfies FOOTBALL's `football coach` branch —
# found live: our Ben Johnson (Ipswich) resolved to the NFL Bears coach.
AMERICAN = re.compile(r"american football|gridiron|national football league|nfl", re.I)
BAD_TITLE = re.compile(r"^(List of|Career of|.* career achievements)", re.I)


def fold(s):
    n = unicodedata.normalize("NFKD", s or "")
    return "".join(c for c in n if not unicodedata.combining(c)).lower().strip()


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
                time.sleep(min(float(e.headers.get("Retry-After") or 2 ** (attempt + 1)), 30))
                continue
            return None
        except Exception:  # noqa: BLE001
            time.sleep(2 ** attempt)
    return None


def descriptions(titles):
    out = {}
    for i in range(0, len(titles), 50):
        chunk = titles[i:i + 50]
        q = urllib.parse.quote("|".join(chunk))
        obj = get("https://en.wikipedia.org/w/api.php?action=query&redirects=1"
                  f"&titles={q}&prop=description&format=json")
        time.sleep(0.35)
        if not obj:
            continue
        query = obj.get("query", {})
        back = {}
        for frm in query.get("normalized", []) + query.get("redirects", []):
            back[frm["to"]] = back.get(frm["from"], frm["from"])
        for page in (query.get("pages") or {}).values():
            t = page.get("title")
            out[back.get(t, t)] = page.get("description") or ""
    return out


def search_footballer(name):
    q = urllib.parse.quote(f"{name} footballer")
    obj = get("https://en.wikipedia.org/w/api.php?action=query&list=search"
              f"&srsearch={q}&srlimit=5&format=json")
    time.sleep(0.35)
    hits = (((obj or {}).get("query") or {}).get("search") or [])
    surname = fold(name).split()[-1] if fold(name).split() else ""
    for h in hits:
        t = h["title"]
        if BAD_TITLE.match(t):
            continue
        if "(footballer" in t.lower() or "(soccer" in t.lower():
            return t
    for h in hits:
        t = h["title"]
        if not BAD_TITLE.match(t) and surname and surname in fold(t):
            return t
    return None


def pageviews(title):
    t = urllib.parse.quote(title.replace(" ", "_"), safe="")
    obj = get("https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/"
              f"en.wikipedia/all-access/user/{t}/monthly/{START}/{END}")
    time.sleep(0.35)
    if not obj:
        return None
    return sum(it.get("views", 0) for it in obj.get("items", []))


def main():
    out = json.load(open(OUT))
    titled = sorted({v["title"] for v in out.values() if v.get("title")})
    print(f"checking descriptions for {len(titled)} titles...", flush=True)
    desc = descriptions(titled)

    fix, retry = [], []
    for pid, v in out.items():
        t = v.get("title")
        d = desc.get(t, "")
        if t and d and (not FOOTBALL.search(d) or AMERICAN.search(d)):
            # a description exists and it isn't football — suspicious
            fix.append(pid)
            v["suspect_description"] = d
        elif v.get("pageviews_12mo") is None:
            retry.append(pid)
    print(f"non-footballer articles: {len(fix)}; unresolved retries: {len(retry)}", flush=True)
    for pid in fix:
        v = out[pid]
        better = search_footballer(v["name"])
        if better and better != v["title"]:
            print(f"  evict: {v['name']}: {v['title']} ({v['suspect_description'][:40]}) -> {better}", flush=True)
            v["title"] = better
            v["pageviews_12mo"] = pageviews(better)
            v["confidence"] = "resolved" if v["pageviews_12mo"] is not None else "unresolved"
        else:
            # keep, but mark it so fame recalibration can ignore the value
            v["confidence"] = "suspect"
            print(f"  no better title for {v['name']} ({v['suspect_description'][:50]}) — marked suspect", flush=True)
    for pid in retry:
        v = out[pid]
        if v.get("title"):
            v["pageviews_12mo"] = pageviews(v["title"])
            v["confidence"] = "resolved" if v["pageviews_12mo"] is not None else "unresolved"

    json.dump(out, open(OUT, "w"), ensure_ascii=False, indent=0)
    ok = sum(1 for v in out.values() if v["confidence"] == "resolved")
    print(f"DONE pass3: resolved {ok}/{len(out)}")


if __name__ == "__main__":
    sys.stdout.reconfigure(line_buffering=True)
    main()
