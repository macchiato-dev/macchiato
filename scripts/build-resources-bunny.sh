#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
out_dir="${1:-$repo_root/dist/resources-bunny}"
revision="$(git -C "$repo_root" rev-parse --short=7 HEAD)"
storage_prefix="resources-co-$revision"

rm -rf "$out_dir"
mkdir -p "$out_dir/site/$storage_prefix"

npm ci --prefix "$repo_root/packages/website/blog-examples/vtv"
npm run build --prefix "$repo_root/packages/website/blog-examples/vtv"
npm ci --prefix "$repo_root/packages/website/blog-examples/markdown-editor"
npm run build --prefix "$repo_root/packages/website/blog-examples/markdown-editor"
node "$repo_root/packages/website/export-static.js" --out "$out_dir/site/$storage_prefix"
deno bundle \
  --config "$repo_root/packages/website/deno.json" \
  --platform deno \
  --minify \
  "$repo_root/packages/website/bunny-server.js" \
  --output "$out_dir/resources-bunny.js"
node "$repo_root/scripts/embed-resources-bunny-revision.js" "$out_dir/resources-bunny.js" "$revision"

echo "Bunny Edge Script: $out_dir/resources-bunny.js"
echo "Storage export: $out_dir/site/$storage_prefix"
