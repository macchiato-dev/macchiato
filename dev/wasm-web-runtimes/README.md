# Wasm Web Runtimes

This development area adapts JavaScript runtimes to `WasmWebMachine`. It is
kept outside the machine because choosing a language runtime is application
composition, not part of the constrained browser ABI.

## Hybrid loading

One machine ABI supports several execution strategies:

- A small resident interpreter, especially MicroQuickJS, can run control code
  and accept additional programs without replacing the machine.
- Full QuickJS can load source now and compiled bytecode later through opaque
  `onmsg(bytes)` messages. The runtime owns the message tags and decoding;
  `WasmWebMachine` does not know that the payload is JavaScript.
- A demanding component can instead receive a fresh Wasm machine. This keeps
  its memory and execution lifetime independent and avoids interrupting the
  resident interpreter.
- Ordinary serialized state is the default handoff between machines because
  it is inspectable and versionable. Shared or transferred memory is an
  optimization for large, latency-sensitive state with explicit lifetimes.

The composition layer outside `WasmWebMachine` decides when to fetch code,
create another VM, dispose one, or transfer state. Fetch is supplied as a
constrained service; it is never ambient authority inside the machine.

QuickJS runtime message tag `1` means UTF-8 JavaScript source. Tag `2` invokes
a named global with a UTF-8 string argument and reports its string result. A
bytecode tag can be added without changing the machine or its two-function
`msg`/`onmsg` ABI.

## MicroQuickJS builds

The canonical example's `guest-runtime.js` is compiled directly by `mqjs`,
without the CodeMirror environment's Babel pass. Keep it in the supported
syntax subset: variadic helpers use `arguments`, not rest parameters. The
project-editor source-compilation test requires newly produced bytecode.
The vendored compiler exits unsuccessfully on parse errors, including when an
older output file exists; upstream's success exit could disguise stale bytecode.

For a clean interpreter build, run Cargo from
`examples/microquickjs-suite/microquickjs-guest-runtime` with a fresh
`CARGO_TARGET_DIR` outside the repository. Do not rely exclusively on cached
targets when checking release reproducibility. A diagnostic build may set
`CARGO_PROFILE_RELEASE_STRIP=false` to retain function names. Before mapping
DevTools' numbered Wasm frames through that build, compare its code section
with the profiled artifact; a different function layout invalidates the map.

## MicroQuickJS callback depth

The browser build bounds nested native-to-JavaScript calls at 64, rather than
the upstream embedded default of eight. This is distinct from ordinary
bytecode-to-bytecode recursion. Native array methods that call a recursive tree
visitor can otherwise hit the C-call guard on ordinary editor documents.

The CodeMirror guest implements `Array.some` in JavaScript so its common
no-receiver callback path stays on the bytecode stack. The host is unchanged.
Browser tests cover deep visitors, array mutation/receiver semantics, and both
overflow and recovery through a still-native callback method. Do not remove
the C-call guard or equate raising it with fixing arbitrary recursive code.

## Reference leases

A returned host reference carries a lease. A new guest wrapper owns that lease
until its finalizer runs. If the guest already has the wrapper, it releases the
duplicate lease immediately instead of allocating a temporary finalizer token.
This does not collect the owning wrapper or change its reachability.

MicroQuickJS's private bridge accepts `(reference + 1, 0)` for this existing
zero-length ABI control, in addition to its usual byte-buffer messages. It
checks that the control is an integer in `1..2^20`. QuickJS already uses the
same direct release. No host method, permission, or Wasm import is added.
Tests compare the old temporary-token shim with direct release, retain node
identity through repeated GC, and reject malformed release controls.

## Guest text encoding

The MicroQuickJS build supplies a private `__wwcWriteText(bytes, offset, text)`
primitive for the guest bridge. It writes a varuint byte length followed by
UTF-8 and returns the next offset. The native implementation reads the engine's
existing UTF-8 string storage without allocating a second string or retaining
it. It checks the complete destination range before writing and converts lone
surrogates to U+FFFD. A JavaScript fallback serves the other runtimes. This is
guest-local memory work, not a new machine method or host permission.

Transient messages are sent inline, not interned indefinitely. In particular,
editing a document must not leave every old source snapshot in the bridge's
string table after the editor's own history has released it.
The same rule applies to DOM property values and method arguments: input
values, text nodes, and attribute contents travel as inline values. Method and
property names still use compact interned identifiers. This uses the existing
wire string value, with no added host API or policy exemption.

After changing native ROM entries, run
`examples/microquickjs-suite/scripts/prepare.sh` before building the runtimes.
It builds the native bytecode compiler and then generates the wasm32 ROM
headers; plain `make mqjs` alone leaves native-width headers in place. Rebuild
the bytecode and Wasm together when these tables change.
