#!/usr/bin/env python3
"""Merge researched player patches into data/players_db_v1.json.

Reads every data/research_patches/patch_*.json (filled-in versions of the
batch schema), validates each record, backs up the db, then merges onto the
players_db row matched by id.

Field handling:
  * status, market_value, retired_year  -> always applied (core fields).
  * current_team -> researchers give a COMMON name ("Inter Miami", "Real
    Madrid"); it is resolved to the EXACT current_team string the app/Grid
    indexes on (common.build_club_resolver). If it can't be resolved to an
    existing club string, current_team is left unchanged and the row is written
    to data/research_patches/unresolved_clubs.json for manual review, while the
    other fields still apply.
  * league -> only overwritten when the researcher supplies an EXISTING
    players_db league string. "Retired"/new strings are ignored so Grid/Guess
    comparisons never break; a retired player keeps their last league, and the
    new status/retired_year fields carry the retirement info.

Idempotent: re-running with the same patches yields the same db.

Usage:
    python3 apply_player_patches.py            # validate, back up, apply
    python3 apply_player_patches.py --dry-run  # validate + report only

stdlib only.
"""
import datetime
import glob
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common  # noqa: E402

MV_MIN = 0
MV_MAX = 300_000_000
VALID_STATUS = {"active", "retired"}
PATCH_GLOB = os.path.join(common.DATA_DIR, "research_patches", "patch_*.json")


def known_leagues(players):
    """Existing league strings in players_db. Deliberately does NOT include
    'Retired' or any new value: league must stay a string Grid/Guess already
    compare on."""
    return {(p.get("league") or "").strip()
            for p in players if (p.get("league") or "").strip()}


def load_patch_records(path):
    """A patch file may be a list, {'players': [...]}, or a single record."""
    obj = common.load_json(path)
    if isinstance(obj, list):
        return obj
    if isinstance(obj, dict):
        if isinstance(obj.get("players"), list):
            return obj["players"]
        if "id" in obj:
            return [obj]
    raise ValueError("unrecognised patch structure in %s" % path)


def validate_core(rec, ids):
    """Validate the fields a record MUST get right to be applied at all.
    current_team / league are handled softly at apply time, not here."""
    if not isinstance(rec, dict):
        return False, "record is not an object"
    pid = rec.get("id")
    if not isinstance(pid, int) or isinstance(pid, bool):
        return False, "id missing or not an int"
    if pid not in ids:
        return False, "id %s not in players_db" % pid
    status = rec.get("status")
    if status not in VALID_STATUS:
        return False, "status %r not in %s" % (status, sorted(VALID_STATUS))
    mv = rec.get("market_value_eur")
    if not isinstance(mv, int) or isinstance(mv, bool):
        return False, "market_value_eur missing or not an int"
    if not (MV_MIN <= mv <= MV_MAX):
        return False, "market_value_eur %d out of range [%d,%d]" % (mv, MV_MIN, MV_MAX)
    if status == "active" and not (rec.get("current_team") or "").strip():
        return False, "active player missing current_team"
    ry = rec.get("retired_year", None)
    if status == "retired" and ry is not None:
        if not (isinstance(ry, int) and not isinstance(ry, bool)
                and 1900 <= ry <= common.REFERENCE_YEAR):
            return False, "retired_year %r implausible" % ry
    return True, ""


def apply_record(player, rec, resolve_club, leagues):
    """Mutate a players_db row from a core-validated patch record.

    Returns a dict describing what happened to the soft fields:
      {"club": "set"|"unchanged"|"unresolved", "requested_team", "resolved_team",
       "league": "set"|"unchanged"}
    """
    outcome = {}

    # Core fields — always applied.
    player["market_value"] = rec["market_value_eur"]
    player["status"] = rec["status"]
    player["retired_year"] = rec.get("retired_year") if rec["status"] == "retired" else None

    # current_team — resolve the common name to an existing club string.
    requested = (rec.get("current_team") or "").strip()
    if requested:
        resolved, method = resolve_club(requested)
        if resolved:
            player["current_team"] = resolved
            outcome["club"] = "set"
            outcome["method"] = method
            outcome["resolved_team"] = resolved
        else:
            outcome["club"] = "unresolved"
        outcome["requested_team"] = requested
    else:
        outcome["club"] = "unchanged"

    # league — only overwrite with an existing league string; never "Retired".
    league = (rec.get("league") or "").strip()
    if league and league in leagues:
        player["league"] = league
        outcome["league"] = "set"
    else:
        outcome["league"] = "unchanged"

    return outcome


def main():
    dry_run = "--dry-run" in sys.argv[1:]

    players = common.load_json(common.PLAYERS_DB)
    by_id = {p["id"]: p for p in players}
    ids = set(by_id)
    leagues = known_leagues(players)
    resolve_club = common.build_club_resolver(players)

    patch_files = sorted(glob.glob(PATCH_GLOB))
    if not patch_files:
        print("no patch files found at %s" % PATCH_GLOB)
        print("(researchers write filled patch_NN.json there; nothing to do)")
        return

    applied = []
    skipped = []          # (id_or_name, reason)
    unresolved_clubs = []  # rows whose current_team couldn't be resolved
    club_set = 0
    league_set = 0
    league_kept = 0

    for pf in patch_files:
        try:
            records = load_patch_records(pf)
        except ValueError as e:
            skipped.append((os.path.basename(pf), str(e)))
            continue
        for rec in records:
            ok, reason = validate_core(rec, ids)
            label = rec.get("id", rec.get("name", "?")) if isinstance(rec, dict) else "?"
            if not ok:
                skipped.append((label, reason))
                continue
            pid = rec["id"]
            outcome = apply_record(by_id[pid], rec, resolve_club, leagues)
            applied.append(pid)
            if outcome.get("club") == "set":
                club_set += 1
            elif outcome.get("club") == "unresolved":
                unresolved_clubs.append({
                    "id": pid,
                    "name": rec.get("name") or by_id[pid].get("name"),
                    "requested_current_team": outcome.get("requested_team"),
                    "kept_current_team": by_id[pid].get("current_team"),
                    "source": os.path.basename(pf),
                })
            if outcome.get("league") == "set":
                league_set += 1
            else:
                league_kept += 1

    # Write unresolved-clubs review file (also when dry-run, so researchers can
    # see what would fail before committing to a real apply).
    unresolved_path = os.path.join(
        common.DATA_DIR, "research_patches", "unresolved_clubs.json")
    if unresolved_clubs:
        common.dump_json(unresolved_path, {
            "note": ("current_team values that could not be resolved to an "
                     "existing players_db club string; other fields were still "
                     "applied. Fix the club name or add it to club_id_map.json."),
            "count": len(unresolved_clubs),
            "rows": unresolved_clubs,
        })
    elif os.path.exists(unresolved_path):
        os.remove(unresolved_path)  # keep idempotent: no stale review file

    # Back up + write (only when actually applying).
    backup_path = None
    if not dry_run and applied:
        stamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = os.path.join(
            common.DATA_DIR, "players_db_v1_backup_%s.json" % stamp)
        # Back up the ORIGINAL db contents, not the mutated in-memory copy.
        original = common.load_json(common.PLAYERS_DB)
        common.dump_json(backup_path, original)
        common.dump_json(common.PLAYERS_DB, players)

    # Report.
    print("=" * 60)
    print("APPLY PLAYER PATCHES%s" % ("  [DRY RUN]" if dry_run else ""))
    print("=" * 60)
    print("patch files ............. %d" % len(patch_files))
    print("records applied ......... %d (%d distinct ids)"
          % (len(applied), len(set(applied))))
    print("  current_team set ...... %d" % club_set)
    print("  current_team unresolved %d (-> unresolved_clubs.json)"
          % len(unresolved_clubs))
    print("  league updated ........ %d" % league_set)
    print("  league kept as-is ..... %d" % league_kept)
    print("records skipped ......... %d" % len(skipped))
    if backup_path:
        print("backup .................. %s" % backup_path)
    elif dry_run:
        print("backup .................. (skipped, dry run)")
    if skipped:
        print("-" * 60)
        print("SKIPPED (first 40):")
        for label, reason in skipped[:40]:
            print("  %-24s %s" % (label, reason))
    print("=" * 60)


if __name__ == "__main__":
    main()
