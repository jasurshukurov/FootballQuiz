#!/usr/bin/env bash
# Deploy the web app to footballtrivia.app (S3 + CloudFront).
#
# Cache strategy:
#  - /_expo/** and /assets/** are content-hashed -> immutable, 1 year.
#  - HTML, sitemap, robots, manifest, og-image -> 5 minutes (daily puzzles ship
#    via new JS hashes referenced from fresh HTML, so HTML must stay short).
#  - privacy-policy.html and .well-known/ live in infrastructure/landing/ and
#    are re-uploaded every deploy so a sync never orphans them.
set -euo pipefail
cd "$(dirname "$0")/.."

BUCKET=s3://football-trivia-content-assets
DIST_ID=E3G0E4EMV5MBQQ

echo "== export"
npx expo export --platform web

echo "== sync immutable hashed assets"
aws s3 sync dist/_expo "$BUCKET/_expo" --only-show-errors \
  --cache-control "public,max-age=31536000,immutable"
aws s3 sync dist/assets "$BUCKET/assets" --only-show-errors \
  --cache-control "public,max-age=31536000,immutable"

echo "== sync short-lived shell files"
aws s3 sync dist "$BUCKET" --only-show-errors \
  --exclude "_expo/*" --exclude "assets/*" \
  --cache-control "public,max-age=300"

echo "== re-upload standalone site files"
aws s3 cp infrastructure/landing/privacy-policy.html "$BUCKET/privacy-policy.html" \
  --content-type text/html --cache-control "public,max-age=3600" --only-show-errors
aws s3 cp infrastructure/landing/.well-known/apple-app-site-association \
  "$BUCKET/.well-known/apple-app-site-association" \
  --content-type application/json --cache-control "public,max-age=3600" --only-show-errors
aws s3 cp infrastructure/landing/.well-known/assetlinks.json \
  "$BUCKET/.well-known/assetlinks.json" \
  --content-type application/json --cache-control "public,max-age=3600" --only-show-errors

echo "== invalidate"
INV=$(aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths "/*" \
  --query "Invalidation.Id" --output text)
echo "invalidation: $INV"
until [ "$(aws cloudfront get-invalidation --distribution-id "$DIST_ID" --id "$INV" \
  --query "Invalidation.Status" --output text)" = "Completed" ]; do sleep 10; done
echo "== live: https://footballtrivia.app"
