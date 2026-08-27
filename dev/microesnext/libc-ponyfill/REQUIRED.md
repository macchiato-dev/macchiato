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
- Compiler headers
  - `stdarg.h`: variable-argument builtins
  - `stddef.h`: `size_t`

## Next to excerpt

- Fixed-width integer types and the five `PRI` format macros.
- Allocation, termination, and absolute-value functions.
- The formatting declarations retained by the selected build configuration.
- Floating-point classifications and operations.
- `jmp_buf`, `setjmp`, and `longjmp`.

`ctype.h` was tested from the first independent translation unit and removed:
the engine does not consume a character-classification declaration from it.
