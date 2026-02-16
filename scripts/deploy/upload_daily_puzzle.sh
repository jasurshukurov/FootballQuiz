#!/usr/bin/env bash
set -euo pipefail

# upload_daily_puzzle.sh — Upload a minimized daily puzzle JSON to S3 and invalidate CloudFront.
#
# Usage:
#   ./upload_daily_puzzle.sh [--date YYYY-MM-DD] [--bucket NAME] [--distribution-id ID]
#
# Environment variables (overridden by flags):
#   S3_BUCKET_NAME             — S3 bucket name
#   CLOUDFRONT_DISTRIBUTION_ID — CloudFront distribution ID

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Defaults
DATE="$(date +%Y-%m-%d)"
BUCKET="${S3_BUCKET_NAME:-football-trivia-content-assets}"
DISTRIBUTION_ID="${CLOUDFRONT_DISTRIBUTION_ID:-}"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --date)
      DATE="$2"
      shift 2
      ;;
    --bucket)
      BUCKET="$2"
      shift 2
      ;;
    --distribution-id)
      DISTRIBUTION_ID="$2"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

# Validate date format
if ! [[ "$DATE" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
  echo "ERROR: Invalid date format '$DATE'. Expected YYYY-MM-DD." >&2
  exit 1
fi

# Convert date separators for S3 key: 2026-02-16 -> 2026_02_16
S3_DATE_KEY="${DATE//-/_}"
LOCAL_FILE="$PROJECT_ROOT/data/daily_puzzles/${DATE}.min.json"

if [[ ! -f "$LOCAL_FILE" ]]; then
  echo "ERROR: File not found: $LOCAL_FILE" >&2
  exit 1
fi

FILE_SIZE=$(wc -c < "$LOCAL_FILE" | tr -d ' ')
echo "=== Upload Daily Puzzle ==="
echo "Date:        $DATE"
echo "File:        $LOCAL_FILE"
echo "File size:   $FILE_SIZE bytes ($(awk "BEGIN{printf \"%.1f\", $FILE_SIZE/1024}") KB)"
echo "Bucket:      $BUCKET"
echo "S3 key:      puzzles/${S3_DATE_KEY}.json"

# Upload dated file
echo ""
echo "Uploading puzzles/${S3_DATE_KEY}.json ..."
aws s3 cp "$LOCAL_FILE" "s3://${BUCKET}/puzzles/${S3_DATE_KEY}.json" \
  --content-type "application/json" \
  --cache-control "public, max-age=86400"
echo "Upload complete: puzzles/${S3_DATE_KEY}.json"

# Copy to latest.json
echo "Copying to puzzles/latest.json ..."
aws s3 cp "s3://${BUCKET}/puzzles/${S3_DATE_KEY}.json" "s3://${BUCKET}/puzzles/latest.json" \
  --content-type "application/json" \
  --cache-control "public, max-age=86400"
echo "Upload complete: puzzles/latest.json"

# Invalidate CloudFront
if [[ -n "$DISTRIBUTION_ID" ]]; then
  echo ""
  echo "Invalidating CloudFront distribution: $DISTRIBUTION_ID"
  INVALIDATION_OUTPUT=$(aws cloudfront create-invalidation \
    --distribution-id "$DISTRIBUTION_ID" \
    --paths "/puzzles/${S3_DATE_KEY}.json" "/puzzles/latest.json")
  INVALIDATION_ID=$(echo "$INVALIDATION_OUTPUT" | grep -o '"Id": "[^"]*"' | head -1 | cut -d'"' -f4)
  echo "Invalidation created: ${INVALIDATION_ID:-unknown}"
else
  echo ""
  echo "WARNING: No CLOUDFRONT_DISTRIBUTION_ID set. Skipping cache invalidation."
fi

echo ""
echo "Done."
