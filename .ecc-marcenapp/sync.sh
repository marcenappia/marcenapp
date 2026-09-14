#!/usr/bin/env bash
set -euo pipefail

UPSTREAM_REPO="affaan-m/ECC"
PIN_FILE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/UPSTREAM_COMMIT"
VENDOR_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/vendor/ECC"

if [[ ! -f "$PIN_FILE" ]]; then
  echo "Missing $PIN_FILE" >&2
  exit 1
fi

PIN="$(tr -d '[:space:]' < "$PIN_FILE")"
if [[ ! "$PIN" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Invalid ECC commit pin: $PIN" >&2
  exit 1
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

API_JSON="$TMP_DIR/commit.json"
curl -fsSL "https://api.github.com/repos/$UPSTREAM_REPO/commits/$PIN" -o "$API_JSON"
VERIFIED_SHA="$(python - <<'PY' "$API_JSON"
import json, sys
with open(sys.argv[1], encoding='utf-8') as f:
    print(json.load(f)['sha'])
PY
)"

if [[ "$VERIFIED_SHA" != "$PIN" ]]; then
  echo "ECC upstream pin verification failed: expected $PIN, got $VERIFIED_SHA" >&2
  exit 1
fi

ARCHIVE="$TMP_DIR/ecc.tar.gz"
curl -fsSL "https://github.com/$UPSTREAM_REPO/archive/$PIN.tar.gz" -o "$ARCHIVE"
rm -rf "$VENDOR_DIR"
mkdir -p "$VENDOR_DIR"
tar -xzf "$ARCHIVE" -C "$TMP_DIR"
EXTRACTED="$(find "$TMP_DIR" -maxdepth 1 -type d -name 'ECC-*' | head -n 1)"
if [[ -z "$EXTRACTED" ]]; then
  echo "ECC archive extraction failed" >&2
  exit 1
fi
cp -R "$EXTRACTED"/. "$VENDOR_DIR"/
printf '%s\n' "$PIN" > "$VENDOR_DIR/.upstream-commit"
printf '%s\n' "ECC snapshot verified and vendored at $PIN" > "$VENDOR_DIR/.snapshot-verified"

echo "ECC-MARCENAPP: vendored ECC snapshot $PIN"
echo "No upstream branch is tracked; this is a fixed snapshot."
