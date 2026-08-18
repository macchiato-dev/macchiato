#!/bin/sh
set -eu

examples=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
microquickjs="$examples/microquickjs-guest-runtime/microquickjs"
make -C "$microquickjs" clean
make -C "$microquickjs" mqjs
"$microquickjs/mqjs_stdlib" -m32 > "$microquickjs/mqjs_stdlib.h"
"$microquickjs/mqjs_stdlib" -a -m32 > "$microquickjs/mquickjs_atom.h"

tiles="$examples/vendor/mahjong-tiles"
tiles_revision=19d72ff5cf9ad9c401188734f80cef7e6c8c6140
if test -d "$tiles/.git"; then
  test "$(git -C "$tiles" rev-parse HEAD)" = "$tiles_revision"
else
  git clone --filter=blob:none https://github.com/xhokir/riichi-mahjong-tiles "$tiles"
  git -C "$tiles" checkout --detach "$tiles_revision"
fi
