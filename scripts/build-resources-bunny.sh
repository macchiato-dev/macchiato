#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
out_dir="${1:-$repo_root/dist/resources-bunny}"
revision="$(git -C "$repo_root" rev-parse --short=7 HEAD)"
storage_prefix="resources-co-$revision"

rm -rf "$out_dir"
mkdir -p "$out_dir/site/$storage_prefix"
mkdir -p "$out_dir/edge"

npm ci --prefix "$repo_root/packages/website/blog-examples/vtv"
npm run build --prefix "$repo_root/packages/website/blog-examples/vtv"
npm ci --prefix "$repo_root/packages/website/blog-examples/markdown-editor"
npm run build --prefix "$repo_root/packages/website/blog-examples/markdown-editor"
node "$repo_root/packages/website/build-resources-server.js"
node "$repo_root/packages/website/export-static.js" --out "$out_dir/site/$storage_prefix"
mkdir -p "$out_dir/site/$storage_prefix/machines"
install -m 0644 "$repo_root/packages/website/generated/resources-server-microquickjs.wasm" \
  "$out_dir/site/$storage_prefix/machines/resources-server-microquickjs.wasm"
install -m 0644 "$repo_root/packages/website/generated/resources-project-version-microquickjs.wasm" \
  "$out_dir/site/$storage_prefix/machines/resources-project-version-microquickjs.wasm"
deno bundle \
  --config "$repo_root/packages/website/deno.json" \
  --platform deno \
  --minify \
  "$repo_root/packages/website/backend/machine.ts" \
  --output "$repo_root/packages/website/backend/machine.js"
mkdir -p "$out_dir/edge/backend"
install -m 0644 "$repo_root/packages/website/backend/controller.ts" \
  "$out_dir/edge/backend/controller.ts"
install -m 0644 "$repo_root/packages/website/backend/controller.ts" \
  "$repo_root/packages/website/backend/controller.js"
install -m 0644 "$repo_root/packages/website/backend/controller.js" \
  "$out_dir/edge/backend/controller.js"
install -m 0644 "$repo_root/packages/website/backend/machine.js" \
  "$out_dir/edge/backend/machine.js"
install -m 0644 "$repo_root/packages/website/backend/deno.json" \
  "$out_dir/edge/backend/deno.json"
node "$repo_root/scripts/embed-resources-bunny-revision.js" \
  "$out_dir/edge/backend/machine.js" "$revision"
deno bundle \
  --config "$repo_root/packages/website/deno.json" \
  --platform deno \
  --minify \
  "$repo_root/packages/website/backend/controller.ts" \
  --output "$out_dir/edge/script.ts"
node "$repo_root/scripts/embed-resources-bunny-revision.js" "$out_dir/edge/script.ts" "$revision"
node "$repo_root/scripts/write-resources-bunny-manifest.js" "$out_dir" "$revision"

echo "Bunny Edge Script: $out_dir/edge/script.ts"
echo "Storage export: $out_dir/site/$storage_prefix"
echo "Deployment manifest: $out_dir/deployment.json"
