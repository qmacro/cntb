#!/bin/sh
# run-tests.sh — run tests, collect TAP output, write test_report.json

set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TAP="$ROOT/.test-results.tap"

cd "$ROOT"

echo "Running tests..."
c8 --reporter=json \
  node --test \
    --test-reporter=spec --test-reporter-destination=stdout \
    --test-reporter=tap  --test-reporter-destination="$TAP" \
  'test/**/*.test.js'

sh "$ROOT/scripts/write-test-report.sh" "$TAP" "$ROOT/coverage" "$ROOT/test_report.json"

rm -f "$TAP"
