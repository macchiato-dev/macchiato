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
| Minimal | 1,892 | 876 |
| Arrays | 6,793 | 2,839 |
| Atoms with strings | 9,845 | 4,096 |
| Async suspension | 6,356 | 2,766 |
| Collections | 3,193 | 1,420 |
| Exceptions | 3,753 | 1,674 |
| Functions | 1,916 | 892 |
| Objects with atoms and strings | 14,751 | 5,824 |
| Strings only | 4,867 | 2,205 |
| Promises | 4,748 | 2,145 |
| Weak collections | 1,959 | 919 |
| All capabilities | 27,234 | 9,820 |

The harness now instantiates every built artifact and invokes the export for
each claimed capability. This corrected an older exception row that enabled
the Cargo feature but accidentally ran only `Core`, allowing LTO to discard
the handler implementation, and an “all” row that omitted exceptions. The
current exception and combined figures supersede those undercounts.

The probes now build in a dedicated package rather than as facade examples.
That prevents the facade's compiler dev-dependency from enabling every opcode
through Cargo feature unification. Optional opcodes are themselves gated, and
the minimal decoder rejects their bytes. Together those changes reduce the
minimal artifact to 1,892 bytes while keeping its instruction loop independent
of the typed capability decoder.

Ordinary `ConstString` now allocates an unrooted string and no longer creates
or populates an atom table. The 4,867-byte string row therefore excludes both
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
isolated live async probe is 6,356 bytes (2,766 gzip). Enabling `async` adds the crate
through the VM; disabling it also removes resume operations from the public
surface. Five alternating direct-core runs measured 3.35–3.37 ns/instruction
for the minimal build and 3.36–3.37 with `async`, detecting no dispatch-loop
cost from the optional crate.
Re-run them with:

```sh
deno run --allow-run=cargo --allow-read=target \
  tools/measure-capabilities.ts
```
