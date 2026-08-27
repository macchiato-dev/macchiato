# libc ponyfill headers

This directory currently contains headers only. Implementations and a Wasm
link step are deliberately left for later changes.

The files under `include/ponyfill/` were copied from Fedora's
`wasi-libc-devel-32-1.fc43` package. Their installed source paths begin at
`/usr/wasm32-wasi/include/wasm32-wasi/`; the corresponding upstream project is
[WebAssembly/wasi-libc](https://github.com/WebAssembly/wasi-libc). The original
directory structure is retained below `ponyfill/`, and internal includes were
changed to reference that explicit namespace.

The direct headers initially selected for MicroQuickJS are:

- `assert.h`
- `inttypes.h`
- `math.h`
- `setjmp.h`
- `stdint.h`
- `stdio.h`
- `stdlib.h`
- `string.h`

The remaining copied headers are the transitive declarations used by that
set. Each header is being reduced to the declarations in [REQUIRED.md](REQUIRED.md).
`stdarg.h` and `stddef.h` remain compiler-provided headers and therefore are
not vendored here.

The unmodified wasi-libc license texts are included alongside this file.
