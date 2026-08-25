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
- Capability bytecodes are feature-gated at decoding as well as execution.
  Bytes assigned to an omitted capability are invalid rather than accepted by
  a larger universal enum and rejected later by the VM wrapper.
- `microesnext-vm-core` reads raw bytes and depends only on the invariant
  `microesnext-bytecode-core` vocabulary. It returns any non-core byte to the
  feature-gated typed decoder in `microesnext-vm`; the raw core is deliberately
  not an independent validator for extension opcodes.
- An awaited computation is a heap-resident VM frame. Rust `async fn` and its
  compiler-generated future are host integration options, not its guest
  representation.
- The optional `microesnext-suspension` crate owns conversion between a live
  VM stack and a rooted continuation. The arena supplies generic stack-snapshot
  storage, but `microesnext-vm-core` contains no suspend, resume, or restore
  algorithm. Builds without `async` do not expose those machine operations.
- An async JavaScript call cannot suspend its ordinary caller at the first
  `await`. The optional `microesnext-async-functions` layer therefore packages
  the closure and evaluated arguments, snapshots the caller, and starts the
  body in an independent guest context over the same arena. The scheduler can
  restore the caller with the outer promise while the body continuation enters
  that promise's reaction path. A bounded caller-owned frame array permits
  nested async entry without a native recursive call or hidden allocation.
- Guest exception handlers are explicit records in the guest stack. The
  optional `microesnext-exceptions` crate owns the handler-chain pointer and
  stack operations; `microesnext-vm` composes it only behind the `exceptions`
  feature, and the invariant opcode core has no exception state. A throw
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
- Native Promise adoption is an optional composition over compact Promise
  storage. It registers an identity reaction in the caller-owned queue rather
  than recursively following a chain on the Rust or WebAssembly stack. Its
  compact error dependency turns self-resolution into a guest TypeError
  rejection rather than an engine-control error.
- Receiver-aware invocation is an optional frame composition. It reuses the
  existing argument entry path with one hidden value after fixed locals; the
  invariant `Core`, ordinary frames, and builds omitting `receivers` are
  unchanged. Object thenable assimilation uses this boundary rather than a
  host callback or proxy.
- Promise resolving functions are compact callable records rather than guest
  closures. A resolve/reject pair shares one traced `alreadyResolved` cell and
  yields a payload-free VM outcome; optional machine state carries the call to
  its controller without changing the invariant core or the public outcome
  layout under Cargo feature unification.
- Thenable resolution is split into synchronous inspection and rooted jobs.
  Guest `then` code is never invoked inline while resolving a value. If its
  resolving function receives another thenable, execution returns a new job to
  the controller, preserving ECMAScript deferral without native recursion.
- Async completion is generic over a statically dispatched resolution policy.
  Its ordinary public entry points monomorphize with native Promise resolution;
  `microesnext-async-thenables` supplies a separate policy holding a bounded,
  caller-owned thenable-job queue. The same policy can park an `await` on an
  intermediate Promise before resolving an object operand, while native
  Promises and primitives retain the direct path. This adds no trait object,
  callback, or branch to a build that omits the composition.
- Packed byte strings, atom tables, objects, and closures remain arena blocks;
  they do not become Rust allocations merely because their implementations are
  split across crates.
- Small integers remain immediate i30 values in the invariant core. Optional
  IEEE-754 numbers use opaque two-word payloads from `microesnext-numbers`, so
  arbitrary floating-point bits are never traced as guest references. Builds
  without `numbers` omit the arena block kind, typed opcodes, and implementation.
- Ordinary strings, atom interning, and objects form three boundaries. A string
  value is not automatically retained or interned. Atoms add a rooted table;
  objects compose atoms for source-level property names. A string-only machine
  links neither atom nor property-table operations.
- Symbols are individually allocated identities whose optional descriptions do
  not participate in equality. Object and collection tables already compare
  compact `Value` identities, so symbols compose as keys without either table
  depending on `microesnext-symbols`. The arena symbol kind is feature-gated.
- Iterator positions are guest-arena state rather than native Rust cursors.
  The source-agnostic `microesnext-iterators` crate retains the iterable and
  current index across collection. Array and Map/Set traversal live in separate
  adapter crates, preserving both dependency and code-size isolation.
- SameValueZero is capability-aware without runtime registration. A standalone
  collection build compares compact identities directly. Cargo weak-feature
  forwarding statically adds string-content and boxed-number equality only
  when collections are composed with those scalar crates.

The first Rust vertical slice deliberately supports only i30 constants,
addition, `await`, and return. It proves that the interpreter can suspend after
its Rust call stack has unwound, retain its operand stack through a compact
handle, and resume without a native continuation. Language coverage comes
after this representation is measured and hardened.
