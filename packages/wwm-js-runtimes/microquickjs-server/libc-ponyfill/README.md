# libc ponyfill

These headers are the complete C-library surface used to compile the bounded
MicroQuickJS server runtime. They provide declarations and compiler types, not
a general libc implementation.

The final link does not include WASI libc. Clang's compiler builtins satisfy
the memory operations that survive optimization. WebAssembly setjmp support is
linked separately because its semantics depend on Clang's SJLJ transformation.
