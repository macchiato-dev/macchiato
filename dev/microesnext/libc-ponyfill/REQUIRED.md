# Required C surface

This is a positive inventory of the C declarations consumed by the
MicroQuickJS engine. A declaration belongs in `include/ponyfill/` only when it
appears here.

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
- `stdint.h`
  - Exact-width signed and unsigned 8-, 16-, 32-, and 64-bit types
  - `intptr_t` and `uintptr_t`
  - `INT32_MIN`, `INT32_MAX`, `INT64_MAX`, and `INTPTR_MAX`
- `inttypes.h`
  - `PRIo32`
  - `PRIo64`
  - `PRIu64`
- Compiler headers
  - `stdarg.h`: variable-argument builtins
  - `stddef.h`: `size_t`

## Next to excerpt

- Allocation, termination, and absolute-value functions.
- The formatting declarations retained by the selected build configuration.
- Floating-point classifications and operations.
- `jmp_buf`, `setjmp`, and `longjmp`.

`ctype.h` was tested from the first independent translation unit and removed:
the engine does not consume a character-classification declaration from it.
