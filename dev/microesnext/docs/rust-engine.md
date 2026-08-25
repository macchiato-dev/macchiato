# Rust engine invariants

MicroESNext is not an ordinary Rust object graph wrapped around a bytecode
loop. Its guest machine is a relocatable address space with explicit bounds.
The following rules preserve the properties for which MicroQuickJS is useful.

- Every guest `Value` and heap reference is exactly four bytes on Wasm32 and
  native targets.
- Durable relationships use word offsets. A Rust reference into the arena may
  not survive a call that can allocate or collect.
- The guest heap grows upward and its operand/frame stack grows downward in one
  fixed-capacity buffer.
- Guest calls, parsing, tracing, and suspension must not recurse on the native
  stack.
- Guest allocations do not become individual `Box`, `Vec`, `String`, `Rc`, or
  host allocator entries.
- Collection traces and compacts the arena. Debug tests must relocate live
  graphs frequently enough to expose stale offsets.
- Bytecode and immutable built-ins may be shared outside the mutable arena.
- Capabilities are separate crates linked statically. The base opcode loop does
  not use trait objects, dynamic registries, or callbacks for omitted features.
- An awaited computation is a heap-resident VM frame. Rust `async fn` and its
  compiler-generated future are host integration options, not its guest
  representation.

The first Rust vertical slice deliberately supports only i30 constants,
addition, `await`, and return. It proves that the interpreter can suspend after
its Rust call stack has unwound, retain its operand stack through a compact
handle, and resume without a native continuation. Language coverage comes
after this representation is measured and hardened.
