"""
QA validation script for the merged player database.
Compares v2 against v1 to ensure data integrity.
"""

import json
import sys
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
V1_FILE = DATA_DIR / "players_db_v1.json"
V2_FILE = DATA_DIR / "players_db_v2.json"
REPORT_FILE = DATA_DIR / "merge_report.json"
VALIDATION_REPORT_FILE = DATA_DIR / "validation_report.json"

IMMUTABLE_FIELDS = ["name", "normalized_name", "nationality", "position"]
REQUIRED_FIELDS = ["name", "normalized_name", "nationality", "position"]

SAMPLE_PLAYERS = [
    "Lionel Messi", "Cristiano Ronaldo", "Kylian Mbappe", "Erling Haaland",
    "Mohamed Salah", "Kevin De Bruyne", "Vinicius Junior", "Jude Bellingham",
    "Bukayo Saka", "Rodri", "Robert Lewandowski", "Lamine Yamal",
    "Harry Kane", "Declan Rice", "Martin Odegaard", "Bruno Fernandes",
    "Cole Palmer", "Florian Wirtz", "Victor Osimhen", "Antoine Griezmann",
]


def load_json(path: Path) -> list[dict]:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def check_no_data_loss(v1: list[dict], v2: list[dict]) -> dict:
    passed = len(v2) >= len(v1)
    return {
        "name": "no_data_loss",
        "status": "PASS" if passed else "FAIL",
        "details": f"v1={len(v1):,}, v2={len(v2):,}, diff={len(v2) - len(v1):+,}",
    }


def check_id_uniqueness(v2: list[dict]) -> dict:
    ids = [p.get("id") for p in v2]
    unique = len(set(ids))
    duplicates = len(ids) - unique
    passed = duplicates == 0
    return {
        "name": "id_uniqueness",
        "status": "PASS" if passed else "FAIL",
        "details": f"total={len(ids):,}, unique={unique:,}, duplicates={duplicates}",
    }


def check_required_fields(v2: list[dict]) -> dict:
    violations = []
    for p in v2:
        missing = [f for f in REQUIRED_FIELDS if not p.get(f)]
        if missing:
            violations.append({"id": p.get("id"), "name": p.get("name"), "missing": missing})
    passed = len(violations) == 0
    return {
        "name": "required_fields",
        "status": "PASS" if passed else "FAIL",
        "details": f"{len(violations)} players with missing required fields",
        "violations": violations[:50],  # cap for report size
    }


def check_biographical_integrity(v1: list[dict], v2: list[dict]) -> dict:
    v1_by_id = {p["id"]: p for p in v1}
    violations = []
    for p2 in v2:
        pid = p2.get("id")
        p1 = v1_by_id.get(pid)
        if p1 is None:
            continue
        changed = {}
        for field in IMMUTABLE_FIELDS:
            old = p1.get(field)
            new = p2.get(field)
            if old != new:
                changed[field] = {"old": old, "new": new}
        if changed:
            violations.append({"id": pid, "name": p1.get("name"), "changes": changed})
    passed = len(violations) == 0
    return {
        "name": "biographical_integrity",
        "status": "PASS" if passed else "FAIL",
        "details": f"{len(violations)} players with immutable field changes",
        "violations": violations[:50],
    }


def check_market_value_sanity(v1: list[dict], v2: list[dict]) -> dict:
    v1_by_id = {p["id"]: p for p in v1}
    flagged = []
    for p2 in v2:
        pid = p2.get("id")
        p1 = v1_by_id.get(pid)
        if p1 is None:
            continue
        old_val = p1.get("market_value") or 0
        new_val = p2.get("market_value") or 0
        if old_val > 0 and new_val == 0:
            flagged.append({"id": pid, "name": p1.get("name"), "old_value": old_val})
    return {
        "name": "market_value_sanity",
        "status": "PASS" if len(flagged) == 0 else "WARN",
        "details": f"{len(flagged)} players went from >0 to 0 market_value",
        "flagged": flagged[:50],
    }


def check_club_sanity(v2: list[dict]) -> dict:
    flagged = []
    for p in v2:
        team = p.get("current_team") or ""
        if not team or team == "Unknown":
            flagged.append({"id": p.get("id"), "name": p.get("name"), "current_team": team})
    return {
        "name": "club_sanity",
        "status": "PASS" if len(flagged) == 0 else "WARN",
        "details": f"{len(flagged)} players with empty/unknown club",
        "flagged": flagged[:50],
    }


def sample_comparison(v1: list[dict], v2: list[dict]) -> list[dict]:
    v1_by_name = {}
    for p in v1:
        v1_by_name[p.get("name", "")] = p
    v2_by_name = {}
    for p in v2:
        v2_by_name[p.get("name", "")] = p

    comparisons = []
    for name in SAMPLE_PLAYERS:
        comparisons.append({
            "name": name,
            "v1": v1_by_name.get(name),
            "v2": v2_by_name.get(name),
        })
    return comparisons


def main() -> None:
    print("=== QA Validation ===\n")

    if not V1_FILE.exists():
        print("ERROR: v1 database not found.", file=sys.stderr)
        sys.exit(1)
    if not V2_FILE.exists():
        print("ERROR: v2 database not found.", file=sys.stderr)
        sys.exit(1)

    v1 = load_json(V1_FILE)
    v2 = load_json(V2_FILE)
    print(f"Loaded v1: {len(v1):,} players")
    print(f"Loaded v2: {len(v2):,} players\n")

    checks = [
        check_no_data_loss(v1, v2),
        check_id_uniqueness(v2),
        check_required_fields(v2),
        check_biographical_integrity(v1, v2),
        check_market_value_sanity(v1, v2),
        check_club_sanity(v2),
    ]

    critical_fail = False
    for c in checks:
        status = c["status"]
        print(f"  [{status}] {c['name']}: {c['details']}")
        if status == "FAIL":
            critical_fail = True

    # Sample comparisons
    samples = sample_comparison(v1, v2)
    print(f"\n--- Sample Player Comparisons ({len(samples)}) ---")
    for s in samples:
        name = s["name"]
        found_v1 = "yes" if s["v1"] else "no"
        found_v2 = "yes" if s["v2"] else "no"
        team_v2 = s["v2"]["current_team"] if s["v2"] else "N/A"
        print(f"  {name}: v1={found_v1}, v2={found_v2}, team={team_v2}")

    # Flagged players for manual review
    flagged_players = []
    for c in checks:
        flagged_players.extend(c.get("violations", []))
        flagged_players.extend(c.get("flagged", []))

    # Write report
    validation_report = {
        "passed": not critical_fail,
        "checks": checks,
        "flagged_players": flagged_players[:200],
        "sample_comparisons": samples,
    }

    with open(VALIDATION_REPORT_FILE, "w", encoding="utf-8") as f:
        json.dump(validation_report, f, ensure_ascii=False, indent=2)

    print(f"\nValidation report: {VALIDATION_REPORT_FILE}")
    if critical_fail:
        print("\nRESULT: FAIL — critical checks failed.")
        sys.exit(1)
    else:
        print("\nRESULT: PASS — all critical checks passed.")
        sys.exit(0)


if __name__ == "__main__":
    main()
