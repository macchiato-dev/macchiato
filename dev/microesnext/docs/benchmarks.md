# Rust engine measurements

Measurements are checkpoints, not timeless claims. Keep the benchmark source,
command, host architecture, and feature set alongside results so later changes
can be compared honestly.

## Core opcode loop, 2026-08-25

The `core-loop` example ran 20,020,000 instructions per sample on
`aarch64-unknown-linux-gnu` with Rust 1.98.0, release fat LTO, and one codegen
unit.

| Build | Samples (ns/instruction) | Stripped executable |
| --- | --- | ---: |
| Minimal, no default features | 3.71, 3.81, 4.11 | 333,136 bytes |
| `async,objects,functions` | 3.53, 3.53, 3.57 | 333,136 bytes |

The timings are close enough that this run detects no feature-induced core-loop
cost; it does not prove mathematical equality. The identical executable sizes
occur because the example does not exercise capability code and fat LTO removes
it. `cargo tree --no-default-features` separately confirms that capability
crates do not enter the minimal dependency graph at all.

Future checks must include representative object, closure, collection, parser,
and suspension workloads and compare peak arena usage against upstream
MicroQuickJS. A faster synthetic addition loop cannot excuse regressions in
those workloads.

## Feature-independent core, 2026-08-25

After Promise jobs were added, the facade benchmark began varying with enabled
features even though it executed only integer opcodes. The hot interpreter was
therefore extracted into `microesnext-vm-core`, and its byte readers and raw
base-opcode constants into `microesnext-bytecode-core`. Neither crate has
capability features. Optional opcode bytes return to the typed VM wrapper;
base bytecodes remain in a state type and dispatch loop whose compiled Rust
surface does not vary with the selected capabilities.

An isolated `microesnext-core-loop` package prevents the compiler dev
dependency from unifying all facade features into the benchmark. That exposed
a real 10–30% regression hidden by the earlier setup. Disassembly showed fat
LTO declining to inline base call-frame setup in the larger build, which added
register spills to unrelated arithmetic dispatch. Keeping that small base
operation always-inline restored overlapping minimal and full measurements.

Eight alternating samples in the latest run measured 3.30–3.47 ns/instruction
for minimal `Core` and 3.47–3.51 for full `Core`; `Machine` measured 3.29–3.81
for minimal and 3.29–3.53 for full. Process startup, frequency scaling, and
separately linked layouts make these samples noisy. They detect no consistent
capability penalty, but do not prove mathematical equality. The stronger gate
is structural: optional crates and their typed opcodes cannot enter the raw
base loop.

## Final Wasm capability sizes, 2026-08-25

`tools/measure-capabilities.ts` builds an exported, allocator-free Wasm probe
for each capability. Every row exercises the named implementation, preventing
LTO from merely discarding an enabled but unused dependency.

| Build | Wasm bytes | Gzip bytes |
| --- | ---: | ---: |
| Minimal | 1,984 | 961 |
| Arrays | 8,768 | 3,532 |
| Array iterators | 10,756 | 4,205 |
| Atoms with strings | 9,969 | 4,208 |
| Async suspension | 6,455 | 2,856 |
| Collections | 3,285 | 1,507 |
| Control flow and base truthiness | 3,486 | 1,657 |
| Control flow with number/string truthiness | 9,380 | 3,962 |
| Collection iterators | 10,170 | 4,091 |
| Collection entry iterators | 13,542 | 4,979 |
| Collections with number/string equality | 15,138 | 5,840 |
| Exceptions | 3,846 | 1,761 |
| Shared environment cells | 6,285 | 2,728 |
| Closures with shared environments | 11,173 | 4,432 |
| Functions | 6,962 | 3,034 |
| Functions with local parameters | 10,897 | 4,357 |
| Iterator cursor | 3,599 | 1,630 |
| Lexical locals | 4,012 | 1,798 |
| Iterator result objects | 13,944 | 5,448 |
| Iterable protocol binding | 10,275 | 4,197 |
| Numbers | 5,981 | 2,627 |
| Objects with atoms and strings | 14,663 | 5,859 |
| Strings only | 4,960 | 2,299 |
| Symbols | 4,995 | 2,254 |
| Well-known symbols | 5,525 | 2,448 |
| Promises | 4,840 | 2,237 |
| Weak collections | 2,051 | 1,001 |
| All capabilities | 46,099 | 15,569 |

The harness now instantiates every built artifact and invokes the export for
each claimed capability. This corrected an older exception row that enabled
the Cargo feature but accidentally ran only `Core`, allowing LTO to discard
the handler implementation, and an “all” row that omitted exceptions. The
current exception and combined figures supersede those undercounts.

The functions probe likewise executes closure creation and an indirect guest
call through `Machine`, rather than merely returning a freshly allocated
closure reference. That correction raised the honest live feature measurement
from 1,916 to 6,869 bytes at that checkpoint; the smaller result was mostly an
LTO artifact.
The parameter composition additionally removes a callable from beneath its
evaluated arguments, enters a guest frame, exposes the argument through local
slot zero, and returns through that frame. Moving this path into
`microesnext-parameters` restored the functions-only artifact from 8,018 to
6,962 bytes and locals-only from 4,324 to 4,012 bytes. The 10,897-byte
composition is the only row that pays for both operations.
The 6,285-byte environment-cell row allocates and reads a traced shared cell
through live VM opcodes. Its arena block kind and decoder arms are feature
gated. Adding it leaves the 1,984-byte minimal, 6,962-byte functions-only, and
4,012-byte locals-only artifacts unchanged; only captured mutable bindings
will need this storage.
The 11,173-byte composed row mutates a cell through a captured reference and
returns the new value through an indirect guest call. Ten million repeated
calls that increment and read one shared capture took 1.234 seconds, or
123.38 ns/call. This includes closure dispatch, three capture loads, two cell
reads, and one cell write per call.

Two alternating invariant-loop samples measured 3.20–3.23 ns/instruction for
minimal `Core` and 3.22–3.26 with environments, functions, and locals enabled.
`Machine` measured 3.20–3.67 and 3.21–3.26 respectively; 3.67 was an isolated
minimal-process outlier. The overlapping ranges detect no unrelated hot-loop
penalty, and the raw `Core` remains structurally feature independent.
Array and object probes also execute create, set, and get instructions through
`Machine`. Low-level storage-only probes remain appropriate for collections,
promises, and weak collections because those capabilities do not yet expose VM
opcodes.

The number probe parses live `ConstF64` and `AddNumber` instructions and reads
the resulting arena value. Its 6,029-byte artifact includes floating-point
storage and promotion. With `numbers` omitted, the 1,984-byte minimal artifact
contains no floating-point implementation.

The symbol probe creates two undescribed symbols, verifies distinct identity,
and reads a description. Its 5,043-byte artifact does not link strings, atoms,
objects, or collections. Adding the feature leaves every previously measured
isolated artifact byte-for-byte unchanged.

The 5,573-byte well-known-symbol row retains a realm-local `Symbol.iterator`
identity through the arena root table. Its production dependency graph adds
neither strings nor atoms; callers that already have strings may provide the
standard description. Adding this realm capability leaves the symbol-only and
all other isolated artifacts byte-for-byte unchanged.

The iterator probes keep the 3,647-byte cursor separate from their sources.
The 10,804-byte array row executes a live value step; the 10,218-byte
collection row executes a Set value step. Enabling either adapter leaves the
other source crate out of its graph, and the original non-iterator array and
collection artifacts remain byte-for-byte unchanged.

The 13,590-byte collection-entry adapter executes a live `Map.entries()` step
and allocates its two-element pair. Adapter tags share a small central numeric
namespace, so a key/value adapter rejects an entry cursor before advancing it.
The entry build includes arrays; the key/value build excludes them and becomes
five raw bytes smaller after the tag validation was moved before mutation.

The 13,992-byte result-object row constructs and reads both a live and an
exhausted `{ value, done }` object through the source-neutral adapter boundary.
It includes ordinary objects, cached atoms, and strings, but not an iterator
cursor or either source adapter. Conversely, all three cursor rows remain
byte-for-byte unchanged. This pays the object cost only at the
ECMAScript-facing result boundary rather than in low-level iteration.

Iterative prototype lookup and prototype validation add 194 raw bytes to the
object probe. The result-object probe rises by 201 bytes because it uses the
same ordinary-object path. All non-object rows remain byte-for-byte unchanged;
this is the semantic cost required for inherited methods such as
`[Symbol.iterator]`, not a cost paid by the invariant VM.

The 10,323-byte iterable-protocol probe defines a realm-local
`[Symbol.iterator]` method on a prototype and resolves it from a descendant.
Its production graph includes objects, symbols, and realm identity, but no
functions, atoms, or strings. Callable validation can therefore compose at the
guest-call boundary without burdening data-only protocol users.

The 15,186-byte composed equality probe performs lookups with independently
boxed NaNs and independently allocated equal strings. Collection-only remains
3,333 bytes and retains its direct identity comparison. Number-only remains
6,029 bytes: the non-throwing inspection API used by equality is linked only
when the composed probe calls it.

The invariant immediate instruction adds `undefined`, `null`, and booleans to
every machine. It deliberately raises the minimal artifact by 140 bytes. All
other raw artifacts rise by 140 or 141 bytes except the atom composition,
whose linker layout rises by 174; no optional dependency entered the minimal
graph. Four alternating arithmetic-loop samples after the change measured
3.30–3.59 ns/instruction for minimal `Core` and 3.30–3.75 for the composed
`Core`; `Machine` measured 3.43–3.63 and 3.49–3.72 respectively. The ranges
overlap and show no consistent optional-capability penalty.

The probes now build in a dedicated package rather than as facade examples.
That prevents the facade's compiler dev-dependency from enabling every opcode
through Cargo feature unification. Optional opcodes are themselves gated, and
the minimal decoder rejects their bytes. Together those changes keep the
minimal artifact at 1,984 bytes while its instruction loop remains independent
of the typed capability decoder.

Lexical storage was first added directly to the invariant opcode match. That
made the minimal Wasm grow from 2,032 to 3,553 bytes even when no local opcode
was executed. Adding direct branch arms raised it again to 3,819 bytes. More
importantly, five alternating native samples showed a consistent 15–25%
slowdown in the unrelated integer loop. This failed both the size and
performance gates.

The replacement puts bottom-relative slot operations in
`microesnext-locals`, gates their typed opcodes, and handles them through the
same statically composed extension boundary as other optional capabilities.
Control flow uses that boundary too, with `microesnext-truthiness` composing
boxed-number and string coercion only when those scalar features are enabled.
The resulting live Wasm probes are 4,012 bytes for locals and 3,486 bytes for
control flow, while the minimal artifact is 1,984 bytes. Five alternating
native samples measured 3.22–3.31 ns/instruction for the minimal core and
3.23–3.37 with locals and control flow enabled; the first composed warm-up was
the sole 3.37 sample. The `Machine` ranges were 3.23–3.25 and 3.22–3.26. These
overlap, and structurally both configurations execute exactly the same
feature-free `Core` loop until an optional opcode is actually encountered.
The 9,380-byte scalar-truthiness composition executes `ToBoolean` on a boxed
NaN and an empty ordinary string. This ensures the measurement retains the
optional false-value paths rather than reporting a control-flow build that
only ever sees invariant immediates.

Ten million one-argument guest calls through the composed function/parameter
machine took 677.5 ms, or 67.75 ns/call, in the native release benchmark.
Two alternating invariant-loop samples measured 3.24–3.26 ns/instruction for
minimal `Core` and 3.22–3.28 with function arguments enabled; `Machine`
measured 3.30–3.36 and 3.20–3.36 respectively. The ranges overlap, while the
stronger structural result is that the functions-only, locals-only, and
minimal artifacts do not contain the argument-frame capability.

Ordinary `ConstString` now allocates an unrooted string and no longer creates
or populates an atom table. The 5,008-byte string row therefore excludes both
`microesnext-atoms` and `microesnext-objects`. The atom row adds retained
interning; source-level objects compose both capabilities and use the distinct
`ConstAtom` instruction for property names.

Handler state belongs to the optional `Machine` wrapper; `Core` has one layout
and one opcode loop in every feature configuration. `cargo tree -p
microesnext --no-default-features` contains neither the exception nor
suspension crate. Adding the corresponding feature links the implementation
through the VM wrapper.

Five alternating direct-loop samples after the extraction measured
3.35–3.49 ns/instruction for the minimal build and 3.36–3.45 ns/instruction
with exceptions. The overlapping ranges detect no capability cost in the
invariant arithmetic loop; they are a regression check rather than proof of
identical timing.

These are probes rather than estimates of a complete language build. They do
prove the relevant artifact property: omitted capabilities are absent from the
final Wasm, while enabled rows contain live exported calls into that crate.
Moving suspend/resume/restore out of `microesnext-vm-core` and into the optional
`microesnext-suspension` crate leaves the invariant core untouched. The
isolated live async probe is 6,503 bytes (2,805 gzip). Enabling `async` adds the crate
through the VM; disabling it also removes resume operations from the public
surface. Five alternating direct-core runs measured 3.35–3.37 ns/instruction
for the minimal build and 3.36–3.37 with `async`, detecting no dispatch-loop
cost from the optional crate.
Re-run them with:

```sh
deno run --allow-run=cargo --allow-read=target \
  tools/measure-capabilities.ts
```
