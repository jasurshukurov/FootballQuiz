#!/usr/bin/env python3
"""Pass 2 for pool_pageviews.json: fix title mis-resolution and refetch gaps.

Pass 1 resolved titles via search-first, which grabbed sidebar articles for
some stars ("List of career achievements by Cristiano Ronaldo", "Career of
Lionel Messi", "Wilfrid Mbappé" = Kylian's father) and lost ~124 pageview
fetches to throttling.

Strategy:
  1. Batched exact-title lookup (50 titles/request, redirects followed) —
     a player's own name is almost always the canonical enwiki title.
  2. For names with no exact page: keep a pass-1 title only if it is not a
     "List of/Career of" artifact and shares the player's surname; otherwise
     re-search with a ranked pick that skips those artifacts.
  3. Refetch pageviews wherever the title changed or views are None.
stdlib only, resumable, ~0.35s pacing with 429 backoff.
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


def exact_titles(names):
    """Batched existence check. Returns {requested_name: canonical_title}."""
    out = {}
    for i in range(0, len(names), 50):
        chunk = names[i:i + 50]
        q = urllib.parse.quote("|".join(chunk))
        obj = get("https://en.wikipedia.org/w/api.php?action=query&redirects=1"
                  f"&titles={q}&prop=pageprops&ppprop=disambiguation&format=json")
        time.sleep(0.35)
        if not obj:
            continue
        query = obj.get("query", {})
        mapping = {}
        for frm in query.get("normalized", []) + query.get("redirects", []):
            mapping[frm["to"]] = mapping.get(frm["from"], frm["from"])
        for page in (query.get("pages") or {}).values():
            title = page.get("title")
            if page.get("missing") is not None or "missing" in page:
                continue
            if "pageprops" in page and "disambiguation" in page["pageprops"]:
                continue
            requested = mapping.get(title, title)
            out[requested] = title
        print(f"  exact-title batch {i//50+1}: {len(out)} resolved so far", flush=True)
    return out


def search_title(name):
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
        if fold(t) == fold(name) or fold(t).startswith(fold(name) + " ("):
            return t
    for h in hits:
        t = h["title"]
        if not BAD_TITLE.match(t) and surname and surname in fold(t):
            return t
    return hits[0]["title"] if hits else None


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
    names = [v["name"] for v in out.values()]
    print(f"exact-title lookup for {len(names)} names...", flush=True)
    exact = exact_titles(sorted(set(names)))
    print(f"exact titles found: {len(exact)}", flush=True)

    to_refetch = []
    for pid, v in out.items():
        name, old = v["name"], v.get("title")
        new = exact.get(name)
        if not new:
            keep_old = (old and not BAD_TITLE.match(old)
                        and fold(name).split()[-1] in fold(old))
            new = old if keep_old else search_title(name)
        if new and (new != old or v.get("pageviews_12mo") is None):
            v["title"] = new
            to_refetch.append(pid)
        elif not new:
            v["confidence"] = "unresolved"
    print(f"refetching pageviews for {len(to_refetch)} players...", flush=True)

    for n, pid in enumerate(to_refetch, 1):
        v = out[pid]
        views = pageviews(v["title"])
        if views is None:  # one retry for transient failures
            views = pageviews(v["title"])
        v["pageviews_12mo"] = views
        v["confidence"] = "resolved" if views is not None else "unresolved"
        if n % 50 == 0:
            json.dump(out, open(OUT, "w"), ensure_ascii=False, indent=0)
            print(f"  {n}/{len(to_refetch)}", flush=True)
    json.dump(out, open(OUT, "w"), ensure_ascii=False, indent=0)
    resolved = sum(1 for v in out.values() if v["pageviews_12mo"] is not None)
    print(f"DONE pass2: {resolved}/{len(out)} resolved")


if __name__ == "__main__":
    sys.stdout.reconfigure(line_buffering=True)
    main()
