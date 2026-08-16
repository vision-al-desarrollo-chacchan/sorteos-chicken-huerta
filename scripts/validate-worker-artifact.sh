#!/usr/bin/env bash
set -euo pipefail
test -f dist/server/index.js
test -d dist/client
grep -q "fetch" dist/server/index.js
echo "Validated Cloudflare Worker artifact."
