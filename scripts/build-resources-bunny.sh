#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
out_dir="${1:-$repo_root/dist/resources-bunny}"
revision="$(git -C "$repo_root" rev-parse --short=7 HEAD)"
if [[ ! "$revision" =~ ^[0-9a-f]{7}$ ]]; then
  echo "Expected a seven-character lowercase hexadecimal Git revision, got: $revision" >&2
  exit 1
fi
release_channel="${RESOURCES_RELEASE_CHANNEL:-}"
if [[ -n "$release_channel" && ! "$release_channel" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]; then
  echo "RESOURCES_RELEASE_CHANNEL must use lowercase letters, numbers, and single hyphens" >&2
  exit 1
fi
if [[ -n "$release_channel" ]]; then
  bucket_prefix="resources-co-$release_channel-$revision"
else
  bucket_prefix="resources-co-$revision"
fi
storage_dir="$out_dir/storage/$bucket_prefix"

rm -rf "$out_dir"
mkdir -p "$storage_dir"

npm ci --prefix "$repo_root/examples/resources-site/blog-examples/vtv"
npm run build --prefix "$repo_root/examples/resources-site/blog-examples/vtv"
npm ci --prefix "$repo_root/examples/resources-site/blog-examples/markdown-editor"
npm run build --prefix "$repo_root/examples/resources-site/blog-examples/markdown-editor"
node "$repo_root/examples/resources-site/export-static.js" --out "$storage_dir"
entry="$out_dir/.resources-bunny-entry.js"
cat > "$entry" <<EOF
import * as BunnySDK from "@bunny.net/edgescript-sdk";
import { createResourcesBunnyHandler } from "../../examples/resources-site/bunny-handler.js";
BunnySDK.net.http.serve(createResourcesBunnyHandler({ bucketPrefix: "$bucket_prefix" }));
EOF
deno bundle \
  --config "$repo_root/examples/resources-site/deno.json" \
  --platform deno \
  "$entry" \
  --output "$out_dir/resources-bunny.js"
rm "$entry"

cat > "$out_dir/release.json" <<EOF
{
  "revision": "$revision",
  "channel": "$release_channel",
  "bucketPrefix": "$bucket_prefix",
  "edgeScript": "resources-bunny.js",
  "storageDirectory": "storage/$bucket_prefix"
}
EOF

echo "Bunny bundle: $out_dir/resources-bunny.js"
echo "Storage export: $storage_dir"
echo "Storage prefix embedded in script: $bucket_prefix"
