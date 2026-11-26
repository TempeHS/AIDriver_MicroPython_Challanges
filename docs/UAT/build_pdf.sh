#!/usr/bin/env bash
# Render AIDriver_UAT.html to AIDriver_UAT.pdf with headless Chrome/Chromium.
# Usage: ./docs/UAT/build_pdf.sh   (set CHROME=/path/to/chrome to choose a browser)
set -euo pipefail
cd "$(dirname "$0")"

chrome="${CHROME:-}"
if [ -z "$chrome" ]; then
    for candidate in google-chrome chromium chromium-browser \
        ~/.cache/ms-playwright/chromium-*/chrome-linux*/chrome; do
        if command -v "$candidate" >/dev/null 2>&1 || [ -x "$candidate" ]; then
            chrome="$candidate"
            break
        fi
    done
fi
if [ -z "$chrome" ]; then
    echo "Chrome/Chromium not found. Set CHROME=/path/to/chrome" >&2
    exit 1
fi

"$chrome" --headless --no-sandbox --disable-gpu --no-pdf-header-footer \
    --print-to-pdf="$PWD/AIDriver_UAT.pdf" "file://$PWD/AIDriver_UAT.html" 2>/dev/null
echo "Wrote $PWD/AIDriver_UAT.pdf"
