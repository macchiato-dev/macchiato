#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
out_dir="${1:-$repo_root/dist/deno-module-origin-bunny}"
rm -rf "$out_dir"
mkdir -p "$out_dir"
deno bundle \
  --config "$repo_root/examples/deno-module-origin/deno.json" \
  --platform deno \
  "$repo_root/examples/deno-module-origin/bunny-server.js" \
  --output "$out_dir/deno-module-origin-bunny.js"
echo "Bunny module-origin bundle: $out_dir/deno-module-origin-bunny.js"
