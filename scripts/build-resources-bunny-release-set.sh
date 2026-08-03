#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

RESOURCES_RELEASE_CHANNEL=staging \
BLOG_EXAMPLES_ORIGIN=https://staging-blog-examples.resources.co \
  "$repo_root/scripts/build-resources-bunny.sh" "$repo_root/dist/resources-bunny-staging"

RESOURCES_RELEASE_CHANNEL=preprod \
BLOG_EXAMPLES_ORIGIN=https://preprod-blog-examples.resources.co \
  "$repo_root/scripts/build-resources-bunny.sh" "$repo_root/dist/resources-bunny-preprod"

BLOG_EXAMPLES_ORIGIN=https://blog-examples.resources.co \
  "$repo_root/scripts/build-resources-bunny.sh" "$repo_root/dist/resources-bunny-production"

"$repo_root/scripts/build-deno-module-origin-bunny.sh" "$repo_root/dist/modules-bunny"

echo "Release set:"
echo "  staging:   $repo_root/dist/resources-bunny-staging"
echo "  preprod:   $repo_root/dist/resources-bunny-preprod"
echo "  production: $repo_root/dist/resources-bunny-production"
echo "  module origin (configure once per environment): $repo_root/dist/modules-bunny"
