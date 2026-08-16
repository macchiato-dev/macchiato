# QuickJS guest runtime

This example embeds full upstream QuickJS behind the same two-function
`wasm-web-container` ABI as the MicroQuickJS guest. It exists for applications
whose existing JavaScript needs modern language and runtime behavior more than
the smaller engine's footprint.

The runtime intentionally excludes QuickJS's `quickjs-libc` module. Filesystem,
process, signal, socket, and worker facilities are not ambient guest powers.
Browser-shaped facilities still come from the guest runtime and cross the host
bridge only through explicitly supported operations.

## Build boundary

- Rust owns the exported Wasm ABI, memory limit integration, and build.
- Vendored QuickJS provides only the JavaScript engine.
- `libc-ponyfill/` is a capability-free C library ponyfill, not WASI.
- QuickJS standard-library includes are quoted and resolve to
  `libc-ponyfill/` first.
- JavaScript source or bytecode remains supplied by the guest application.

Build the standalone runtime with:

```sh
cargo build --release --target wasm32-unknown-unknown
```

The resulting module imports only `host.msg(offset, length)`. Its enclosing
runner owns the linear-memory policy. The bootstrap evaluates modern syntax with full
QuickJS and reports `QuickJS:42` through `host.msg`; this deliberately small
probe distinguishes the engine port from the browser guest runtime that will
be built on top of it.

The libc clock is deterministic UTC during this bootstrap stage. Wall-clock
time and locale will arrive as ordinary container messages rather than hidden
WASI or JavaScript host imports.

Runtime-specific applications belong under `examples/`; the first bootstrap
probe is documented in `examples/bootstrap/`.

For constrained-engine testing, set `WWC_QUICKJS_MEMORY_LIMIT` to a byte count
while building. The bootstrap passes at 1, 2, and 4 MiB; these numbers measure
only the probe and are not recommended application defaults.

## Upstream

The initial engine snapshot is Bellard QuickJS `2026-06-04`, commit
`04be246001599f5995fa2f2d8c91a0f198d3f34c`. Its MIT license is preserved in
`quickjs/LICENSE`. Local source changes are marked `CUSTOMIZATION` near the
changed lines.

The libc ponyfill documents the provenance and license of every adapted file
beside that file. No host libc or WASI import should appear in the finished
module.
