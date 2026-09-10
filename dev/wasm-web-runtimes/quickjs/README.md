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

The resulting module imports `host.msg(offset, length)` and `host.now()`.
The latter supplies a monotonic clock to the browser-shaped environment. Its enclosing
runner owns the linear-memory policy. The bootstrap evaluates modern syntax with full
QuickJS and reports `QuickJS:42` through `host.msg`; this deliberately small
probe distinguishes the engine port from the browser guest runtime that will
be built on top of it.

The libc clock is deterministic UTC during this bootstrap stage. Wall-clock
time and locale will arrive as ordinary container messages rather than hidden
WASI or JavaScript host imports.

Runtime-specific applications belong under `examples/`; the first bootstrap
probe is documented in `examples/bootstrap/`.

The build can replace that probe with ordinary source files:

```sh
WWC_GUEST_ENVIRONMENT=/absolute/path/to/environment.js \
WWC_APPLICATION_SOURCE=/absolute/path/to/application.js \
cargo build --release --target wasm32-unknown-unknown
```

The environment is evaluated first and supplies the DOM facade. The
application is then evaluated unchanged inside QuickJS. Neither source runs in
the browser realm.

The runtime also provides `__wwcEvaluateModule(source, filename)`, returning
QuickJS's module-evaluation promise. Its native module loader calls the guest's
`__wwcModuleSource(normalizedName)` for dependency source. It has no built-in
file or URL loader. The guest environment supplies that function and any
resource policy; imports, cycles, live bindings, and top-level `await` are
handled by QuickJS rather than a source-code rewrite.

An application may define `globalThis.__wwcResult()` as a development-only
acceptance probe. The runtime reports its result after successful evaluation;
production applications can omit it and report `ready`.

For constrained-engine testing, set `WWC_QUICKJS_MEMORY_LIMIT` to a byte count
while building. The bootstrap passes at 1, 2, and 4 MiB; these numbers measure
only the probe and are not recommended application defaults.

## Reusable engine sessions

`WWC_MULTICONTEXT=1`, together with `WWC_CANONICAL_HOST=1`, builds the session
transport used by `context-runtime.js`. It keeps the existing `onmsg` export
and `host.msg` import. The adapter supplies three little-endian words before
each ordinary machine message: session ID, message length, and action
(`0` delivers; `1` disposes). This is runtime-specific, not a new DOM operation.

`new QuickJSRuntime(module).createSession()` returns an adapter that can be
passed in place of a compiled module to `new WasmWebMachine(...)`. Each session
has its own DOM bridge and a separate QuickJS `JSRuntime`/`JSContext`, while
sharing one WebAssembly instance and allocator. Separate QuickJS runtimes keep
job queues and object graphs independently disposable; these are not shared
globals or shared QuickJS objects.

Destroy each machine to free its JS context, job queue, host-reference leases,
and browser callbacks. `QuickJSRuntime.destroy()` releases any remaining JS
sessions; owners must still destroy their machines to detach browser services.
Do not destroy a session from inside one of its active host callbacks. Prepare
a replacement against a separate hidden root, then swap roots and dispose the
old machine after the call has returned.
Disposal is terminal: neither a new session nor an unattached session adapter
can attach after its runtime is destroyed. A finalizer-reporting error still
releases sibling sessions before it is rethrown, and repeated disposal is safe.

Browser exceptions must not unwind live interpreter C frames. The adapter
returns an error sentinel for rejected host operations; the native bridge
turns it into a QuickJS exception. The original browser error is rethrown after
Wasm returns, so C can release its temporary values. Session state is passed
explicitly to C helpers, including across nested calls that fail.

The browser regression builds a session artifact in a sibling working
directory, runs two guests, exercises nested errors and denied DOM access,
checks reference release, and repeatedly replaces one guest while the other
remains active:

```sh
node --test packages/project-editor/test/sessions.browser.test.js
```

Run that command from the repository root. Resources' direct and iframe output
controllers use this adapter through `packages/website/project-output-session.js`.
Their shared lifecycle prepares a replacement root, swaps only after successful
initialization, and disposes the previous session without recreating the Wasm
instance. `packages/project-editor/test/modules.browser.test.js` checks both paths.

## Upstream

The initial engine snapshot is Bellard QuickJS `2026-06-04`, commit
`04be246001599f5995fa2f2d8c91a0f198d3f34c`. Its MIT license is preserved in
`quickjs/LICENSE`. Local source changes are marked `CUSTOMIZATION` near the
changed lines.

The libc ponyfill documents the provenance and license of every adapted file
beside that file. No host libc or WASI import should appear in the finished
module.
