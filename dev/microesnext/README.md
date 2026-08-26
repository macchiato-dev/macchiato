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

The 1,984-byte Wasm build is the interpreter kernel: it proves the fixed core
can execute bytecode, but is not presented as the smallest generally useful
language runtime. The first practical boundary is the 6,506-byte minimal
programmable runtime. It composes locals, boolean control flow, and removable
i30 arithmetic and comparisons, and executes a compiled factorial loop with
an explicit relational stopping condition.

## Crates and removable capabilities

- `microesnext-types` defines the four-byte `Value` and `HeapRef` words.
- `microesnext-arena` owns the fixed-capacity heap and VM stack and compacts
  references without a forwarding-table allocation.
- `microesnext-bytecode-core` defines the raw opcodes and readers used by the
  invariant interpreter loop. It has no capability features; its immediate
  opcode covers `undefined`, `null`, and booleans in every build.
- `microesnext-bytecode` adds the typed instruction vocabulary used by tools
  and the capability wrapper. Its optional opcode groups follow the runtime
  capabilities, so an omitted feature does not enlarge its valid enum surface.
- `microesnext-compiler` contains allocation-using source and bytecode tooling;
  the runtime crates do not depend on it. Its syntax families are progressively
  feature gated too: reduced builds leave omitted syntax to the ordinary parse
  error at that character rather than retaining feature-specific diagnostics.
  Source positions are a separate authoring feature. Zero-argument functions,
  parameter/argument frames, captured-environment analysis, synchronous named
  recursion, and asynchronous named recursion are independently selectable,
  mirroring their runtime instruction groups. Quoted and no-substitution
  template strings enter only with the string bytecode capability. The
  compiler-only `literal-expressions` composition upgrades numeric-only array
  and object values to arbitrary supported expressions while preserving the
  smaller specialized literal loops when omitted.
- The values `strings` feature supplies ordinary packed byte strings, strict
  allocation-conscious concatenation, and an atom-table module. The VM retains
  atom state only when its `atoms` feature is selected; ordinary string literals
  neither allocate nor populate that table.
- `microesnext-objects` supplies prototype and property-table storage. Its VM
  feature composes strings for JavaScript property names, while the low-level
  crate can also use already-interned or non-string keys. A separate
  `property-assignment` bytecode/compiler gate adds source statement writes;
  read-only object builds retain no write dispatch beyond literal assembly.
- The objects `prototype_chain` module performs allocation-free traversal for
  `instanceof` and `Object.prototype.isPrototypeOf`; the VM feature determines
  whether any traversal call is retained.
- The objects `instanceof` module composes callable validation, ordinary
  `prototype` lookup, and traversal without allocation. Custom
  `Symbol.hasInstance` dispatch remains a higher optional layer.
- The arena's gated `closures` module stores closure entries and captures for
  builds enabling the `functions` feature. Closure storage is not a separate
  semantic library; direct calls still remain in the base VM for now.
- The objects `callable` module optionally wraps a compact closure in an
  ordinary property-bearing object. Calls unwrap it at a statically selected
  boundary. Its constructor path creates the `.prototype` / `.constructor`
  cycle in fixed arena records; closure-only and object-only machines retain
  their specialized paths and layouts.
- The objects `construction` module creates an ordinary receiver from a
  constructor's current prototype and applies the object-return rule. The VM
  composes it with receiver frames using two gated opcodes, without persistent
  machine state or changes to the invariant call frame.
- The objects `class_constructor` module gives classes a distinct object record.
  A class can use the same removable construction path, but ordinary call
  unwrapping does not accept it. The initial `classes` compiler slice supports
  constructor-only declarations; methods and inheritance remain separate.
- The objects `method_calls` module preserves a member receiver beneath its
  resolved method and removes both before entering the call frame. The independent
  `class-methods` composition stores receiver-aware, non-constructible callable
  objects on a class prototype; constructor-only class builds retain neither
  its stack operations nor its three opcodes.
- The arena's `stack-operations` feature supplies removable operand duplication
  and discard helpers. Class expressions duplicate their class record only
  while installing properties. The separate compiler-only
  `expression-statements` gate emits a generic discard for any supported
  expression followed by `;`; it does not reuse exception unwinding or add a
  statement-specific path to each expression capability.
- `class-default-constructors` is compiler-only: it synthesizes the same compact
  receiver-aware body and class-record opcode sequence when a base class omits
  `constructor`. Explicit-constructor compiler builds do not retain that parser
  branch or synthesis code, and the runtime has no corresponding feature.
- `conditional-expressions` is likewise compiler-only. It emits the existing
  typed truthiness and jump vocabulary for `condition ? consequent : alternate`,
  so removing the parser branch changes no runtime dispatch path.
- `nonterminal-conditionals` lets either side of `if`/`else` join later
  statements, while omitting the join jump after an abrupt branch. It reuses
  control-flow bytecode and relocates both targets inside function bodies;
  reduced control-flow compilers retain their smaller terminal-only parser.
- `nested-conditionals` replaces recursive descent through conditional blocks
  with explicit consequent/alternate frames in the compiler's allocation-using
  worklist. Thousands of nested source branches therefore do not consume the
  Rust stack, while nonnested compiler builds omit the frame type and loop.
- `nested-loops` generalizes that worklist with loop frames, so arbitrarily
  interleaved `while` and `if` blocks compile without Rust recursion. It emits
  the existing control-flow vocabulary; builds that stop at nested
  conditionals retain the smaller, conditional-only implementation exactly.
- `nested-exceptions` uses a separate explicit try/catch worklist and emits the
  existing optional handler bytecode. Returns close every live handler, throws
  retain the nearest handler, and omitting it preserves the smaller terminal
  exception parser rather than retaining dormant frame machinery.
- `nonterminal-exceptions` lets normally completed `try` and `catch` bodies
  join later statements. Its handler cleanup and jump patches compose into the
  nested worklist, while terminal-only exception builds retain neither control
  flow nor join bookkeeping.
- `implicit-completions` is compiler-only too. It lowers `return;` and a script
  or function body reaching its end to the invariant `undefined` constant and
  existing return instruction. Its omitted build retains the previous
  completion parser byte-for-byte rather than relying on optimization to erase
  a shared conditional branch.
- `class-static-methods` is also compiler-only. It installs the same
  non-constructible method wrapper directly on the class record instead of its
  prototype, so static calls reuse receiver-preserving method bytecode and
  observe the class as `this` without another runtime dispatch path.
- `class-expressions` accepts anonymous class values with explicit or implicit
  constructors and the same instance and static method compositions as class
  declarations. Named class-expression identity remains a separate future
  slice.
- The objects `recursive_constructor` module allocation-freely rebinds a named
  function expression's private self cell to its constructor wrapper. Ordinary
  constructors and recursive closures do not retain this cross-composition.
- `microesnext-bindings` groups feature-gated lexical and call-frame machinery
  that shares the same arena representation. Its `parameters` feature composes
  evaluated arguments with lexical slots; functions without arguments omit it.
  Its `receivers` feature adds hidden `this` values to selected call frames.
  Receiver slots live after ordinary locals, so existing local access remains
  unchanged and builds without methods or thenables omit that module.
- The bindings `environments` feature supplies traced one-value cells that
  genuinely escape into closures. The compiler shares a cell across sibling
  closures and outer writes; uncaptured locals remain direct stack words.
- The environments `assignment-expressions` feature stores through a cell
  while retaining the assigned value on the operand stack. The corresponding
  objects feature performs a result-preserving property store. Their dedicated
  inline operations leave ordinary assignment statements on smaller paths.
- The bindings `recursive-functions` feature composes closures with cells
  only for private self-bindings in named function expressions. Ordinary
  function builds do not retain the module or decode its constructor opcode.
- The execution `recursive-async-functions` feature performs the corresponding
  composition for named async expressions. It reuses async closure storage and
  an environment cell without entering ordinary recursive-function builds.
- The bindings `locals` feature supplies validated lexical stack slots. Loads and
  stores use bottom-relative positions, so temporary operands and suspension
  cannot move them; literal-only machines omit the bindings crate. The facade's
  `local-assignment-expressions` composition enables the arena's gated stack
  helpers, allowing an assignment to store one copy while returning the other
  without changing the local fast path.
- The semantics `integer-operations` feature supplies checked i30 negation,
  subtraction, multiplication, and relational comparisons. The bytecode and VM features
  decide which operations are reachable, so a unary-only build does not retain
  multiplication or comparison. `minimal-program` composes the same library
  with locals and control flow without adding floating-point storage or
  changing the invariant interpreter loop.
- `microesnext-semantics` interprets tagged values without owning their
  representations. Its independent `equality`, `truthiness`,
  `logical-operations`, and `typeof` features retain only the selected paths.
  Optional number, string, symbol, and callable-record features add the
  corresponding JavaScript behavior without indirect dispatch.
- The values `numbers` feature supplies heap-backed IEEE-754 representation together
  with its small division, negation, and primitive-coercion helpers. VM opcode
  selection and dead-code elimination remove unused operators; they do not need
  crate-level gates. String coercion remains gated because it introduces the
  decimal parser. Integer-only builds do not link this crate.
- The values `decimal-to-f64` feature is the shared, `no_std` decimal conversion
  boundary for source literals and string coercion. A small exact path handles
  common inputs; a bounded correctly-rounded fallback handles IEEE-754 edges.
  Builds omitting both consumers do not link the crate.
- Numeric helpers retain the existing i30 fast paths. Overflow falls through to
  boxed values only when promoted operations are selected; decimal string
  parsing remains separately removable with its dependency.
- The values `symbols` feature supplies unique, relocatable property-key identities.
  Optional descriptions are ordinary values, so the crate does not force the
  string, atom, object, or collection capability into a symbol-only build.
- The symbols `well_known` module retains realm-owned identities. A realm can
  omit description strings or compose them without changing ordinary symbols.
- `microesnext-iterators` stores a source, cursor, and adapter tag in a
  relocatable guest object. Arrays and collections expose independently gated
  iterator modules, so adding array iteration does not pull in Map/Set storage,
  or the reverse.
- The collections `entry-iterators` feature adds pair-array allocation only
  for `Map.entries`; collection key/value and Set iteration do not link arrays.
- The iterator `results` feature allocates ordinary `{ value, done }` objects
  with cached property identities. Cursor-only builds do not acquire object,
  atom, or string storage. Its source-neutral boundary converts an adapter's
  `Option<Value>` into live or exhausted result objects.
- The iterator `protocol` feature defines and resolves realm-local
  `[Symbol.iterator]` bindings through object prototypes. Function validation
  and invocation remain independently composable.
- The semantics `equality` feature composes SameValueZero for enabled scalar
  types.
  Collections use raw compact identity in their standalone build; number and
  string comparison enters only when those capabilities are selected too.
- `microesnext-collections` contains ordered, geometrically grown Map and Set
  storage with live cursor semantics.
- `microesnext-arrays` contains dense and sparse indexed storage with geometric
  growth, holes, and JavaScript length behavior.
- The arrays `assignment-expressions` feature stores a computed index while
  retaining the assigned value. The compiler's separate `array-indexing` gate
  adds reads without runtime code; literal stores retain their smaller path.
- `microesnext-collections` contains Map and Set plus an independently gated
  `weak` module. Ephemeron tracing is retained only by that feature.
- `microesnext-promises` contains compact promise records and a caller-owned,
  rooted FIFO job ring; it does not require a native allocator or Rust futures.
- The values `errors` feature supplies compact guest error identities without forcing
  message strings, stacks, objects, or exception handlers into every build.
- The Promise `resolution` feature optionally adopts native Promise results.
  Plain Promise storage does not retain the resolver path.
- The Promise `resolvers` feature adds compact guest-callable resolve/reject
  records. Each pair shares one arena cell, so exactly one call can win without
  allocating two independent closures.
- The scheduler `thenables` feature composes ordinary object lookup,
  receiver-aware calls, resolving functions, and deferred assimilation jobs. A controller
  schedules guest `then` code instead of running it during property resolution;
  resolving to another thenable produces another rooted job rather than native
  recursion. Builds without `thenables` link none of this composition.
- `microesnext-exceptions` owns explicit guest handler-chain bookkeeping and
  stack unwinding only for builds enabling the `exceptions` feature. Handler
  records remain guest-stack words; the invariant opcode core has no exception
  state.
- `microesnext-execution` contains independently gated stack suspension, async
  closure records, bounded caller frames, and recursive async construction.
  A plain synchronous VM retains none of those paths.
- `microesnext-vm` is the synchronous interpreter and suspension boundary.
- `microesnext-scheduler` contains independently gated async driving, Promise
  jobs, object-thenable jobs, and async-thenable resolution policies.
- The execution `async-functions` feature stores async closures and packages
  evaluated calls for independent guest contexts. Its bounded, caller-supplied
  frame stack connects nested calls to outer promises; caller suspension and
  promise orchestration remain absent from ordinary function builds.
- The scheduler `async-thenables` feature supplies a statically selected policy
  for object assimilation at both async return and `await`. Object operands use a
  small intermediate Promise and the bounded thenable-job queue; primitives
  and native Promises retain the ordinary path. The ordinary async driver
  remains monomorphized with its smaller native-Promise resolver when this
  composition is omitted.
- `microesnext` is a small facade; its `async` and `async-functions` features
  are disabled by default.

When source is compiled for a selected facade feature set, the source compiler
must enable the matching syntax and bytecode features. The facade's test-only
compiler dependency deliberately has no default features; each facade feature
forwards only its corresponding compiler feature. Production runtime builds do
not link the compiler, and reduced tests cannot accidentally emit bytecode for
a capability absent from their runtime.

The runtime is `no_std` and has no global-allocator or libc dependency. Its
arena borrows a caller-supplied word slice; only compiler tooling uses `alloc`.

These are static Rust crate boundaries, not runtime plugins. Release builds use
fat LTO and one code-generation unit, so hot functions can inline across them.
Leaving out a capability removes its crate without adding indirect dispatch to
the base interpreter.

`tools/measure-capabilities.ts` builds the isolated
`microesnext-capability-size` package, instantiates its final Wasm, calls every
claimed export, then reports raw and gzip sizes. The separate package has no
compiler dev-dependency whose Cargo features could contaminate production
measurements.

`tools/measure-compiler.ts` performs the corresponding check for the source
compiler. It links a real allocator-backed Wasm executable, instantiates it,
and requires the selected compiler to produce bytecode before reporting its
raw and gzip sizes. This avoids treating an archive or LLVM bitcode object as
evidence that omitted parser paths disappeared from a final program.

The isolated `microesnext-core-loop` package provides a repeatable native
instruction-loop check without compiler dev-feature unification:

```sh
cargo run --release -p microesnext-core-loop --no-default-features
cargo run --release -p microesnext-core-loop --no-default-features \
  --features arrays,control-flow,functions,number-division,number-remainder,objects \
  -- --machine
cargo run --release -p microesnext-core-loop --no-default-features \
  --features function-arguments -- --calls
cargo run --release -p microesnext-core-loop --no-default-features \
  --features environments,functions,locals -- --captures
npm run check:features
```

It is a regression signal rather than a claim that noisy wall-clock timings can
prove identical performance. The structural performance gate is stronger: the
minimal dependency graph excludes capability crates, and the hot loop reads
raw opcode bytes from `microesnext-bytecode-core`. It uses a direct match with
no feature-dependent enum, trait objects, registries, or dynamic callbacks.
Only an extension byte crosses into the typed capability wrapper. Local and
control-flow instructions use that same static boundary. This keeps the raw
base loop byte-for-byte independent of those optional instruction families;
there is no trait object, registry, or runtime feature lookup.
`check:features` inspects Cargo's resolved graph and fails if representative
minimal or narrowly composed builds acquire unrelated capability crates.

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
