# QuickJS-NG guest runtime

This example embeds upstream QuickJS-NG behind the same two-function
`wasm-web-container` ABI as the Bellard QuickJS and MicroQuickJS guests. Use it
for modern existing JavaScript when the actively developed fork is preferred.

The runtime deliberately excludes `quickjs-libc`. Filesystem, process, signal,
socket, and worker facilities are not ambient guest powers. Browser-shaped
facilities cross only the explicit container bridge.

## Build boundary

- Rust owns the exported Wasm ABI, bounded memory, allocation, and math.
- Vendored QuickJS-NG supplies only the JavaScript engine.
- `libc-ponyfill/` is a capability-free C library ponyfill, not WASI.
- Quoted standard-library includes resolve to `libc-ponyfill/` first.
- JavaScript source or bytecode remains guest-application data.

Build with:

```sh
cargo build --release --target wasm32-unknown-unknown
```

The module imports only `host.msg(offset, length)`; its enclosing runner owns
the linear-memory policy. Its bootstrap probe reports `QuickJS-NG:42`.

The libc clock is deterministic UTC for the bootstrap. Wall-clock time and
locale will later arrive through ordinary container messages, not hidden WASI
or JavaScript imports.

Runtime-specific applications belong under `examples/`; the first bootstrap
probe is documented in `examples/bootstrap/`.

For constrained-engine testing, set `WWC_QUICKJS_MEMORY_LIMIT` to a byte count
while building. The bootstrap passes at 1, 2, and 4 MiB; these numbers measure
only the probe and are not recommended application defaults.

## Upstream

The initial engine snapshot is QuickJS-NG `v0.16.1`, commit
`954dc53628e36891f93c359aa60895c2ae3dac6b`. Its MIT license is preserved in
`quickjs/LICENSE`. Local semantic source changes are marked `CUSTOMIZATION`.
