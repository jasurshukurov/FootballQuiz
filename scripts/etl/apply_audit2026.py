#!/usr/bin/env python3
"""Apply the July-2026 audit-horde findings to the app data files.

Consumes the agent outputs written to the session scratchpad:
    audit_out/verify_NN.json  {patch, dob_fixes, transfers_found, checked_ok, unverified}
    audit_out/career_NN.json  {fixes, checked_ok, unverified}

What it does (in order):
  1. verify patch records -> merged data/research_patches/patch_90_audit2026.json
     (then run apply_player_patches.py to land them on players_db_v1.json with
     club-string resolution).
  2. dob_fixes -> data/player_ages.json (players_db id -> "YYYY-MM-DD 00:00:00").
  3. transfers_found -> data/transfers.json. transfers.json has its OWN id
     space, so players match by normalized name. A found move appends a stint
     {club_name, club_id, date_joined, fee} and closes the previous open stint
     (date_left). Skipped when the destination club already appears as the
     player's latest stint, or when the player has no transfers.json row.
  4. career fixes -> data/career_paths.json, replacing the career array of the
     row with the same id (career_paths ids are the agents' input ids, same
     file, safe). Refuses a fix whose career array is empty or loses more than
     half the stints (fabrication guard).

Idempotent: re-running yields the same result. --dry-run reports only.
stdlib only.
"""
import glob
import json
import os
import re
import sys
import unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.abspath(os.path.join(HERE, "..", "..", "data"))
SCRATCH = ("/private/tmp/claude-501/-Users-jasur-workspace-football/"
           "622f5dd0-aced-4c1e-af52-4c947b59a401/scratchpad")
AUDIT_OUT = os.path.join(SCRATCH, "audit_out")
DRY = "--dry-run" in sys.argv

# Deceased legends: deliberately kept OUT of player_ages.json so Who Are Ya
# renders its graceful "?" age column instead of an as-if-alive age
# (getPlayerAge -> null path, verified crash-safe July 2026).
DECEASED_SKIP = {
    1600002,  # Pelé (d. 2022)
    1600003,  # Diego Maradona (d. 2020)
    1600025,  # Franz Beckenbauer (d. 2024)
    1600029,  # Johan Cruyff (d. 2016)
    1600053,  # Alfredo Di Stéfano (d. 2014)
    1600065,  # Eusébio (d. 2014)
    1600070,  # Lev Yashin (d. 1990)
    1600077,  # George Best (d. 2005)
}


def load(path):
    with open(path) as f:
        return json.load(f)


def save(path, obj):
    if DRY:
        return
    with open(path, "w") as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)
        f.write("\n")


def norm_name(s):
    n = unicodedata.normalize("NFKD", s or "")
    n = "".join(c for c in n if not unicodedata.combining(c)).lower()
    return re.sub(r"[^a-z0-9 ]", "", n).strip()


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", norm_name(s)).strip("-")


def main():
    verify_files = sorted(glob.glob(os.path.join(AUDIT_OUT, "verify_*.json")))
    career_files = sorted(glob.glob(os.path.join(AUDIT_OUT, "career_*.json")))
    print(f"verify outputs: {len(verify_files)}  career outputs: {len(career_files)}")

    # ---- 1. merged players_db patch --------------------------------------
    db_mv = {p["id"]: p.get("market_value", 0)
             for p in load(os.path.join(DATA, "players_db_v1.json"))}
    patch, seen = [], set()
    dob_fixes, transfers_found = [], []
    bad_files = []
    for path in verify_files:
        try:
            obj = load(path)
        except Exception as e:  # noqa: BLE001
            bad_files.append((path, str(e)))
            continue
        for rec in obj.get("patch") or []:
            pid = rec.get("id")
            if not isinstance(pid, int) or pid in seen:
                continue
            if rec.get("status") not in ("active", "retired"):
                continue
            seen.add(pid)
            mv = rec.get("market_value_eur")
            if not isinstance(mv, int):
                # apply_player_patches.py requires an int; null meant
                # "leave unchanged", so echo the existing db value.
                mv = db_mv.get(pid, 0) or 0
            patch.append({
                "id": pid,
                "name": rec.get("name"),
                "status": rec["status"],
                "current_team": rec.get("current_team"),
                "league": rec.get("league"),
                "market_value_eur": mv,
                "retired_year": rec.get("retired_year"),
            })
        dob_fixes += obj.get("dob_fixes") or []
        transfers_found += obj.get("transfers_found") or []
    patch_path = os.path.join(DATA, "research_patches", "patch_90_audit2026.json")
    save(patch_path, patch)
    print(f"players_db patch records: {len(patch)} -> {patch_path}")

    # ---- 2. DOB fixes -----------------------------------------------------
    ages_path = os.path.join(DATA, "player_ages.json")
    ages = load(ages_path)
    dob_applied = dob_skipped = 0
    for fix in dob_fixes:
        pid, dob = fix.get("id"), fix.get("dob") or ""
        if (not isinstance(pid, int) or pid in DECEASED_SKIP
                or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", dob)):
            dob_skipped += 1
            continue
        ages[str(pid)] = f"{dob} 00:00:00"
        dob_applied += 1
    save(ages_path, ages)
    print(f"dob fixes applied: {dob_applied} (skipped {dob_skipped}) total ages: {len(ages)}")

    # ---- 3. transfers.json merge -----------------------------------------
    # Also fold in the standalone 2026-window research (60 sourced moves).
    research = os.path.join(AUDIT_OUT, "transfers_2026_research.json")
    if os.path.exists(research):
        transfers_found += load(research).get("transfers") or []
    tr_path = os.path.join(DATA, "transfers.json")
    transfers = load(tr_path)
    by_name = {norm_name(r["player_name"]): r for r in transfers}
    tr_applied = tr_skipped_nohit = tr_skipped_dup = 0
    for mv in transfers_found:
        row = by_name.get(norm_name(mv.get("name") or mv.get("player_name") or ""))
        if not row:
            tr_skipped_nohit += 1
            continue
        stints = row["transfers"]
        to_club = mv.get("to_club") or ""
        date = mv.get("date") or "2026-07-01"
        # idempotency: the destination already present as the latest stint OR
        # as any stint joined within ~a year of this move (multi-move players).
        if stints and (norm_name(stints[-1]["club_name"]) == norm_name(to_club)
                       or any(norm_name(s["club_name"]) == norm_name(to_club)
                              and abs((int((s.get("date_joined") or "1900")[:4]) - int(date[:4]))) <= 1
                              for s in stints)):
            tr_skipped_dup += 1
            continue
        if stints and not stints[-1].get("date_left"):
            stints[-1]["date_left"] = date
        fee = mv.get("fee_eur")
        stints.append({
            "club_name": to_club,
            "club_id": slug(to_club),
            "date_joined": date,
            "date_left": None,
            "fee": (f"€{fee/1_000_000:.1f}m" if isinstance(fee, (int, float)) and fee > 0
                    else ("Free" if fee == 0 else None)),
        })
        tr_applied += 1
    save(tr_path, transfers)
    print(f"transfers appended: {tr_applied} (no row: {tr_skipped_nohit}, already latest: {tr_skipped_dup})")

    # ---- 4. career fixes ---------------------------------------------------
    cp_path = os.path.join(DATA, "career_paths.json")
    careers = load(cp_path)
    by_id = {c.get("id"): c for c in careers if c.get("id") is not None}
    ca_applied = ca_refused = 0
    for path in career_files:
        try:
            obj = load(path)
        except Exception as e:  # noqa: BLE001
            bad_files.append((path, str(e)))
            continue
        for fix in obj.get("fixes") or []:
            row = by_id.get(fix.get("id"))
            new = fix.get("career") or []
            if (not row or not new
                    or len(new) < max(1, len(row.get("career") or []) // 2)
                    or any(not st.get("club") or not isinstance(st.get("from"), int)
                           for st in new)):
                ca_refused += 1
                continue
            row["career"] = [{"club": st["club"], "from": st["from"],
                              "to": st.get("to") if isinstance(st.get("to"), int) else st["from"]}
                             for st in new]
            ca_applied += 1
    save(cp_path, careers)
    print(f"career fixes applied: {ca_applied} (refused: {ca_refused})")

    for path, err in bad_files:
        print(f"WARN unreadable agent output {path}: {err}")
    print("DRY RUN — nothing written" if DRY else "done")


if __name__ == "__main__":
    main()
