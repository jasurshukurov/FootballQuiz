#!/usr/bin/env bash
set -euo pipefail

# generate_and_deploy.sh — Full pipeline: generate daily puzzles, minimize, and upload to S3.
#
# Usage:
#   ./generate_and_deploy.sh [--date YYYY-MM-DD] [--days N]
#
# Defaults:
#   --date: tomorrow
#   --days: 1

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Defaults: tomorrow's date
DATE="$(date -v+1d +%Y-%m-%d 2>/dev/null || date -d '+1 day' +%Y-%m-%d)"
DAYS=1

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --date)
      DATE="$2"
      shift 2
      ;;
    --days)
      DAYS="$2"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

echo "============================================"
echo "  Football Trivia — Generate & Deploy"
echo "============================================"
echo "Start date: $DATE"
echo "Days:       $DAYS"
echo ""

# Step 1: Generate daily puzzles
echo "--- Step 1: Generate daily puzzles ---"
python3 "$PROJECT_ROOT/scripts/etl/generate_daily_puzzle.py" --date "$DATE" --days "$DAYS"
echo ""

# Step 2 & 3: Minimize and upload each date
SUMMARY=()
CURRENT_DATE="$DATE"

for ((i = 0; i < DAYS; i++)); do
  if [[ $i -gt 0 ]]; then
    # Advance date by 1 day (macOS vs GNU date)
    CURRENT_DATE="$(date -j -v+${i}d -f '%Y-%m-%d' "$DATE" +%Y-%m-%d 2>/dev/null || date -d "$DATE + $i days" +%Y-%m-%d)"
  fi

  echo "--- Step 2: Minimize payload for $CURRENT_DATE ---"
  node "$PROJECT_ROOT/scripts/etl/minimize_payload.js" --date "$CURRENT_DATE"
  echo ""

  MIN_FILE="$PROJECT_ROOT/data/daily_puzzles/${CURRENT_DATE}.min.json"
  FILE_SIZE=0
  if [[ -f "$MIN_FILE" ]]; then
    FILE_SIZE=$(wc -c < "$MIN_FILE" | tr -d ' ')
  fi

  echo "--- Step 3: Upload $CURRENT_DATE ---"
  UPLOAD_STATUS="OK"
  if ! bash "$SCRIPT_DIR/upload_daily_puzzle.sh" --date "$CURRENT_DATE"; then
    UPLOAD_STATUS="FAILED"
  fi
  echo ""

  SUMMARY+=("$CURRENT_DATE | ${FILE_SIZE} bytes ($(awk "BEGIN{printf \"%.1f\", $FILE_SIZE/1024}") KB) | $UPLOAD_STATUS")
done

# Print summary report
echo "============================================"
echo "  Summary Report"
echo "============================================"
printf "%-12s | %-24s | %s\n" "Date" "Size" "Status"
printf "%-12s-+-%-24s-+-%s\n" "------------" "------------------------" "--------"
for line in "${SUMMARY[@]}"; do
  IFS='|' read -r col1 col2 col3 <<< "$line"
  printf "%-12s |%-24s |%s\n" "$col1" "$col2" "$col3"
done
echo ""
echo "Pipeline complete."
