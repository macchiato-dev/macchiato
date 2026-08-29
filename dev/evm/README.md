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
  storage. The machine uses caller-owned bounded stack, memory, transient
  storage, logs, output, and trace buffers. `Workspace` is the browser's
  64 KiB profile; `WorkspaceWithCapacity<N>` selects a larger allocation-free
  profile when execution needs it.
- The optional `Host` trait supplies account balances and code, block hashes,
  and blob hashes. It reports cold account accesses, leaving state layout and
  database choice outside the VM while keeping EIP-2929 gas in the core.
- A word is four little-endian `u64` limbs. Arithmetic wraps modulo `2^256`.
- The Wasm ABI uses exported linear-memory buffers and integer lengths. JSON is
  a playground concern and does not cross the VM boundary.
- Every executed instruction may produce a compact trace record containing the
  program counter, opcode, remaining gas, stack height, and stack top.

Ethereum's executable execution-layer specification is the semantic reference:
<https://github.com/ethereum/execution-specs>. Tests should prefer official
execution-spec vectors as coverage expands.

The checked-in compact corpus currently runs 325 Cancun cases derived from
`execution-spec-tests` v5.4.0: arithmetic and bitwise operations, direct
calldata loads, `MCOPY`, memory and control flow, Keccak, and return data. Each
corpus records its source or aggregate SHA-256. Three EIP-1153 cases execute
recursive `CALL`, `CALLCODE`, and `DELEGATECALL` frames through a test host and
check their distinct transient-storage ownership. Cases that intentionally
need more than the browser ABI's default 64 KiB memory bound run in explicitly
larger caller-selected profiles.

## Layout

- `src/word.rs` — dependency-free 256-bit integer operations.
- `src/machine.rs` — execution state, gas, memory, storage, and opcodes.
- `src/wasm.rs` — a compact browser-facing ABI.
- `playground/` — static browser UI, examples, and Playwright tests.

The current standalone frame implements arithmetic, comparison and bitwise
instructions; Keccak-256; calldata, code and return-data access; bounded
memory; persistent and transient storage; control flow; logs; Cancun's
`PUSH0`, `MCOPY`, `TLOAD`, and `TSTORE`; and the environment values exposed by
the playground. Storage changes and logs roll back on `REVERT` and exceptional
termination.

With a host, account and external-code inspection, block and blob hashes,
host-backed persistent and transaction-wide transient storage, calls, contract
creation, and post-Cancun self-destruction are available. Calls and creation
use typed requests plus bounded input and return buffers; a host may recursively
invoke `Machine` for child frames. Checkpoints make host mutations, including
transient writes, commit only on successful frame termination.
Precompiles and transaction-level refund capping belong to the host. The core
calculates frame-level Cancun `SSTORE` costs and refund deltas.

## Build

```sh
PATH="$HOME/.cargo/bin:$PATH" cargo test --manifest-path dev/evm/Cargo.toml
deno run --allow-env=PATH,HOME --allow-read=. \
  --allow-write=dev/evm/playground,dev/evm/target \
  --allow-run="$HOME/.cargo/bin/cargo" dev/evm/build.js
node --test dev/evm/test/*.test.js
```

The build copies a `wasm32-unknown-unknown` `cdylib` into
`playground/evm.wasm`. At this revision it is 42,108 bytes, imports nothing,
and has SHA-256
`ee22ae1d5d33bde35b41f00bca3c78a111637025e1de256999ad68580af02458`.
The browser test recompiles the module, checks that empty import list, checks
the ABI bounds, and executes every example.

With the repository's development app plugin installed, the same files are
served at `http://evm.localhost:<port>`.

## Browser ABI

Instantiate `playground/evm.wasm`, copy bytecode and calldata into the buffers
returned by `evm_code_ptr` and `evm_calldata_ptr`, and write fourteen 32-byte
big-endian environment words at `evm_environment_ptr`. Then set whether the
frame is static and run it:

```js
const { instance } = await WebAssembly.instantiateStreaming(fetch("./evm.wasm"));
const evm = instance.exports;
const memory = new Uint8Array(evm.memory.buffer);
memory.set(code, evm.evm_code_ptr());
memory.set(calldata, evm.evm_calldata_ptr());
evm.evm_set_read_only(0);
const exit = evm.evm_run(code.length, calldata.length, 1_000_000n, 100_000);
```

The stack, trace, and output each have pointer and length exports. The remaining
scalar results are `evm_gas_left` and the signed `evm_refund` counter.
`evm_reset_storage` clears the standalone playground's persistent storage.
Lengths exceeding the two 65,536-byte input capacities return `InputLimit`
without executing an instruction.
