# Ponyfill source survey

Source revisions inspected for the first Rust memory functions:

- wasi-libc `e1655e8857fc007512004414016e2dbf65bb8a21`
  - `libc-top-half/musl/src/string/memcmp.c`
  - `libc-top-half/musl/src/string/strlen.c`
- LLVM libc `533fa84a18f6bf722c3a756d4154a3dd1a4497bd`
  - `libc/src/string/memcmp.cpp`
  - `libc/src/string/strlen.cpp`
- Rust compiler-builtins `5c5f07851b1878013ac81e129b0517feaaf8661d`
  - `compiler-builtins/src/mem/mod.rs`
  - `compiler-builtins/src/mem/impls.rs`

wasi-libc uses a byte loop for scalar `memcmp` and an aligned word-at-a-time
`strlen`, with optional wasm SIMD paths. LLVM libc routes both through reusable
memory primitives intended for target specialization. Rust compiler-builtins
uses small pointer loops for these two operations and reserves word-wise paths
for copying and filling.

The initial Rust implementations follow compiler-builtins' pointer arithmetic,
copy direction, and byte loops. They preserve wasi-libc's exact `memcmp`
result: the unsigned-byte difference at the first mismatch. Rust
compiler-builtins adds aligned word paths above a small-copy threshold, while
wasi-libc adds optional wasm SIMD paths. The initial implementation stays
scalar and allocation-free; either optimization should be justified by wasm
measurements before it replaces the readable baseline.

MicroQuickJS's `js_malloc(ctx, size, mtag)` remains the engine allocator. It is
context-bound, tags every object, cooperates with collection and compaction,
and is not replaced by a general Rust global allocator.
