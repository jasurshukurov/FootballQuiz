#!/usr/bin/env python3
"""
Generate deterministic daily puzzle payloads for 8 football trivia game modes.
Uses only Python stdlib. Reads from data/master_db.json and data/teamColors.ts.
Outputs to data/daily_puzzles/YYYY-MM-DD.json.
"""

import argparse
import json
import os
import random
import re
import sys
from datetime import datetime, timedelta

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
MASTER_DB_PATH = os.path.join(BASE_DIR, "data", "master_db.json")
TEAM_COLORS_PATH = os.path.join(BASE_DIR, "data", "teamColors.ts")
OUTPUT_DIR = os.path.join(BASE_DIR, "data", "daily_puzzles")

# ---------------------------------------------------------------------------
# Seed helpers (match JS bit-shifting hash from lib/dailySeed.ts)
# ---------------------------------------------------------------------------

def js_hash(s: str) -> int:
    """Replicate the JS hash: hash = (hash << 5) - hash + charCode; hash &= hash."""
    h = 0
    for ch in s:
        h = ((h << 5) - h + ord(ch)) & 0xFFFFFFFF
        # convert to signed 32-bit
        if h >= 0x80000000:
            h -= 0x100000000
    return abs(h)


def get_daily_seed(date_str: str) -> int:
    return js_hash(date_str)


def get_mode_seed(mode: str, date_str: str) -> int:
    base = get_daily_seed(date_str)
    mode_hash = js_hash(mode)
    return abs(base ^ mode_hash)


def seeded_rng(seed: int) -> random.Random:
    return random.Random(seed)


# ---------------------------------------------------------------------------
# Data loading
# ---------------------------------------------------------------------------

def load_master_db():
    with open(MASTER_DB_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def load_team_names() -> list:
    """Parse teamColors.ts to extract team names."""
    with open(TEAM_COLORS_PATH, "r", encoding="utf-8") as f:
        content = f.read()
    # Match both quoted and unquoted keys
    names = re.findall(r"""(?:['"]([^'"]+)['"]|(\w[\w ]*?))\s*:\s*\{""", content)
    seen = set()
    result = []
    for quoted, unquoted in names:
        name = quoted or unquoted
        if name and name not in seen:
            seen.add(name)
            result.append(name)
    return result


# ---------------------------------------------------------------------------
# Tier mapping for difficulty
# ---------------------------------------------------------------------------

EASY_TIERS = {"beginner", "amateur"}
MEDIUM_TIERS = {"semi_pro", "professional"}
HARD_TIERS = {"world_class", "legendary"}

DIFFICULTY_TIERS = {
    "easy": EASY_TIERS,
    "medium": MEDIUM_TIERS,
    "hard": HARD_TIERS,
}


def players_by_difficulty(players, difficulty):
    tiers = DIFFICULTY_TIERS[difficulty]
    return [p for p in players if p.get("career_tier", "") in tiers]


# ---------------------------------------------------------------------------
# Balancing tracker
# ---------------------------------------------------------------------------

class BalanceTracker:
    def __init__(self):
        self.player_modes = {}  # global_id -> set of modes
        self.club_modes = {}    # club_name -> set of modes

    def can_use_player(self, pid, mode):
        modes = self.player_modes.get(pid, set())
        if mode in modes:
            return True  # already counted
        return len(modes) < 2

    def can_use_club(self, club, mode):
        modes = self.club_modes.get(club, set())
        if mode in modes:
            return True
        return len(modes) < 4

    def register_player(self, pid, mode, club=None):
        self.player_modes.setdefault(pid, set()).add(mode)
        if club:
            self.club_modes.setdefault(club, set()).add(mode)

    def filter_available(self, players, mode):
        return [p for p in players if self.can_use_player(p["global_id"], mode)
                and self.can_use_club(p.get("current_team", ""), mode)]


# ---------------------------------------------------------------------------
# Mode generators
# ---------------------------------------------------------------------------

def gen_who_are_ya(players, rng, tracker, difficulty):
    pool = players_by_difficulty(players, difficulty)
    pool = tracker.filter_available(pool, "who_are_ya")
    if not pool:
        pool = players_by_difficulty(players, "hard")
    rng.shuffle(pool)
    target = pool[0]
    tracker.register_player(target["global_id"], "who_are_ya", target.get("current_team"))
    return {
        "target": {
            "id": target["global_id"],
            "name": target["name"],
            "nat": target["nationality"],
            "team": target.get("current_team", ""),
            "league": target.get("league", ""),
            "pos": target["position"],
            "mv": target.get("market_value", 0),
        }
    }


def gen_grid(players, rng, tracker):
    """Generate a valid 3x3 grid with row=teams, col=attributes.

    Strategy: pre-index players by team, then only consider attributes that
    are common enough across large teams to yield 5+ answers per cell.
    """
    # Index players by team
    team_players = {}
    for p in players:
        t = p.get("current_team", "")
        if t:
            team_players.setdefault(t, []).append(p)

    # Only consider teams with 20+ players (ensures attribute diversity)
    big_teams = sorted(
        [t for t, ps in team_players.items() if len(ps) >= 20],
        key=lambda t: -len(team_players[t]),
    )
    if len(big_teams) < 3:
        big_teams = sorted(team_players.keys(), key=lambda t: -len(team_players[t]))[:20]
    rng.shuffle(big_teams)

    # For columns, use only positions (guaranteed spread across big teams)
    # and the most common nationalities per-team
    positions = ["Forward", "Midfielder", "Defender", "Goalkeeper"]

    def cell_count(team, attr_type, attr_val):
        return sum(
            1 for p in team_players.get(team, [])
            if (attr_type == "position" and p["position"] == attr_val)
            or (attr_type == "nationality" and p.get("nationality") == attr_val)
        )

    def cell_ids(team, attr_type, attr_val):
        return [
            p["global_id"] for p in team_players.get(team, [])
            if (attr_type == "position" and p["position"] == attr_val)
            or (attr_type == "nationality" and p.get("nationality") == attr_val)
        ]

    # Build candidate attributes: positions + top nationalities across all big teams
    nat_counts = {}
    for t in big_teams[:15]:
        for p in team_players[t]:
            nat = p.get("nationality", "")
            if nat:
                nat_counts[nat] = nat_counts.get(nat, 0) + 1
    top_nats = sorted(nat_counts, key=lambda n: -nat_counts[n])[:20]

    attr_candidates = (
        [("position", pos) for pos in positions]
        + [("nationality", nat) for nat in top_nats]
    )
    rng.shuffle(attr_candidates)

    # Try combinations of 3 teams x 3 attributes
    from itertools import combinations
    team_combos = list(combinations(big_teams[:12], 3))
    rng.shuffle(team_combos)

    for rows in team_combos[:50]:
        attr_combos = list(combinations(attr_candidates, 3))
        rng.shuffle(attr_combos)
        for cols in attr_combos[:60]:
            # Check all 9 cells have 5+ answers
            valid_answers = {}
            ok = True
            for ri, row_team in enumerate(rows):
                for ci, (attr_type, attr_val) in enumerate(cols):
                    ids = cell_ids(row_team, attr_type, attr_val)
                    if len(ids) < 5:
                        ok = False
                        break
                    valid_answers[f"r{ri}c{ci}"] = ids
                if not ok:
                    break
            if ok:
                for ids in valid_answers.values():
                    for pid in ids[:2]:
                        tracker.register_player(pid, "grid")
                return {
                    "rows": list(rows),
                    "cols": [{"type": c[0], "value": c[1]} for c in cols],
                    "valid_answers": valid_answers,
                }

    # Fallback: use top 3 teams and positions only (very likely to work)
    rows = big_teams[:3]
    cols = [("position", p) for p in ["Forward", "Midfielder", "Defender"]]
    valid_answers = {}
    for ri, row_team in enumerate(rows):
        for ci, (attr_type, attr_val) in enumerate(cols):
            valid_answers[f"r{ri}c{ci}"] = cell_ids(row_team, attr_type, attr_val)
    return {
        "rows": rows,
        "cols": [{"type": c[0], "value": c[1]} for c in cols],
        "valid_answers": valid_answers,
    }


def gen_career_path(players, rng, tracker, difficulty):
    pool = players_by_difficulty(players, difficulty)
    pool = [p for p in pool if p.get("career") and len(p["career"]) >= 2]
    pool = tracker.filter_available(pool, "career_path")
    if not pool:
        pool = [p for p in players if p.get("career") and len(p["career"]) >= 2]
    rng.shuffle(pool)
    target = pool[0]
    tracker.register_player(target["global_id"], "career_path", target.get("current_team"))
    return {
        "player": {
            "id": target["global_id"],
            "name": target["name"],
            "nat": target["nationality"],
            "pos": target["position"],
            "career": [{"club": c["club"], "from": c["from"], "to": c["to"]}
                       for c in target["career"]],
        }
    }


def gen_missing11(matches, rng, tracker):
    rng.shuffle(matches)
    for match in matches:
        side = rng.choice(["a", "b"])
        lineup_key = f"lineup_{side}"
        lineup = match.get(lineup_key, [])
        if len(lineup) >= 11:
            for p in lineup:
                if p.get("global_id"):
                    tracker.register_player(p["global_id"], "missing11")
            return {
                "match_id": match["match_id"],
                "comp": match["competition"],
                "season": match["season"],
                "team_a": match["team_a"]["name"],
                "team_b": match["team_b"]["name"],
                "score": match["score"],
                "side": side,
                "lineup": [p["name"] for p in lineup],
            }
    # Fallback: use first match
    m = matches[0]
    return {
        "match_id": m["match_id"],
        "comp": m["competition"],
        "season": m["season"],
        "team_a": m["team_a"]["name"],
        "team_b": m["team_b"]["name"],
        "score": m["score"],
        "side": "a",
        "lineup": [p["name"] for p in m.get("lineup_a", [])],
    }


def gen_connections(players, rng, tracker, difficulty):
    """4 categories of 4 players, no overlap, different attribute types."""
    pool = players_by_difficulty(players, difficulty)
    pool = tracker.filter_available(pool, "connections")
    if len(pool) < 16:
        pool = tracker.filter_available(players, "connections")

    # Build candidate categories by attribute type
    by_nat = {}
    by_team = {}
    by_pos = {}
    by_league = {}
    for p in pool:
        by_nat.setdefault(p.get("nationality", ""), []).append(p)
        by_team.setdefault(p.get("current_team", ""), []).append(p)
        by_pos.setdefault(p.get("position", ""), []).append(p)
        by_league.setdefault(p.get("league", ""), []).append(p)

    def pick_category(groups, attr_type, label_fmt, used_ids):
        candidates = [(k, v) for k, v in groups.items() if k and len(v) >= 4]
        rng.shuffle(candidates)
        for key, group in candidates:
            available = [p for p in group if p["global_id"] not in used_ids]
            if len(available) >= 4:
                chosen = rng.sample(available, 4)
                return {
                    "label": label_fmt(key),
                    "type": attr_type,
                    "players": [{"id": p["global_id"], "name": p["name"]} for p in chosen],
                }, {p["global_id"] for p in chosen}
        return None, set()

    categories = []
    used_ids = set()

    attempts = [
        (by_nat, "nationality", lambda k: f"{k} players"),
        (by_team, "team", lambda k: f"{k} players"),
        (by_pos, "position", lambda k: f"{k}s"),
        (by_league, "league", lambda k: f"{k} players"),
    ]
    rng.shuffle(attempts)

    for groups, attr_type, label_fmt in attempts:
        if len(categories) >= 4:
            break
        cat, ids = pick_category(groups, attr_type, label_fmt, used_ids)
        if cat:
            categories.append(cat)
            used_ids |= ids

    # If we couldn't get 4 distinct types, fill remaining with any type
    all_attempts = [
        (by_nat, "nationality", lambda k: f"{k} players"),
        (by_team, "team", lambda k: f"{k} players"),
        (by_pos, "position", lambda k: f"{k}s"),
        (by_league, "league", lambda k: f"{k} players"),
    ]
    for groups, attr_type, label_fmt in all_attempts:
        if len(categories) >= 4:
            break
        # Try multiple keys from this group
        candidates = [(k, v) for k, v in groups.items() if k and len(v) >= 4]
        rng.shuffle(candidates)
        for key, group in candidates:
            if len(categories) >= 4:
                break
            available = [p for p in group if p["global_id"] not in used_ids]
            if len(available) >= 4:
                chosen = rng.sample(available, 4)
                categories.append({
                    "label": label_fmt(key),
                    "type": attr_type,
                    "players": [{"id": p["global_id"], "name": p["name"]} for p in chosen],
                })
                used_ids |= {p["global_id"] for p in chosen}

    for pid in used_ids:
        tracker.register_player(pid, "connections")

    all_tiles = [p["name"] for cat in categories for p in cat["players"]]
    rng.shuffle(all_tiles)
    return {"categories": categories, "all_tiles": all_tiles}


def gen_badge(team_names, rng, tracker):
    """5 rounds, each: 1 correct team + 3 decoys."""
    rng.shuffle(team_names)
    rounds = []
    used = set()
    for i in range(5):
        remaining = [t for t in team_names if t not in used]
        if len(remaining) < 4:
            remaining = list(team_names)
        answer = remaining[0]
        decoys = rng.sample([t for t in remaining[1:] if t != answer], min(3, len(remaining) - 1))
        options = [answer] + decoys
        rng.shuffle(options)
        rounds.append({"answer": answer, "options": options})
        used.add(answer)
        for t in decoys:
            tracker.club_modes.setdefault(t, set()).add("badge")
        tracker.club_modes.setdefault(answer, set()).add("badge")
    return {"rounds": rounds}


def gen_higherlower(players, rng, tracker, difficulty):
    pool = players_by_difficulty(players, difficulty)
    pool = [p for p in pool if p.get("market_value", 0) and p["market_value"] > 0]
    pool = tracker.filter_available(pool, "higherlower")
    if len(pool) < 30:
        pool = [p for p in players if p.get("market_value", 0) > 0]
    rng.shuffle(pool)
    queue = pool[:30]
    for p in queue:
        tracker.register_player(p["global_id"], "higherlower", p.get("current_team"))
    return {
        "queue": [{
            "id": p["global_id"],
            "name": p["name"],
            "team": p.get("current_team", ""),
            "nat": p.get("nationality", ""),
            "mv": p.get("market_value", 0),
        } for p in queue]
    }


def parse_fee(fee_str):
    """Parse fee string like '€8.5m' to numeric value."""
    if not fee_str or fee_str in ("Free", "free", "free transfer", "Free transfer", "-", "?"):
        return 0
    s = fee_str.replace("€", "").replace("$", "").replace("£", "").strip()
    multiplier = 1
    if s.endswith("m"):
        multiplier = 1_000_000
        s = s[:-1]
    elif s.endswith("k"):
        multiplier = 1_000
        s = s[:-1]
    elif s.endswith("bn"):
        multiplier = 1_000_000_000
        s = s[:-2]
    try:
        return float(s) * multiplier
    except ValueError:
        return 0


def gen_agent(players, rng, tracker, difficulty):
    """10 rounds. Each: 1 correct player with notable transfer fee + 2 decoys."""
    pool = players_by_difficulty(players, difficulty)
    # Find players with notable transfers
    candidates = []
    for p in pool:
        for t in p.get("transfers", []):
            fee = parse_fee(t.get("fee"))
            if fee > 0:
                candidates.append((p, t, fee))

    candidates = [(p, t, f) for p, t, f in candidates
                   if tracker.can_use_player(p["global_id"], "agent")]
    rng.shuffle(candidates)

    if len(candidates) < 10:
        # Expand to all players
        for p in players:
            for t in p.get("transfers", []):
                fee = parse_fee(t.get("fee"))
                if fee > 0 and tracker.can_use_player(p["global_id"], "agent"):
                    candidates.append((p, t, fee))
        rng.shuffle(candidates)

    # Deduplicate by player
    seen_ids = set()
    unique = []
    for p, t, f in candidates:
        if p["global_id"] not in seen_ids:
            seen_ids.add(p["global_id"])
            unique.append((p, t, f))
    candidates = unique

    # Decoy pool
    decoy_pool = tracker.filter_available(players, "agent")
    rng.shuffle(decoy_pool)

    rounds = []
    decoy_idx = 0
    for i in range(min(10, len(candidates))):
        p, transfer, fee = candidates[i]
        tracker.register_player(p["global_id"], "agent", p.get("current_team"))

        # Find from/to from transfer
        from_club = ""
        to_club = transfer.get("club_name", "")
        # Try to find previous club from career
        for ci, c in enumerate(p.get("career", [])):
            if c.get("club") == to_club and ci > 0:
                from_club = p["career"][ci - 1]["club"]
                break

        # Pick 2 decoys
        decoys = []
        while len(decoys) < 2 and decoy_idx < len(decoy_pool):
            d = decoy_pool[decoy_idx]
            decoy_idx += 1
            if d["global_id"] != p["global_id"]:
                decoys.append({"id": d["global_id"], "name": d["name"]})
        rounds.append({
            "fee": transfer.get("fee", ""),
            "correct": {
                "id": p["global_id"],
                "name": p["name"],
                "from": from_club,
                "to": to_club,
            },
            "decoys": decoys,
        })
    return {"rounds": rounds}


# ---------------------------------------------------------------------------
# Main generation
# ---------------------------------------------------------------------------

def generate_for_date(date_str: str):
    db = load_master_db()
    players = db["players"]
    matches = db["matches"]
    team_names = load_team_names()
    tracker = BalanceTracker()

    difficulties = ["easy", "medium", "hard"]
    result = {"date": date_str, "seed": get_daily_seed(date_str)}

    # 1. who_are_ya (3 difficulties)
    result["who_are_ya"] = {}
    for diff in difficulties:
        rng = seeded_rng(get_mode_seed(f"who_are_ya_{diff}", date_str))
        result["who_are_ya"][diff] = gen_who_are_ya(players, rng, tracker, diff)

    # 2. grid
    rng = seeded_rng(get_mode_seed("grid", date_str))
    result["grid"] = gen_grid(players, rng, tracker)

    # 3. career_path (3 difficulties)
    result["career_path"] = {}
    for diff in difficulties:
        rng = seeded_rng(get_mode_seed(f"career_path_{diff}", date_str))
        result["career_path"][diff] = gen_career_path(players, rng, tracker, diff)

    # 4. missing11
    rng = seeded_rng(get_mode_seed("missing11", date_str))
    result["missing11"] = gen_missing11(list(matches), rng, tracker)

    # 5. connections (3 difficulties)
    result["connections"] = {}
    for diff in difficulties:
        rng = seeded_rng(get_mode_seed(f"connections_{diff}", date_str))
        result["connections"][diff] = gen_connections(players, rng, tracker, diff)

    # 6. badge
    rng = seeded_rng(get_mode_seed("badge", date_str))
    result["badge"] = gen_badge(list(team_names), rng, tracker)

    # 7. higherlower (3 difficulties)
    result["higherlower"] = {}
    for diff in difficulties:
        rng = seeded_rng(get_mode_seed(f"higherlower_{diff}", date_str))
        result["higherlower"][diff] = gen_higherlower(players, rng, tracker, diff)

    # 8. agent (3 difficulties)
    result["agent"] = {}
    for diff in difficulties:
        rng = seeded_rng(get_mode_seed(f"agent_{diff}", date_str))
        result["agent"][diff] = gen_agent(players, rng, tracker, diff)

    return result


def main():
    parser = argparse.ArgumentParser(description="Generate daily puzzle payloads")
    parser.add_argument("--date", default=None, help="Start date YYYY-MM-DD (default: today)")
    parser.add_argument("--days", type=int, default=1, help="Number of consecutive days to generate")
    args = parser.parse_args()

    if args.date:
        start = datetime.strptime(args.date, "%Y-%m-%d")
    else:
        start = datetime.now()

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    for i in range(args.days):
        dt = start + timedelta(days=i)
        date_str = dt.strftime("%Y-%m-%d")
        print(f"Generating puzzle for {date_str}...")
        puzzle = generate_for_date(date_str)
        out_path = os.path.join(OUTPUT_DIR, f"{date_str}.json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(puzzle, f, ensure_ascii=False, indent=2)
        print(f"  -> {out_path}")

    print("Done.")


if __name__ == "__main__":
    main()
