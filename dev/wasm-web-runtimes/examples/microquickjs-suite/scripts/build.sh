#!/bin/sh
set -eu

examples=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
runtime="$examples/microquickjs-guest-runtime"
machine="$examples/../../../wasm-web-machine"
dist="$examples/../../dist/pages"
target="$runtime/target/wasm32-unknown-unknown/release/wasm_web_container_example_runtime.wasm"

rm -rf "$dist/mahjong" "$dist/cat-memory" "$dist/run"
rm -f "$dist/wasm-runner.js" "$dist/wasm-web-container.js" \
    "$dist/wasm-web-container-host.js"
"$examples/scripts/prepare.sh"
mkdir -p "$dist/mahjong" "$dist/cat-memory"
(cd "$machine" && npm run build:machine)
(cd "$runtime" && WWC_REBUILD_EXAMPLES=$(date +%s) \
    cargo build --release --target wasm32-unknown-unknown)
node "$examples/scripts/stamp-wasm.js" \
    "$target" "$dist/mahjong/main.wasm" \
    "runtime.bin=$dist/stamp/mahjong/runtime.bin" \
    "application.bin=$dist/stamp/mahjong/application.bin"
node "$examples/scripts/stamp-wasm.js" \
    "$target" "$dist/cat-memory/main.wasm" \
    "runtime.bin=$dist/stamp/cat-memory/runtime.bin" \
    "application.bin=$dist/stamp/cat-memory/application.bin"
cp "$machine/dist/module/wasm-web-machine.js" \
    "$machine/dist/module/wasm-web-machine.js.map" \
    "$examples/web/index.html" "$dist/"
cp "$examples/web/mahjong-example.html" "$dist/mahjong/index.html"
cp "$examples/web/wasm-example.html" "$dist/cat-memory/index.html"
