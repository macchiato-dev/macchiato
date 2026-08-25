# Rust engine invariants

MicroESNext is not an ordinary Rust object graph wrapped around a bytecode
loop. Its guest machine is a relocatable address space with explicit bounds.
The following rules preserve the properties for which MicroQuickJS is useful.

- Every guest `Value` and heap reference is exactly four bytes on Wasm32 and
  native targets.
- Runtime crates are `no_std`, receive their memory from the caller, and do not
  require libc or a global allocator. Compiler tooling may use `alloc` in a
  separate crate.
- Capacity is not permanently fixed. A caller can move a machine into a larger
  word slice. Heap offsets remain unchanged and the stack is copied against the
  new upper boundary. A Wasm controller can grow linear memory and rebind the
  same offset-based machine state.
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
- Guest exception handlers are explicit records in the guest stack, owned by
  the optional machine wrapper rather than the invariant opcode core. A throw
  restores the recorded operand and call-frame depths without unwinding the
  native Rust stack. Suspension snapshots the active handler depth, so a
  rejected `await` follows exactly the same handler chain as a synchronous
  throw.
- Wasm exception references are an optional foreign-call optimization, not the
  representation of a JavaScript exception. A baseline artifact must remain
  usable by engines that cannot validate `exnref`; a separately selected build
  may catch and rethrow opaque host or foreign-Wasm exceptions unchanged.
- Scheduler and host references use O(1), generation-checked root slots. Raw
  moving heap offsets are not exposed as durable asynchronous handles.
- Packed byte strings, atom tables, objects, and closures remain arena blocks;
  they do not become Rust allocations merely because their implementations are
  split across crates.

The first Rust vertical slice deliberately supports only i30 constants,
addition, `await`, and return. It proves that the interpreter can suspend after
its Rust call stack has unwound, retain its operand stack through a compact
handle, and resume without a native continuation. Language coverage comes
after this representation is measured and hardened.
