#!/bin/bash
# This script validates that all Cucumber steps are defined.
# It runs a dry-run and checks the JSON output for undefined steps.
# Exit code 0 means all steps are defined; exit code 1 means there are undefined steps.
#
# Flag legend:
# -e: exit immediately if one of the commands fails
# -u: throw an error if one of the inputs is not set
# -o pipefail: result is the value of the last command
# +x: do not print all executed commands to terminal
set -euo pipefail
set +x

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

echo "Checking for undefined Cucumber steps..."
OUTPUT=$(npx cucumber-js --dry-run --format json 2>&1)
UNDEFINED_STEPS=$(echo "$OUTPUT" | jq -r '
  [.[].elements[].steps[] | select(.result.status == "undefined")] |
  if length > 0 then
    "Found \(length) undefined step(s):\n" +
    (map("  - " + .name) | join("\n"))
  else
    empty
  end
' 2>/dev/null || echo "")

if [ -n "$UNDEFINED_STEPS" ]; then
  echo ""
  echo "ERROR: Undefined steps detected!"
  echo "$UNDEFINED_STEPS"
  echo ""
  echo "Please implement the missing step definitions before running tests"
  exit 1
fi

echo "All steps are defined"
exit 0
