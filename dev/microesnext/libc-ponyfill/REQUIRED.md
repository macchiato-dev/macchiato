# Required C surface

This is a positive inventory of the C declarations consumed by the
MicroQuickJS engine. A declaration belongs in `include/ponyfill/` only when it
appears here.

Excerpted headers use `#pragma once`. Other conditional preprocessing from
the general-purpose WASI-libc headers is omitted unless this build needs it.

## Confirmed

- `assert.h`
  - `assert(expression)`
  - `__assert_fail(expression, file, line, function)`
- `string.h`
  - `memcmp(left, right, count)`
  - `memcpy(dest, src, count)`
  - `memmove(dest, src, count)`
  - `memset(dest, value, count)`
  - `strlen(string)`
  - Implemented in allocation-free Rust derived from Rust compiler-builtins'
    loops and checked against wasi-libc behavior.
- `cutils.h`
  - `pstrcpy(dest, size, source)`
  - `pstrcat(dest, size, source)`
  - `strstart(string, prefix, remainder)`
  - Implemented in allocation-free Rust behind their original C ABI.
- `stdint.h`
  - Exact-width signed and unsigned 8-, 16-, 32-, and 64-bit types
  - `intptr_t` and `uintptr_t`
  - `INT32_MIN`, `INT32_MAX`, `INT64_MAX`, and `INTPTR_MAX`
- `inttypes.h`
  - `PRIo32`
  - `PRIo64`
  - `PRIu64`
- `stdlib.h`
  - `malloc(size)` and `free(pointer)`
  - `abort()` and `exit(status)`
  - `abs(value)`
- `stdio.h`
  - `printf(format, ...)`
- Compiler headers
  - `stdarg.h`: variable-argument builtins
  - `stddef.h`: `size_t`

## Next to excerpt

- Floating-point classifications and operations.
- `jmp_buf`, `setjmp`, and `longjmp`.

`ctype.h` was tested from the first independent translation unit and removed:
the engine does not consume a character-classification declaration from it.
