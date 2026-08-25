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
therefore extracted into `microesnext-vm-core`; capability opcodes return to an
out-of-line wrapper, while base bytecodes stay in a state type whose layout is
independent of Cargo features.

`core-loop-direct` runs the same 20,020,000-instruction workload directly on
that boundary. Alternating minimal and full builds produced 3.31–3.34
ns/instruction before the final out-of-line adjustment, and 3.49–3.50
ns/instruction with the core function kept out of the capability wrapper by an
inlining boundary. The minimal and full direct-core samples were effectively
identical within each configuration.

The facade-level `core-loop` still shows noisier binary-layout and return-path
variation across separately linked executables. It remains a regression gate,
not evidence that optional code affects the core dispatch loop. A future
benchmark runner should sample both configurations in one process where
possible and report distributions rather than isolated wall-clock readings.

## Final Wasm capability sizes, 2026-08-25

`tools/measure-capabilities.ts` builds an exported, allocator-free Wasm probe
for each capability. Every row exercises the named implementation, preventing
LTO from merely discarding an enabled but unused dependency.

| Build | Wasm bytes | Gzip bytes |
| --- | ---: | ---: |
| Minimal | 1,900 | 874 |
| Arrays | 6,801 | 2,835 |
| Async suspension | 6,590 | 2,807 |
| Collections | 3,201 | 1,416 |
| Exceptions | 3,734 | 1,589 |
| Functions | 1,924 | 892 |
| Objects with strings | 13,993 | 5,578 |
| Strings only | 9,110 | 3,574 |
| Promises | 4,756 | 2,144 |
| Weak collections | 1,967 | 918 |
| All capabilities | 25,873 | 9,407 |

The harness now instantiates every built artifact and invokes the export for
each claimed capability. This corrected an older exception row that enabled
the Cargo feature but accidentally ran only `Core`, allowing LTO to discard
the handler implementation, and an “all” row that omitted exceptions. The
current exception and combined figures supersede those undercounts.

The object row now exercises property insertion and lookup and includes the
string VM required for JavaScript property names. The separate string row
executes `ConstString` and atom interning through `Machine` without linking
`microesnext-objects`; its dependency graph contains no object crate. Earlier
object figures measured only direct allocation of an empty low-level object
and are not comparable to this fuller VM capability probe.

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
`microesnext-suspension` crate leaves the minimal probe at 1,900 bytes. The
live async probe is 6,590 bytes (2,807 gzip). Enabling `async` adds the crate
through the VM; disabling it also removes resume operations from the public
surface. Five alternating direct-core runs measured 3.35–3.37 ns/instruction
for the minimal build and 3.36–3.37 with `async`, detecting no dispatch-loop
cost from the optional crate.
Re-run them with:

```sh
deno run --allow-run=cargo --allow-read=target \
  tools/measure-capabilities.ts
```
