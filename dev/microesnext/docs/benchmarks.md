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
| Minimal | 2,032 | 910 |
| Arrays | 8,816 | 3,471 |
| Array iterators | 10,804 | 4,152 |
| Atoms with strings | 10,017 | 4,148 |
| Async suspension | 6,503 | 2,805 |
| Collections | 3,333 | 1,460 |
| Collection iterators | 10,223 | 4,049 |
| Collections with number/string equality | 15,186 | 5,783 |
| Exceptions | 3,894 | 1,714 |
| Functions | 7,010 | 2,973 |
| Iterator cursor | 3,647 | 1,577 |
| Iterator result objects | 13,354 | 5,178 |
| Numbers | 6,029 | 2,565 |
| Objects with atoms and strings | 14,517 | 5,734 |
| Strings only | 5,008 | 2,243 |
| Symbols | 5,043 | 2,198 |
| Well-known symbols | 5,573 | 2,392 |
| Promises | 4,888 | 2,183 |
| Weak collections | 2,099 | 951 |
| All capabilities | 37,178 | 12,986 |

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
Array and object probes also execute create, set, and get instructions through
`Machine`. Low-level storage-only probes remain appropriate for collections,
promises, and weak collections because those capabilities do not yet expose VM
opcodes.

The number probe parses live `ConstF64` and `AddNumber` instructions and reads
the resulting arena value. Its 6,029-byte artifact includes floating-point
storage and promotion. With `numbers` omitted, the 2,032-byte minimal artifact
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
The 10,804-byte array row executes a live value step; the 10,223-byte
collection row executes a Set value step. Enabling either adapter leaves the
other source crate out of its graph, and the original non-iterator array and
collection artifacts remain byte-for-byte unchanged.

The 13,354-byte result-object row constructs and reads a live `{ value, done }`
object. It includes ordinary objects, cached atoms, and strings, but not an
iterator cursor or either source adapter. Conversely, all three cursor rows
remain byte-for-byte unchanged. This pays the object cost only at the
ECMAScript-facing result boundary rather than in low-level iteration.

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
minimal artifact at 2,032 bytes while its instruction loop remains independent
of the typed capability decoder.

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
