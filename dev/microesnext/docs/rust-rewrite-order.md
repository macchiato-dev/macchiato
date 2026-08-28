# Incremental Rust rewrite order

This is a working order for replacing MicroQuickJS with Rust. The beginning is
specific enough to implement. Later phases are intentionally rough: findings
from the mixed C/Rust engine should determine their exact boundaries.

The rewrite keeps a runnable engine at every step. A replacement first matches
the C behavior suite, then becomes the implementation used by the mixed build.
Deleting the corresponding C comes last. Rust ownership is not imposed on C
memory before the surrounding lifetime rules are understood.

## Memory picture

MicroQuickJS receives one contiguous region. A context and heap grow upward
from its low address while the interpreter stack grows downward from its high
address. Heap blocks carry tags and sizes. JavaScript values contain immediate
data or pointers into that region. Explicit root records protect live values
across allocation, and garbage collection marks, sweeps, compacts, and rewrites
pointers. Compilation and bytecode relocation use the same physical model.

The rewrite should move through three memory arrangements:

1. **C-owned memory, Rust leaf functions.** Rust receives pointers and lengths,
   performs an operation, and neither retains nor allocates references. The C
   allocator, roots, collector, stack, and context remain authoritative.
2. **C-owned memory, Rust structure views.** Rust uses small unsafe types for
   tagged values, block headers, slices, and context fields. These are borrowed
   views into the existing region. Mutations still obey C allocation and root
   rules, and tests compare mixed-engine traces with the C baseline.
3. **Rust-owned arena and lifetimes.** Rust owns allocation metadata, roots,
   handles, collection, and compaction. JavaScript references should be typed
   handles or offsets rather than ordinary Rust references: compaction can move
   objects, and the guest stack and heap share one bounded Wasm memory.

Safe Rust can surround the engine, but the compact core will necessarily have
small, reviewed unsafe sections. Pointer arithmetic should be concentrated in
arena and representation modules rather than repeated throughout semantics.

## Phase 1: establish substitution tests

1. Keep the existing C engine as the semantic and performance baseline.
2. Expand the direct lifecycle test to cover compile, relocate, load, run,
   exception, and context destruction as data-driven operations.
3. Add mixed-build selection at a single function boundary at a time.
4. Record deterministic results rather than internal addresses or formatted
   diagnostics. Add structural assertions only after Rust owns a subsystem.

This phase has begun: the engine test already compiles source to bytecode,
destroys the compiler context, loads it into a fresh context, and runs it.

## Phase 2: finish allocation-free libc ponyfills

Implement the simplest C-compatible operations first:

1. Complete and exercise byte and string primitives. `memcpy`, `memmove`,
   `memset`, `memcmp`, and `strlen` are already implemented.
2. Add small character classification and conversion functions only when the
   C sources require them.
3. Replace straightforward formatted-output helpers with bounded Rust writers
   where doing so does not change formatting semantics.
4. Keep `setjmp`, floating-point environment details, and allocation out of
   this phase; they affect control flow or the engine's physical memory model.

Each ponyfill should have a table of inputs, mutations, return values, and edge
conditions, plus a Wasm inspection proving that it did not introduce imports.

## Phase 3: port independent utility algorithms

These functions operate on caller-owned bytes and have little engine state:

1. UTF-8/WTF-8 encoding, decoding, scanning, and hexadecimal conversion from
   `cutils.c` and `cutils.h`.
2. Endian, unaligned-load, bit-counting, rotation, and sign-extension helpers.
3. Bounded string helpers and representation-preserving float bit conversions.
4. Intrusive-list operations, represented initially as pointer operations over
   the existing C nodes rather than a new Rust collection.

The public C symbols remain thin entry points so C callers do not change yet.

## Phase 4: port self-contained numeric subsystems

1. Port number parsing and formatting from `dtoa.c` behind its existing API.
2. Compare every formatting mode, radix, rounding boundary, NaN, infinity,
   overflow, and underflow case against C.
3. Port the compact `libm` functions in groups of shared reduction kernels.
4. Leave soft float as a separate optional milestone; do not mix its template
   translation into the first native-float replacement.

These ports may allocate temporary Rust values outside the JavaScript arena
only when that cannot become hidden persistent guest memory. A no-allocation
implementation remains preferable for predictable Wasm limits.

## Phase 5: define Rust representations without changing ownership

Introduce one internal Rust module for the physical engine model:

- tagged `Value` encoding and immediate-value operations;
- block tags, sizes, alignment, and checked offset arithmetic;
- borrowed `ContextView`, `HeapView`, and `StackView` types;
- temporary rooted-value guards that map directly to the C root chain;
- explicit conversion at every C ABI boundary.

Mirror stable C structures directly where that makes shared-memory operation
simpler. Ordinary records can use `#[repr(C)]`; tagged unions can use a
`#[repr(C)]` union behind a small unsafe accessor; and trailing variable-size
data should be represented as a fixed header plus an explicitly bounded slice.
Do not hand-copy layout assumptions without checking them. A small C layout
probe and Rust tests should compare, for every mirrored type:

- total size and alignment;
- each shared field's byte offset and size;
- pointer width and the selected 32- or 64-bit value representation;
- constants for tags, classes, flags, and discriminants.

Compile-time C assertions should catch drift when possible. Generated layout
facts are acceptable as test/build input, but the maintained Rust structures
should remain readable rather than becoming a large generated binding file.

Some structures should initially remain opaque. C bitfields, flexible array
members, conditionally compiled fields, and unions whose active member is
implied by a separate tag are the likely trouble spots. Mirror these only after
their invariants are documented. Prefer integer flag words with accessors over
Rust bitfields, and prefer offsets into the supplied arena over native pointers
in serialized forms.

At this stage the mirrored types still view C-owned memory. They must not expose
Rust references that outlive an allocation or collection point. C and Rust may
also alias the same structure, so mutations cross the boundary through narrow
functions or short-lived raw-pointer views—not simultaneous long-lived `&mut`
references. Operations that can allocate should require handles or offsets and
should make invalidation visible in their signatures.

Mirroring first is valuable even where the final Rust representation changes:
it lets individual functions move between languages without translating the
whole object graph, and it gives the mixed engine one physical source of truth
rather than synchronized duplicate structures.

## Phase 6: move leaf heap values behind the views

A tentative order is:

1. Numeric boxing and unboxing.
2. Byte arrays and tagged value arrays.
3. String allocation, traversal, comparison, slicing, and the position cache.
4. Atom lookup and interning.
5. Basic object allocation without property mutation.

The C allocator and collector still own all storage. This phase tests whether
the views and root guards describe real lifetimes before they become ownership
machinery.

## Phase 7: rewrite arena allocation and roots

First reproduce the existing upward heap and downward stack rather than
designing a general allocator. Replace, in order:

1. alignment, block-header access, and collision checks;
2. upward allocation and the limited shrink/free operations;
3. root-chain insertion and removal;
4. context initialization and teardown around the bounded region;
5. debug validation of every block, root, stack slot, and handle.

The arena should be parameterized by a byte slice or Wasm linear-memory range.
It should not call Rust's global allocator for guest objects. Generation-tagged
handles may be useful for host/debug APIs, but the compact interpreter path may
continue to use validated offsets where that is measurably smaller and faster.

## Phase 8: rewrite garbage collection and compaction

This is the first major ownership milestone and should remain separate from
objects and interpreter semantics:

1. object-size discovery and root marking;
2. reachability through each existing block tag;
3. weak/ephemeron propagation;
4. finalization and sweeping;
5. in-place compaction;
6. rewriting every heap, stack, context, and bytecode pointer;
7. adversarial collection at every allocation boundary in debug tests.

Only after mixed runs produce the same observable finalizer and weak-reference
traces should the C allocator and collector be removed.

## Phase 9: objects, properties, and closures

Rough order, to be refined after the arena work:

1. ordinary objects and dense arrays;
2. property hashing, lookup, definition, deletion, and enumeration;
3. prototypes, accessors, strings, and typed-array special properties;
4. global and lexical lookup;
5. closure environments, captured variables, and callable objects;
6. iterators, collections, weak collections, and promise storage.

This phase should favor shared primitives over one translation per JavaScript
built-in, while retaining the compact layouts until measurements justify a
change.

## Phase 10: bytecode loading and interpreter

Tentative sequence:

1. bytecode header validation, decoding, and relocation;
2. stack frames, calls, returns, and exceptions;
3. constants, locals, globals, and branches;
4. property and iterator opcodes;
5. arithmetic, comparison, and coercion slow paths;
6. suspension, resumption, jobs, and later `await` support.

The opcode table should remain the shared declarative source while C and Rust
interpreters coexist. Differential tests should run identical bytecode images,
not compile the source separately for each interpreter.

## Phase 11: parser and compiler

This order is provisional:

1. source positions, diagnostics, and lexer;
2. bytecode emitter, labels, constant pools, and source maps;
3. expression parser and its explicit continuation frames;
4. statements and control flow;
5. functions, closures, classes, and destructuring;
6. bytecode analysis, compaction, and serialization;
7. JSON and RegExp literal entry points.

The existing recursion-free parser is part of MicroQuickJS's bounded-memory
design and should be preserved before considering more idiomatic Rust parser
structures.

## Phase 12: built-ins and regular expressions

Still rough and subject to reordering:

- Move native built-ins by dependency group, beginning with Object and basic
  primitive wrappers, then Array/String, typed arrays, Math, JSON, and Date.
- Translate the bundled RegExp compiler and VM as their own subsystem after
  strings, bytecode conventions, and arena ownership are stable.
- Keep the ROM standard-library builder usable throughout. A Rust replacement
  for it is useful, but it is not on the runtime's critical path.

## Completion criteria

The rewrite is complete when the Rust engine can build and consume compatible
bytecode, passes the C behavioral corpus and structural memory tests, stays
inside its supplied Wasm memory, and meets agreed size and speed bounds. The C
implementation may remain as a readable oracle and provenance source even
after it is no longer linked into the product build.
