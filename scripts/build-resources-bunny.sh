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
  "$repo_root/packages/website/bunny-application.js" \
  --output "$out_dir/resources-application.js"
deno bundle \
  --config "$repo_root/packages/website/deno.json" \
  --platform deno \
  "$repo_root/packages/website/bunny-bootstrap.js" \
  --output "$out_dir/resources-bunny.js"
deno bundle \
  --config "$repo_root/packages/website/deno.json" \
  --platform deno \
  "$repo_root/packages/website/bunny-module-origin.js" \
  --output "$out_dir/resources-bunny-module-origin.js"
node "$repo_root/scripts/finalize-resources-bunny.js" "$out_dir" "$storage_prefix" "$revision"

echo "Bunny bootstrap: $out_dir/resources-bunny.js"
echo "Bunny module origin: $out_dir/resources-bunny-module-origin.js"
echo "Storage export: $out_dir/site/$storage_prefix"
