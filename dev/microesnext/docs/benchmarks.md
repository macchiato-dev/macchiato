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
