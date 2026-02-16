"""
Verification script for transfers.json.

Checks:
- No duplicate player_ids
- Each player has at least 2 transfers
- Dates are valid YYYY-MM-DD format
- Transfers are in chronological order
- Prints summary stats
"""

import json
import sys
from datetime import datetime
from pathlib import Path

DATA_FILE = Path(__file__).resolve().parent.parent.parent / "data" / "transfers.json"


def main() -> None:
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        records = json.load(f)

    errors: list[str] = []
    warnings: list[str] = []
    seen_ids: set[int] = set()
    total_transfers = 0
    min_transfers = float("inf")
    max_transfers = 0
    clubs: set[str] = set()

    for entry in records:
        pid = entry["player_id"]
        name = entry["player_name"]
        transfers = entry["transfers"]

        # Check duplicate IDs
        if pid in seen_ids:
            errors.append(f"Duplicate player_id: {pid} ({name})")
        seen_ids.add(pid)

        # Check minimum transfers
        if len(transfers) < 2:
            warnings.append(
                f"{name} (id={pid}) has only {len(transfers)} transfer(s)"
            )

        total_transfers += len(transfers)
        min_transfers = min(min_transfers, len(transfers))
        max_transfers = max(max_transfers, len(transfers))

        # Check dates
        prev_date = None
        for i, t in enumerate(transfers):
            clubs.add(t["club_name"])

            # Validate date_joined
            try:
                joined = datetime.strptime(t["date_joined"], "%Y-%m-%d")
            except (ValueError, TypeError):
                errors.append(
                    f"{name}: invalid date_joined '{t['date_joined']}' "
                    f"at transfer {i}"
                )
                continue

            # Validate date_left (can be null for current club)
            if t["date_left"] is not None:
                try:
                    left = datetime.strptime(t["date_left"], "%Y-%m-%d")
                    if left < joined:
                        errors.append(
                            f"{name}: date_left < date_joined at transfer {i} "
                            f"({t['date_left']} < {t['date_joined']})"
                        )
                except (ValueError, TypeError):
                    errors.append(
                        f"{name}: invalid date_left '{t['date_left']}' "
                        f"at transfer {i}"
                    )

            # Check chronological order (date_joined should not be before
            # previous date_joined)
            if prev_date is not None and joined < prev_date:
                warnings.append(
                    f"{name}: transfer {i} date_joined "
                    f"({t['date_joined']}) is before previous "
                    f"transfer's date_joined — may be a loan overlap"
                )
            prev_date = joined

    # Print results
    print("=" * 60)
    print("TRANSFER DATA VERIFICATION REPORT")
    print("=" * 60)
    print()

    if errors:
        print(f"ERRORS ({len(errors)}):")
        for e in errors:
            print(f"  ✗ {e}")
        print()
    else:
        print("No errors found.")
        print()

    if warnings:
        print(f"WARNINGS ({len(warnings)}):")
        for w in warnings:
            print(f"  ! {w}")
        print()

    print("SUMMARY:")
    print(f"  Total players: {len(records)}")
    print(f"  Total transfers: {total_transfers}")
    print(f"  Average transfers per player: {total_transfers / len(records):.1f}")
    print(f"  Min transfers: {min_transfers}")
    print(f"  Max transfers: {max_transfers}")
    print(f"  Unique clubs: {len(clubs)}")
    print(
        f"  Players with DB IDs: "
        f"{sum(1 for pid in seen_ids if pid > 0)}"
    )
    print(
        f"  Players with negative IDs: "
        f"{sum(1 for pid in seen_ids if pid < 0)}"
    )
    print()

    if errors:
        print("RESULT: FAIL")
        sys.exit(1)
    else:
        print("RESULT: PASS")


if __name__ == "__main__":
    main()
