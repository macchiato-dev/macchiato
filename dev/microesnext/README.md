# MicroESNext

MicroESNext is an experimental small JavaScript engine being rebuilt in Rust
around the compact-machine lessons of
[MicroQuickJS](https://github.com/bellard/mquickjs). It uses four-byte tagged
values, relocatable word offsets, one bounded address space, stack bytecode,
and no native recursion for guest calls. Async suspension is part of the VM
frame design rather than a translation to Rust futures.

The previous C implementation remains temporarily in `src/` as a behavioral
oracle. New engine code lives in the Cargo workspace under `crates/`; it does
not link to that C implementation.

## Crates and removable capabilities

- `microesnext-types` defines the four-byte `Value` and `HeapRef` words.
- `microesnext-arena` owns the fixed-capacity heap and VM stack and compacts
  references without a forwarding-table allocation.
- `microesnext-bytecode` defines the compact instruction stream independently
  of execution.
- `microesnext-compiler` contains allocation-using source and bytecode tooling;
  the runtime crates do not depend on it.
- `microesnext-objects` supplies packed strings, interned keys, and ordinary
  objects only to builds enabling the `objects` feature.
- `microesnext-functions` supplies heap closures and captured values only to
  builds enabling the `functions` feature. Direct calls remain in the base VM.
- `microesnext-collections` contains ordered, geometrically grown Map and Set
  storage with live cursor semantics.
- `microesnext-arrays` contains dense and sparse indexed storage with geometric
  growth, holes, and JavaScript length behavior.
- `microesnext-weak-collections` contains WeakMap and WeakSet storage as a
  separate capability because ephemerons alter collector tracing.
- `microesnext-promises` contains compact promise records and a caller-owned,
  rooted FIFO job ring; it does not require a native allocator or Rust futures.
- `microesnext-exceptions` owns explicit guest handler-chain bookkeeping and
  stack unwinding only for builds enabling the `exceptions` feature. Handler
  records remain guest-stack words; the invariant opcode core has no exception
  state.
- `microesnext-vm` is the synchronous interpreter and suspension boundary.
- `microesnext-async` adds scheduler-facing async types without entering the
  synchronous VM's dependency graph.
- `microesnext` is a small facade; its `async` feature is disabled by default.

The runtime is `no_std` and has no global-allocator or libc dependency. Its
arena borrows a caller-supplied word slice; only compiler tooling uses `alloc`.

These are static Rust crate boundaries, not runtime plugins. Release builds use
fat LTO and one code-generation unit, so hot functions can inline across them.
Leaving out a capability removes its crate without adding indirect dispatch to
the base interpreter.

`tools/measure-capabilities.ts` builds final Wasm probes which call into each
enabled crate, then reports raw and gzip sizes. This catches accidental
capability linkage that a dependency-tree check alone would miss.

The `core-loop` example provides a repeatable native instruction-loop check:

```sh
cargo run --release -p microesnext --example core-loop
cargo run --release -p microesnext --example core-loop \
  --features async,objects,functions
```

It is a regression signal rather than a claim that noisy wall-clock timings can
prove identical performance. The structural performance gate is stronger: the
minimal dependency graph excludes capability crates, and the hot loop uses a
direct opcode match with no trait objects, registries, or dynamic callbacks.

This is a new codebase. Existing MicroQuickJS runtimes elsewhere in the
Macchiato repository are consumers and comparison points, not source
dependencies. Integration happens only after the new runtime passes its own
tests.

## Development

```sh
cargo test --workspace
npm test                 # temporary C behavioral oracle
```

Cargo writes generated artifacts under `target/`. The older C build writes
generated executables under `build/`. Neither directory is committed.

The precise implemented surface and its intentional boundaries are described
in [Supported ES6 subset](docs/supported-es6.md).
The [bytecode study](docs/bytecode.md) records how newer syntax maps onto the
engine and why `await` is the one requested feature that needs an instruction.

## Source provenance

The legacy `src/` began as an unmodified copy of MicroQuickJS commit
`203d5bb79789bc47b74855d9207415dab71661a0`. Its MIT license is retained in
`src/LICENSE`. Subsequent changes belong to the MicroESNext history and are
kept readable and independently testable here. The Rust engine is a new
implementation and retains the repository's MIT license.
