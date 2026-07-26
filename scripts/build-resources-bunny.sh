#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
out_dir="${1:-$repo_root/dist/resources-bunny}"

rm -rf "$out_dir"
mkdir -p "$out_dir/site"

node "$repo_root/examples/resources-site/export-static.js" --out "$out_dir/site"
deno bundle \
  --config "$repo_root/examples/resources-site/deno.json" \
  --platform deno \
  "$repo_root/examples/resources-site/bunny-server.js" \
  --output "$out_dir/resources-bunny.js"

echo "Bunny bundle: $out_dir/resources-bunny.js"
echo "Storage export: $out_dir/site"
