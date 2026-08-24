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
node "$repo_root/scripts/embed-resources-bunny-machine.js"
node "$repo_root/packages/website/export-static.js" --out "$out_dir/site/$storage_prefix"
mkdir -p "$out_dir/site/$storage_prefix/machines"
for bytecode_set in resources-project-version; do
  source_dir="$repo_root/packages/website/generated/$bytecode_set-bytecode"
  target_dir="$out_dir/site/$storage_prefix/machines/$bytecode_set"
  mkdir -p "$target_dir"
  for artifact in "$source_dir"/*; do
    install -m 0644 "$artifact" "$target_dir/$(basename "$artifact")"
  done
done
deno bundle \
  --config "$repo_root/packages/website/deno.json" \
  --platform deno \
  --minify \
  "$repo_root/packages/website/backend/machine.ts" \
  --output "$repo_root/packages/website/backend/machine.js"
install -m 0644 "$repo_root/packages/website/backend/controller.ts" \
  "$repo_root/packages/website/backend/controller.js"
node "$repo_root/scripts/embed-resources-bunny-revision.js" \
  "$repo_root/packages/website/backend/machine.js" "$revision"
deno bundle \
  --config "$repo_root/packages/website/deno.json" \
  --platform deno \
  --minify \
  "$repo_root/packages/website/backend/controller.ts" \
  --output "$out_dir/edge/script.ts"
node "$repo_root/scripts/write-resources-bunny-manifest.js" "$out_dir" "$revision"

echo "Bunny Edge Script: $out_dir/edge/script.ts"
echo "Storage export: $out_dir/site/$storage_prefix"
echo "Deployment manifest: $out_dir/deployment.json"
