# Testing strategy

The tests preserve behavior at several boundaries so replacing C does not
require preserving its internal structure.

## Ponyfill contracts

Table-driven native Rust tests exercise each C-compatible function directly.
Cases are data—inputs, operation, and expected result—while a thin runner owns
the unsafe calls. Tables cover return values, mutation, overlap rules, boundary
lengths, and byte values outside ASCII. This makes individual Rust replacements
cheap to review without growing a forest of one-off test functions.

## Mixed-engine substitutions

Wasm builds replace one C subsystem at a time. The same MicroQuickJS tests run
against the unmodified C subsystem and its Rust replacement. This locates a
regression without requiring the eventual Rust design to resemble the C code.

## JavaScript behavior

Prepared bytecode programs record observable results rather than heap layout:

- values, exceptions, and coercions;
- property order and descriptors;
- calls, closures, and control flow;
- garbage-collection and finalizer effects;
- strings, regular expressions, and numeric edge cases.

Programs and their expected observations live in versioned corpus files. A
manifest selects required capabilities, entry bytecode, inputs, and expected
trace. The runner contains little case-specific logic. Each case runs against
the C baseline, mixed C/Rust builds, and eventually the Rust engine. Results use
a small deterministic binary trace, not formatted diagnostic text. This suite
is the bridge to Rust-owned arenas, lifetimes, and enums because those
representations may change while the trace remains equal.

## Structural Rust tests

Once a subsystem is Rust-owned, additional tests may assert invariants the C
implementation cannot express: generation validity, arena ownership, absence
of dangling references, and deterministic reclamation. These complement the
behavior suite; they do not replace it.

The library has no product `main`. Native unit tests use Rust's generated test
harness. Wasm integration tests will expose narrow test entry points and use a
separate runner.
