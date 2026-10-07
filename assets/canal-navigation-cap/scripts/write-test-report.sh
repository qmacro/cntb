#!/bin/sh
# write-test-report.sh <tap-file> <coverage-dir> <output-json>
# Parses TAP output and c8 coverage-final.json, writes test_report.json
# Uses only POSIX shell + awk + grep + sed.

set -eu

TAP="$1"
COV_DIR="$2"
OUT="$3"

[ -f "$TAP" ] || { echo "ERROR: TAP file not found: $TAP" >&2; exit 1; }

# ── 1. Parse TAP with awk ─────────────────────────────────────────────────────
# Leaf tests are 4-space-indented:  "    ok N - name" / "    not ok N - name"
# Suite names come from:           "# Subtest: name"  (at column 0)
# duration is the next line:       "      duration_ms: N"

TESTS_JSON=$(awk '
BEGIN {
    suite = ""
    total = 0; passed = 0; failed = 0; skipped = 0
    sep = ""
    out = ""
}

# Top-level suite name (column 0, "# Subtest: ...")
/^# Subtest: / {
    suite = substr($0, 12)   # "# Subtest: " is 11 chars, content starts at 12
    next
}

# Leaf test line — exactly 4 leading spaces then "ok" or "not ok"
/^    (ok|not ok) / {
    line = $0
    # strip leading spaces
    sub(/^    /, "", line)

    # determine outcome
    if (line ~ /^ok /) {
        outcome = "passed"
    } else {
        outcome = "failed"
    }

    # extract test name (everything after "N - ")
    name = line
    sub(/^(ok|not ok) [0-9]+ - /, "", name)

    # check skip
    if (name ~ /# SKIP/ || name ~ /# skip/) {
        outcome = "skipped"
    }

    # scan ahead through the YAML block (--- ... duration_ms: N ...) for duration
    dur_s = "0.0000"
    while ((getline nextline) > 0) {
        if (nextline ~ /^      duration_ms:/) {
            dur = nextline
            sub(/^[[:space:]]*duration_ms: /, "", dur)
            dur_s = sprintf("%.4f", dur / 1000)
        }
        if (nextline ~ /^      \.\.\./) break   # end of YAML block
    }

    # build full name
    if (suite != "") {
        full = suite " > " name
    } else {
        full = name
    }

    # escape double-quotes in name
    gsub(/"/, "\\\"", full)

    total++
    if (outcome == "passed")  passed++
    else if (outcome == "failed") failed++
    else skipped++

    out = out sep "{\"name\":\"" full "\",\"outcome\":\"" outcome "\",\"duration\":" dur_s "}"
    sep = ","
}

END {
    # print: total passed failed skipped <tests_array>
    print total " " passed " " failed " " skipped
    print out
}
' "$TAP")

# Split awk output into two lines
COUNTS=$(printf '%s' "$TESTS_JSON" | head -1)
TESTS_ARRAY=$(printf '%s' "$TESTS_JSON" | tail -1)

TOTAL=$(printf '%s' "$COUNTS" | cut -d' ' -f1)
PASS=$(printf '%s' "$COUNTS"  | cut -d' ' -f2)
FAIL=$(printf '%s' "$COUNTS"  | cut -d' ' -f3)
SKIP=$(printf '%s' "$COUNTS"  | cut -d' ' -f4)

# Compute score: 100 * passed / total  (integer arithmetic, then format)
if [ "$TOTAL" -gt 0 ]; then
    SCORE=$(awk "BEGIN{printf \"%.2f\", 100 * $PASS / $TOTAL}")
else
    SCORE="0.00"
fi

# ── 2. Parse coverage-final.json with awk ─────────────────────────────────────
COV_FILE="$COV_DIR/coverage-final.json"
COVERAGE_FIELD=""

if [ -f "$COV_FILE" ]; then
    # Extract all "s":{...} statement-hit maps and count total / hit entries.
    # Each entry looks like "N":0  or "N":3  inside an "s":{...} block.
    COVERAGE=$(awk '
    /"s":\{/ { in_s = 1 }
    in_s && /"[0-9]+":[0-9]+/ {
        # match every "key":value pair on this line
        line = $0
        while (match(line, /"[0-9]+":[0-9]+/)) {
            pair = substr(line, RSTART, RLENGTH)
            sub(/.*:/, "", pair)   # keep just the value
            total++
            if (pair + 0 > 0) covered++
            line = substr(line, RSTART + RLENGTH)
        }
    }
    in_s && /\}/ { in_s = 0 }
    END {
        if (total > 0) printf "%.2f", 100 * covered / total
    }
    ' "$COV_FILE")

    if [ -n "$COVERAGE" ]; then
        COVERAGE_FIELD="$(printf ',\n    "coverage": %s' "$COVERAGE")"
    fi
fi

# ── 3. Write test_report.json ─────────────────────────────────────────────────
cat > "$OUT" <<EOF
{
  "summary": {
    "total": $TOTAL,
    "passed": $PASS,
    "failed": $FAIL,
    "score": $SCORE$COVERAGE_FIELD
  },
  "sections": [
    {
      "name": "CAP Tests",
      "marker": "cap_tests",
      "total": $TOTAL,
      "passed": $PASS,
      "failed": $FAIL,
      "skipped": $SKIP,
      "score": $SCORE,
      "tests": [$TESTS_ARRAY]
    }
  ]
}
EOF

echo "Report written to $OUT"
