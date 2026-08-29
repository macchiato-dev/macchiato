# Macchiato EVM

An allocator-free `no_std` Ethereum Virtual Machine designed to run directly
in WebAssembly and to remain understandable enough to inspect opcode by
opcode.

The implementation is under active construction. It currently targets Cancun
execution semantics for its implemented opcode set. Unsupported opcodes stop
with an explicit status; they are never silently approximated.

## Design

- The core has no allocator, libc, WASI, filesystem, clock, network, or random
  source.
- Callers provide code, calldata, environment values, gas, and persistent
  storage. The machine owns bounded stack, memory, transient storage, logs,
  output, and trace buffers.
- A word is four little-endian `u64` limbs. Arithmetic wraps modulo `2^256`.
- The Wasm ABI uses exported linear-memory buffers and integer lengths. JSON is
  a playground concern and does not cross the VM boundary.
- Every executed instruction may produce a compact trace record containing the
  program counter, opcode, remaining gas, stack height, and stack top.

Ethereum's executable execution-layer specification is the semantic reference:
<https://github.com/ethereum/execution-specs>. Tests should prefer official
execution-spec vectors as coverage expands.

## Layout

- `src/word.rs` — dependency-free 256-bit integer operations.
- `src/machine.rs` — execution state, gas, memory, storage, and opcodes.
- `src/wasm.rs` — a compact browser-facing ABI.
- `playground/` — static browser UI, examples, and Playwright tests.

## Build

```sh
PATH="$HOME/.cargo/bin:$PATH" cargo test --manifest-path dev/evm/Cargo.toml
PATH="$HOME/.cargo/bin:$PATH" cargo build --release \
  --target wasm32-unknown-unknown --manifest-path dev/evm/Cargo.toml
```
