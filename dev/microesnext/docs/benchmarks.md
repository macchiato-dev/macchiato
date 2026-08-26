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

## Minimal programmable runtime, 2026-08-25

The smallest artifact remains a 1,984-byte (961 gzip) interpreter kernel. A
more useful minimum composes lexical locals, boolean control flow, checked i30
subtraction and multiplication, and relational comparison. Its live probe
executes the bytecode for a factorial loop guarded by `n > 1` and verifies the
result `720`.

| Build | Wasm bytes | Gzip bytes |
| --- | ---: | ---: |
| Interpreter kernel | 1,984 | 961 |
| Minimal programmable runtime | 6,506 | 2,526 |

The arithmetic implementation lives in `microesnext-integer-operations`; a
build omitting `minimal-program` neither resolves that crate nor decodes its
opcodes. This figure is a practical capability checkpoint, while the kernel
figure remains useful for measuring the fixed interpreter mechanism itself.

## Strict equality, 2026-08-25

The identity-only strict-equality build is 2,890 bytes (1,337 gzip). Its live
probe compares tagged booleans and its dependency graph omits string and number
storage. A number-only build is 7,484 bytes (3,261 gzip); its graph contains no
string, atom, or object crate and its live probe verifies that boxed NaNs remain
unequal. Composing both scalar representations produces a 9,480-byte (3,948
gzip) artifact whose additional probe verifies separately allocated equal
strings.

`microesnext-equality` also retains SameValueZero for collection keys, but the
VM's `===` and `!==` instructions call the strict operation. This avoids the
subtle but observable mistake of treating `NaN === NaN` as true while still
sharing the scalar decoding and string-content comparison machinery.

## Short-circuit logical operations, 2026-08-25

The immediate-only `&&`/`||`/`!` composition is 3,428 bytes (1,647 gzip). Its
live probe short-circuits over a throwing right operand, verifies that the left
operand is preserved, and then negates it. Optional scalar truthiness remains
independent:

| Build | Wasm bytes | Gzip bytes |
| --- | ---: | ---: |
| Logical operations | 3,428 | 1,647 |
| Bounded numeric negation | 2,587 | 1,279 |
| Logical operations with numbers only | 7,502 | 3,268 |
| Logical operations with strings only | 7,151 | 3,096 |

The number-only dependency graph contains no string crate, and the string-only
build contains no number crate. Macro-generated crate tests exercise each side
alone and together. Adding the capability leaves both the 1,984-byte kernel and
the 6,506-byte minimal programmable runtime byte-for-byte unchanged.

## Primitive Number coercion, 2026-08-25

The standalone primitive-coercion build is 6,371 bytes (2,823 gzip). Its live
probe executes `+true` and verifies the immediate result `1`; runtime tests
also cover false, null, undefined/NaN, i30 values, and existing boxed numbers.
It contains number representation but neither arithmetic nor either negation
crate. The compiler-only unary-plus build is 5,690 bytes (2,466 gzip).

Number negation now composes the same coercion crate, making `-true`, `-null`,
and `-undefined` follow primitive JavaScript semantics. Its linked artifact is
6,912 bytes (3,050 gzip). The pre-existing i30 branch remains a direct fast
path, and the interpreter kernel, bounded-negation, promoted-operations,
and minimal-program artifacts are byte-for-byte unchanged.

## String Number coercion, 2026-08-25

The string composition is 14,599 bytes (6,608 gzip), while its compiler gate
is 6,553 bytes (2,932 gzip). The runtime parses the complete decimal shape,
signed `Infinity`, binary/octal/hex integer forms, negative zero, and the
current ECMAScript whitespace set without a temporary allocation. Power-of-two
radices retain guard and sticky bits for ties-to-even conversion rather than
repeatedly rounding a growing float. Invalid strings produce NaN.

`microesnext-decimal-to-f64` now supplies an allocation-free, `no_std`, compact
correctly-rounded conversion shared by source literals and string coercion.
It uses an exact common-input path and a 768-digit bounded fallback based on
Nigel Tao's Simple Decimal Conversion. Differential tests cover 40,000 random
decimal strings, 100,000 finite-float display round trips, long truncated
inputs, subnormal boundaries, overflow, and ties. This replaced Rust core's
larger generic parser: before the replacement the same string composition was
29,262 bytes (20,113 gzip).

Five native release runs put the common path at a median 7.5 ns per conversion,
versus 6.6 ns for `str::parse::<f64>` on this machine. The deliberately compact
fallback is much slower—about 4.04 us versus 21.5 ns—so ordinary literals avoid
it when their mantissa is exactly representable and their decimal exponent is
within ±22. Run `cargo run --release -p microesnext-decimal-speed` to reproduce
the directional comparison; it is a microbenchmark, not a cross-machine claim.

The cost remains confined to its static capability boundary. Primitive
coercion is still exactly 6,371 bytes, Number negation is still exactly 6,912
bytes, and builds without decimal literals or string coercion neither resolve
the conversion crate nor execute a dispatch branch for it.

## Division and remainder, 2026-08-25

The division-only runtime is 6,494 bytes (2,878 gzip), compared with 5,311
bytes (2,422 gzip) for number storage alone. Remainder is independently 9,311
bytes (4,240 gzip). An initial combined implementation measured 9,786 bytes
(4,363 gzip): linked measurement revealed that `%` retained a much larger
floating helper and would make `/` pay for it. The final design therefore uses
two leaf crates, two bytecode gates, and compile-time VM arms.

Compiler probes are 9,478 bytes for each isolated token family (4,401 gzip for
division and 4,402 for remainder); most of that build is their shared decimal
literal parser. Feature-graph checks prove that either compiler gate includes
`numbers` but neither integer operations nor the other quotient operation.
The existing number-operations runtime remains exactly 9,382 bytes and the
minimal runtime remains exactly 1,984 bytes.

Four alternating native runs after the split measured the invariant `Core` at
3.05–3.37 ns/instruction in the minimal build and 3.04–3.07 with division,
remainder, arrays, control flow, functions, and objects enabled. The typed
`Machine` path measured 3.05–3.22 minimal and 3.04–3.23 composed. The overlap
does not prove identical timing, but it detects no regression; more
importantly, the omitted build has neither crate nor typed match arm.

## `typeof`, 2026-08-25

The isolated runtime is 6,642 bytes (3,024 gzip), including ordinary string
storage and a live probe that checks `typeof true === "boolean"` by content.
The compiler is 6,554 bytes (2,940 gzip), only 201 raw bytes above its
string-literal build. Its optimized keyword-only unary scanner remains
separate from the mixed-operator scanner; builds omitting `typeof` preserve
their pre-existing parser paths.

The base classifier recognizes immediates, strings, ordinary objects, and
closures. Cargo weak-feature forwarding adds boxed numbers, symbols, async
closures, and Promise resolvers only when those representations coexist.
Feature-graph checks show that `typeof` alone includes neither numbers,
objects, arithmetic, atoms, nor string concatenation.

Four alternating native runs measured minimal `Core` at 3.07–3.08
ns/instruction and a broad build including `typeof` at 3.04–3.33 (one broad
outlier; the other samples were 3.04–3.05). `Machine` measured 3.06–3.07
minimal and 3.06–3.12 broad. As with the other timing gate, the structural
evidence is definitive: omitted builds have no classifier crate or opcode arm.

## Ordinary `instanceof`, 2026-08-25

The checked editor bundles contain 30–136 `instanceof` occurrences each. Its
semantic path is consequently composed from separately removable callable
objects, property lookup, and prototype traversal rather than folded into the
object representation. A callable-object artifact is 17,812 raw / 7,107 gzip
bytes; adding the operator, its interned `prototype` key, and an executed probe
is 20,311 / 7,791, an increment of 2,499 raw / 684 gzip bytes.

The standalone compiler is 5,956 raw / 2,586 gzip bytes. Its keyword-only
relational parser remains independent of numeric comparisons, while a build
containing both preserves left-associative relational order. Builds omitting
`instanceof` retain their prior specialized parser, and the objects-only Wasm
remains exactly 14,473 / 5,775.

Constructible function records are separately gated. Adding their opcode,
interned `prototype` and `constructor` keys, fixed cyclic allocation, and live
probe to callable objects produces 20,106 raw / 7,695 gzip bytes—2,294 raw /
588 gzip incremental. The compiler's constructor form is 13,264 / 5,615.
Source-to-VM tests verify the
prototype cycle and that arrows do not acquire the constructor opcode.

Ordinary instance construction is another composition rather than constructor
baseline code. Its live Wasm probe, receiver-aware call path, receiver creation,
and return selection total 27,444 raw / 9,825 gzip bytes. Its refactored
compiler slice is 15,459 / 6,311 and accepts direct calls with arguments while
being 81 raw / 115 gzip bytes smaller than the initial direct-call parser. The
source-to-VM tests exercise `this`, primitive fallback, explicit object returns,
the resulting prototype chain, member constructor lookup, and postfix access to
the selected result. Builds omitting `construction` do not decode its two
opcodes or link `microesnext-construction`; the constructor-only compiler stays
exactly 13,264 / 5,615.

The constructor-only `classes` composition uses a distinct class record while
reusing receiver frames and ordinary construction. Its live runtime is 30,301
raw / 10,377 gzip bytes and its compiler is 19,914 / 7,656. The object-only
probe remains exactly 14,473 / 5,775 and ordinary construction remains exactly
27,444 / 9,825 when class support is omitted.

The independent `class-methods` composition is 32,689 raw / 10,891 gzip bytes;
its compiler is 20,911 / 7,953. It covers method wrapping, receiver-preserving
lookup and calls, method parameters, and non-constructibility. With that feature
omitted, the constructor-only runtime remains 30,301 / 10,377 and its compiler
remains 19,914 / 7,656.

Implicit base constructors are compiler-only. Their focused build is 20,693
raw / 8,091 gzip bytes. Omitting the feature leaves the explicit constructor
compiler exactly 19,914 / 7,656 and changes no runtime artifact. The default
compiler includes this syntax without adding a runtime feature.

Static methods are another compiler-only selection over the existing method
runtime. Their focused compiler is 21,028 raw / 8,002 gzip bytes. Omitting them
leaves instance methods exactly 20,911 / 7,953. The default compiler including
static methods reuses the same runtime operations.

Anonymous class expressions add one removable operand-stack operation so the
class record can remain as the expression result while methods are installed.
The live runtime composition is 33,060 raw / 11,025 gzip bytes and its compiler
is 23,560 / 8,946. Omitting it leaves the class-method runtime exactly 32,689 /
10,891 and its compiler at 20,911 / 7,953. With expressions
included, the default compiler is 48,615 / 17,302 and the all-capability runtime
is 109,821 / 34,862.

Private identity for named constructor expressions is separately removable.
The `recursive-constructors` composition is 23,517 raw / 8,554 gzip bytes and
its compiler is 18,134 / 7,558. Its allocation-free opcode changes capture zero
from the compact recursive closure to the wrapper; declarations continue to use
their existing captured destination cell. Builds selecting ordinary recursive
functions or non-recursive constructors do not link this bridge crate.

Property-assignment statements reuse the ordinary object store behind one
independently decoded opcode. The live runtime composition is 16,352 raw /
6,302 gzip bytes; its compiler is 11,317 / 4,571. The end-to-end constructor
test passes an argument into `this.answer = value`, returns a primitive, and
reads the initialized property from the preserved receiver. Object builds that
omit this source operation do not decode its opcode.

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

## Final Wasm capability sizes, 2026-08-26

`tools/measure-capabilities.ts` builds an exported, allocator-free Wasm probe
for each capability. Every row exercises the named implementation, preventing
LTO from merely discarding an enabled but unused dependency.

| Build | Wasm bytes | Gzip bytes |
| --- | ---: | ---: |
| Minimal | 1,984 | 961 |
| Expression statements | 2,691 | 1,329 |
| Arrays | 8,768 | 3,532 |
| Array assignment expressions | 10,034 | 4,006 |
| Array iterators | 10,756 | 4,205 |
| Atoms with strings | 9,779 | 4,219 |
| Async suspension | 6,455 | 2,856 |
| Async functions | 23,191 | 8,866 |
| Collections | 3,285 | 1,507 |
| Control flow and base truthiness | 3,486 | 1,657 |
| Control flow with number/string truthiness | 8,708 | 3,736 |
| Collection iterators | 10,170 | 4,091 |
| Collection entry iterators | 13,542 | 4,979 |
| Collections with number/string equality | 14,617 | 5,655 |
| Exceptions | 3,846 | 1,761 |
| Shared environment cells | 6,285 | 2,728 |
| Captured assignment expressions | 7,186 | 3,047 |
| Guest errors | 2,520 | 1,195 |
| Closures with shared environments | 11,173 | 4,432 |
| Functions | 6,962 | 3,034 |
| Recursive functions | 10,414 | 4,044 |
| Recursive async functions | 25,797 | 9,529 |
| Functions with local parameters | 10,897 | 4,357 |
| Receiver-aware calls | 13,156 | 5,109 |
| Iterator cursor | 3,599 | 1,630 |
| Lexical locals | 4,012 | 1,798 |
| Local assignment expressions | 4,786 | 2,066 |
| Iterator result objects | 13,778 | 5,360 |
| Iterable protocol binding | 10,275 | 4,197 |
| Number representation | 5,311 | 2,422 |
| Primitive Number coercion | 6,371 | 2,823 |
| String Number coercion | 14,599 | 6,608 |
| Promoted number operations | 9,382 | 3,309 |
| Number division | 6,494 | 2,878 |
| Number remainder | 9,311 | 4,240 |
| JavaScript Number negation | 6,912 | 3,050 |
| Objects with atoms and strings | 14,473 | 5,775 |
| Property assignment | 16,352 | 6,302 |
| Property assignment expressions | 15,713 | 6,242 |
| Callable objects | 17,812 | 7,107 |
| Constructible function objects | 20,106 | 7,695 |
| Constructor receivers | 26,845 | 9,886 |
| Ordinary construction | 27,444 | 9,825 |
| Constructor-only classes | 30,301 | 10,377 |
| Classes with instance methods | 32,689 | 10,891 |
| Anonymous class expressions | 33,060 | 11,025 |
| Recursive constructors | 23,517 | 8,554 |
| Ordinary `instanceof` | 20,311 | 7,791 |
| Strings only | 4,903 | 2,270 |
| `typeof` | 6,642 | 3,024 |
| Symbols | 4,995 | 2,254 |
| Well-known symbols | 5,525 | 2,448 |
| Promises | 4,840 | 2,237 |
| Native Promise resolution | 12,664 | 5,239 |
| One-shot Promise resolvers | 20,479 | 7,910 |
| Object thenable assimilation | 34,353 | 12,618 |
| Async return thenable assimilation | 46,429 | 16,350 |
| Weak collections | 2,051 | 1,001 |
| All capabilities | 110,159 | 34,934 |

The all-capabilities row selects string concatenation, primitive and string
Number coercion, Number negation, division, remainder, `typeof`, callable
objects, and ordinary `instanceof`. The earlier 78,513-byte row was a broad
composition but omitted independently gated paths; it was therefore mislabeled
rather than a valid before/after size comparison.

The negation rows are intentionally separate. Adding unary instructions to the
existing integer and promoted-arithmetic crates initially grew the minimal
programmable runtime from 6,506 to 6,967 bytes and promoted number operations
from 9,382 to 10,413 bytes. Extracting two static capability crates restored
both baselines exactly. Bounded negation is 2,587 bytes in isolation; the
negative-zero-preserving Number composition is 6,784 bytes. Neither boundary
adds runtime dispatch to an arithmetic build that omits it.

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
The recursive-functions row executes its distinct closure constructor and
verifies that the resulting private self cell resolves back to the closure.
It statically composes functions and environments; the minimal,
functions-only, and environment-only rows remain unchanged.
The parameter composition additionally removes a callable from beneath its
evaluated arguments, enters a guest frame, exposes the argument through local
slot zero, and returns through that frame. Moving this path into
`microesnext-parameters` restored the functions-only artifact from 8,018 to
6,962 bytes and locals-only from 4,324 to 4,012 bytes. The 10,897-byte
composition is the only row that pays for both operations.
The 13,156-byte receiver row invokes a real closure with one argument and an
explicit `this`, reads that receiver through optional frame bytecode, and
returns through receiver-aware cleanup. It composes functions, parameters, and
locals, while the minimal, functions-only, and parameter rows remain unchanged.
The invariant `Core` has no receiver state or branch.
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
isolated live async probe is 6,455 bytes (2,856 gzip). Enabling `async` adds the crate
through the VM; disabling it also removes resume operations from the public
surface. Five alternating direct-core runs measured 3.35–3.37 ns/instruction
for the minimal build and 3.36–3.37 with `async`, detecting no dispatch-loop
cost from the optional crate.

The 23,191-byte (8,866 gzip) async-functions row executes async closure entry,
returns a pending outer Promise, parks an `await`, runs its queued reaction,
and verifies fulfillment. The dependency check also proves that selecting
plain `async` does not resolve `microesnext-async-functions`, while selecting
`async-functions` does not pull in environment cells, parameter frames, or
recursive-function storage. The minimal artifact remains 1,984 bytes.

The 25,797-byte (9,529 gzip) recursive-async row adds and exercises only the
composition that initializes an async closure's private self cell. Its graph
contains neither `microesnext-recursive-functions` nor parameter-frame
storage; conversely, ordinary async and ordinary recursive rows exclude
`microesnext-recursive-async-functions`.

The 12,664-byte (5,239 gzip) native-resolution row creates two Promises,
attaches an identity reaction, settles the source, forwards its queued result,
verifies the destination, and rejects self-resolution with a guest TypeError.
The isolated error value is 2,520 bytes (1,195 gzip). The 4,840-byte
Promise-storage row remains unchanged and its dependency graph excludes
`microesnext-promise-resolution`.

The 20,479-byte (7,910 gzip) resolver row invokes a compact resolving function
through guest call bytecode, handles its payload outside the invariant core,
resumes the caller with `undefined`, and verifies that the destination settles.
The 34,353-byte (12,618 gzip) thenable row additionally performs ordinary
property lookup, invokes a real guest closure with its receiver, and fulfills
through the one-shot pair. Unit tests cover deferred execution, receiver
identity, rejection before resolution, ignored throws after resolution, and a
thenable resolving to another separately scheduled thenable. Minimal,
Promise-storage, native-resolution, and receiver-only artifacts remain
byte-for-byte unchanged.

The 45,893-byte (16,224 gzip) async-thenable composition runs async closures
that return and await ordinary object thenables. Each outer Promise remains
pending until the separately queued assimilation job runs; an awaited object
settles an intermediate Promise whose reaction restores the guest
continuation. Refactoring async resolution behind its generic static policy
reduced the isolated async-functions artifact by 72 raw bytes rather than
adding dispatch overhead. The facade dependency check proves that ordinary
`async-functions` includes neither `microesnext-thenables` nor
`microesnext-async-thenables`.
Re-run them with:

```sh
deno run --allow-run=cargo --allow-read=target \
  tools/measure-capabilities.ts
```

## Prototype-chain isolation

Editor bundles make heavy use of `instanceof`: the checked generated bundles
contain 30–136 occurrences each. Its allocation-free traversal is isolated in
`microesnext-prototype-chain` before callable and constructor semantics are
added. On the current size profile, an objects probe is 14,473 raw / 5,775
gzip bytes; composing prototype traversal is 15,213 / 6,012. The incremental
cost is therefore 740 raw / 237 gzip bytes, and builds selecting only objects
do not resolve the crate.

Callable objects remain separate from both pieces. A final Wasm containing
functions and objects is 16,905 raw / 6,713 gzip bytes. Adding the wrapper
record, ordinary-property integration, call unwrapping, and its exercised
probe produces 17,812 / 7,107—an increment of 907 raw / 394 gzip bytes. The
objects-only probe remains exactly 14,473 / 5,775 after this addition; its
kind checks and two-field layout are compile-time-specialized rather than
paying a generalized branch for a feature it omitted.

## Progressive compiler artifacts

The compiler has its own final-linked Wasm probe because `.rlib` archives and
LLVM bitcode contain code that link-time optimization may discard. Each row
below instantiates the artifact and compiles a source string that exercises its
selected syntax. The shared probe includes a fixed 32 KiB bump arena in linear
memory; zero-filled linear memory does not occupy 32 KiB in the Wasm file.

| Compiler build | Wasm bytes | Gzip bytes |
| --- | ---: | ---: |
| minimal | 5,471 | 2,378 |
| control flow | 7,506 | 2,941 |
| conditional expressions | 8,060 | 3,165 |
| array literals | 6,224 | 2,677 |
| array indexing | 6,460 | 2,814 |
| array assignment expressions | 11,176 | 4,590 |
| array expression values | 8,786 | 3,705 |
| object literals | 7,779 | 3,363 |
| object expression values | 10,244 | 4,301 |
| collection literal expressions | 10,611 | 4,419 |
| constructors | 13,264 | 5,615 |
| construction | 15,459 | 6,311 |
| classes | 19,914 | 7,656 |
| class methods | 20,911 | 7,953 |
| implicit class constructors | 20,693 | 8,091 |
| static class methods | 21,028 | 8,002 |
| anonymous class expressions | 23,560 | 8,946 |
| exceptions | 7,004 | 2,947 |
| expression statements | 6,175 | 2,607 |
| logical operations | 7,293 | 3,256 |
| bounded integer operations | 6,632 | 2,728 |
| bounded numeric negation | 5,791 | 2,503 |
| decimal number literals | 9,088 | 4,254 |
| number division | 9,478 | 4,401 |
| number remainder | 9,478 | 4,402 |
| primitive Number coercion | 5,690 | 2,466 |
| string Number coercion | 6,553 | 2,932 |
| JavaScript Number negation | 6,072 | 2,597 |
| strings | 6,353 | 2,859 |
| strict string concatenation | 6,528 | 2,936 |
| `typeof` | 6,554 | 2,940 |
| `instanceof` | 5,956 | 2,586 |
| property assignment | 11,317 | 4,571 |
| locals | 8,346 | 3,519 |
| local assignment expressions | 8,823 | 3,652 |
| captured assignment expressions | 18,770 | 7,509 |
| property assignment expressions | 11,619 | 4,787 |
| basic functions | 13,184 | 5,564 |
| function arguments | 14,148 | 5,953 |
| captured environments | 17,881 | 7,430 |
| recursive named functions | 17,995 | 7,484 |
| recursive constructors | 18,134 | 7,558 |
| async functions | 14,224 | 5,936 |
| recursive async functions | 18,967 | 7,856 |
| default language slice | 48,908 | 17,390 |

Expression statements add one generic stack discard to the invariant source
compiler vocabulary. The focused runtime is 2,691 / 1,329 versus the 1,984 /
961 core, and its compiler is 6,175 / 2,607 versus 5,471 / 2,378. The runtime
dependency graph contains only `microesnext-stack-operations`; it includes no
exceptions, functions, objects, or locals. Reduced compilers leave the first
ordinary expression statement unconsumed, while existing specialized
assignment statements continue to compile without this gate.

Local assignment expressions compose the 4,012 / 1,798 locals runtime with
the removable stack operation for a 4,786 / 2,066 live artifact. Their compiler
is 8,823 / 3,652, an increment of 477 raw / 133 gzip bytes over locals alone.
Omitting the feature retains the former locals artifacts exactly and leaves
plain assignment unconsumed in expression position.

Captured assignment expressions compose the 6,285 / 2,728 environment-cell
runtime with a result-preserving store for a 7,186 / 3,047 live artifact. Their
compiler is 18,770 / 7,509 versus 17,881 / 7,430 for captured environments.
Omitting the feature removes its crate and opcode; it does not acquire the
stack-operations crate used by uncaptured assignment.

Property assignment expressions compose the 14,473 / 5,775 object runtime
with a result-preserving object store for a 15,713 / 6,242 live artifact. Their
compiler is 11,619 / 4,787. The compiler recognizes local, captured, receiver,
and nested dot targets, while the focused runtime links neither environments
nor stack operations. Omitting the feature removes its crate and opcode and
leaves ordinary object reads and literal stores unchanged.

Array indexing is compiler-only and raises the 6,224 / 2,677 literal compiler
to 6,460 / 2,814 while reusing the existing array read instruction. Result-
preserving indexed assignment composes the 8,768 / 3,532 array runtime into a
10,034 / 4,006 artifact; its compiler is 11,176 / 4,590. Omission removes the
dedicated crate and opcode and does not link objects, environments, locals, or
stack operations into the focused runtime.

Conditional expressions add 554 raw / 224 gzip bytes to the compiler over the
7,506 / 2,941 control-flow baseline, producing an 8,060 / 3,165 focused
artifact. The runtime is byte-for-byte the same control-flow machine: the
syntax reuses boolean conversion and existing conditional and unconditional
jumps. Omission leaves the token unconsumed and removes the parser and
backpatching branch.

The `literal-expressions` rows compose the ordinary expression parser with
literal storage without changing either runtime. Numeric-only array and object
compilers remain 6,224 / 2,677 and 7,779 / 3,363 respectively. Enclosing local
values cost 8,786 / 3,705 for arrays or 10,244 / 4,301 for objects; selecting
both shares enough parser code to total 10,611 / 4,419 rather than their sum.

Strict string concatenation adds 175 raw bytes and 77 gzip bytes over literal
strings. It is its own opcode and capability crate, and does not link numeric
promotion or general JavaScript coercion.

The 6,072-byte Number-negation compiler can target boxed results without the
decimal/exponent literal parser. Before that parser boundary was separated,
the same probe was 24,258 bytes (17,770 gzip). This is a compiler-only removal;
the runtime Number-negation composition still includes the representation it
needs to preserve negative zero.

The minimal row links neither lexical binding nor function/capture parsing.
The locals row adds stable slots without closures. Basic functions use
zero-argument `CallValue` and ordinary local frames; parameter parsing,
evaluated argument lists, `CallValueArguments`, and `InitFrame` are a separate
compiler capability. Neither build acquires captured environments or a
recursive constructor. Captures add environment-cell analysis; named function
expressions add only their matching synchronous or asynchronous recursive
constructor. The default row additionally retains all currently supported
structural and scalar syntax. Re-run it with:

```sh
npm run measure:compiler
```
