# Exact binary64 decimal expansion

`format(value)` writes the complete decimal value of a finite f64 at
`0x10000`, returning its byte length. Both signs of zero become `0`, as in
JSON. NaN and infinities trap before writing output. No exponent notation,
rounding, host string conversion, or parser is needed in this primitive.

This is deliberately **not** JavaScript's shortest `Number.toString()` yet.
For example, binary64 `0.1` becomes
`0.1000000000000000055511151231257827021181583404541015625`.
The exact digits provide a reference and a starting point for shortest-string
selection and explicit-precision formatting, which remain separate work.

The only dependency is [multiword arithmetic](03-multiword.md), imported as
`b`, including its memory. Slot 0 is scratch. Reversed digits occupy at most
768 bytes beginning at `0x20000`; the output needs at most 1077 bytes. The
first 64 KiB is left untouched, so a caller can copy the result there to
round-trip through the [JSON decimal parser](04-json-binary64.md).

## Pattern: turn a power-of-two denominator into decimal places

Decode the f64 into an integer significand times a power of two. Remove
trailing zero bits from the significand first. For a negative exponent, use
`1 / 2^k = 5^k / 10^k`. Repeated division by ten then produces the decimal
digits of that integer. The decimal point is a position, not another numeric
operation. For nonnegative exponents, shift the integer left instead.

```text
format(value):
    raw = reinterpret_u64(value)
    require exponent_bits(raw) != 2047
    significand, exponent = decode_binary64(raw)
    if significand == 0: return "0"
    shift = trailing_zero_bits(significand)
    significand >>>= shift
    exponent += shift
    set scratch integer to significand
    if exponent < 0:
        decimal_places = -exponent
        multiply integer by 5, decimal_places times
    else:
        shift integer left by exponent
        decimal_places = 0
    extract reversed decimal digits by repeated divrem(integer, 10)
    emit sign if negative
    emit leading "0." and fractional zeros when necessary
    walk the digits backward, inserting the decimal point at decimal_places
```

```mermaid
flowchart LR
    A[Finite binary64 bits] --> B[Odd significand times power of two]
    B --> C[Exact decimal coefficient and scale]
    C --> D[Repeated integer division]
    D --> E[Digits with decimal point and optional sign]
```

For a negative exponent the normalized coefficient is odd, and multiplication
by five cannot introduce a factor of ten. Its decimal expansion therefore has
no unnecessary trailing fractional zeros. Integral values still retain their
required zeros. The largest intermediate is well below the arithmetic layer's
8192-bit capacity.

## Module

Imports: set 0, shl 1, muladd 2, divrem 3, bits 4. Local functions: emit 5,
format 6. The mutable output pointer is private and reset on every valid call.

`[microwasm]`

- ed-header: `0061736d 01000000`
- ed-type-section: `01 {{size:ed-types}}`
  - ed-types: `06 60 02 7f 7f 00 60 03 7f 7f 7f 00 60 02 7f 7f 01 7f 60 01 7f 01 7f 60 01 7f 00 60 01 7c 01 7f`
- ed-import-section: `02 {{size:ed-imports}}`
  - ed-imports: `06`
    - ed-import-memory: `01 62 06 6d656d6f7279 02 01 04 04`
    - ed-import-set: `01 62 03 736574 00 00`
    - ed-import-shl: `01 62 03 73686c 00 00`
    - ed-import-muladd: `01 62 06 6d756c616464 00 01`
    - ed-import-divrem: `01 62 06 64697672656d 00 02`
    - ed-import-bits: `01 62 04 62697473 00 03`
- ed-function-section: `03 {{size:ed-functions}}`
  - ed-functions: `02 04 05`
- ed-global-section: `06 {{size:ed-globals}}`
  - ed-globals: `01 7f 01 41 00 0b`
- ed-export-section: `07 {{size:ed-exports}}`
  - ed-exports: `02 06 666f726d6174 00 06 06 6d656d6f7279 02 00`
- ed-code-section: `0a {{size:ed-code}}`
  - ed-code: `02`
    - ed-emit-record: `{{size:ed-emit-body}}`
      - ed-emit-body: `00`
        - ed-emit-byte: `23 00 20 00 3a 00 00`
        - ed-emit-next: `23 00 41 01 6a 24 00 0b`
    - ed-format-record: `{{size:ed-format-body}}`
      - ed-format-body: `02 02 7e 06 7f`
        - ed-format-raw: `20 00 bd 21 01`
        - ed-format-exponent: `20 01 42 34 88 a7 41 ff0f 71 21 03`
        - ed-format-finite: `20 03 41 ff0f 46 04 40 00 0b`
        - ed-format-reset: `41 808004 24 00`
        - ed-format-fraction: `20 01 42 01 42 34 86 42 01 7d 83 21 02`
        - ed-format-normal: `20 03 04 40`
          - ed-format-hidden-bit: `20 02 42 01 42 34 86 84 21 02`
          - ed-format-normal-exponent: `20 03 41 b308 6b 21 03`
          - ed-format-subnormal-exponent: `05 41 ce77 21 03 0b`
        - ed-format-zero: `20 02 50 04 40 41 30 10 05 41 01 0f 0b`
        - ed-format-negative: `20 01 42 3f 88 42 00 52 04 40 41 2d 10 05 0b`
        - ed-format-trailing-bits: `20 02 7a a7 21 08`
        - ed-format-odd-coefficient: `20 02 20 08 ad 88 21 02 20 03 20 08 6a 21 03`
        - ed-format-high-word: `41 00 20 02 42 20 88 a7 10 00`
        - ed-format-low-word: `41 00 41 20 10 01 41 00 41 01 20 02 a7 10 02`
        - ed-format-scale: `20 03 41 00 48 04 40`
          - ed-format-places: `41 00 20 03 6b 22 04 21 07`
          - ed-format-fives-loop: `03 40`
            - ed-format-five: `41 00 41 05 41 00 10 02`
            - ed-format-next-five: `20 07 41 01 6b 22 07 0d 00 0b`
          - ed-format-integral-scale: `05 41 00 20 03 10 01 0b`
        - ed-format-digits-loop: `03 40`
          - ed-format-digit: `41 808008 20 05 6a 41 00 41 0a 10 03 41 30 6a 3a 00 00`
          - ed-format-next-digit: `20 05 41 01 6a 21 05 41 00 10 04 0d 00 0b`
        - ed-format-leading: `20 05 20 04 4d 04 40`
          - ed-format-leading-point: `41 30 10 05 41 2e 10 05`
          - ed-format-zero-count: `20 04 20 05 6b 21 07`
          - ed-format-zeros-exit: `02 40`
            - ed-format-zeros-loop: `03 40`
              - ed-format-zeros-bound: `20 07 45 0d 01`
              - ed-format-one-zero: `41 30 10 05`
              - ed-format-next-zero: `20 07 41 01 6b 21 07 0c 00 0b`
            - ed-format-zeros-end: `0b 0b`
        - ed-format-reverse-start: `20 05 21 06`
        - ed-format-reverse-loop: `03 40`
          - ed-format-reverse-next: `20 06 41 01 6b 21 06`
          - ed-format-reverse-digit: `41 808008 20 06 6a 2d 00 00 10 05`
          - ed-format-point: `20 04 45 45 20 06 20 04 46 71 04 40 41 2e 10 05 0b`
          - ed-format-reverse-bound: `20 06 0d 00 0b`
        - ed-format-length: `23 00 41 808004 6b 0b`

Format locals: value 0; u64 raw bits 1 and significand 2; i32 exponent 3,
decimal places 4, digit count 5, descending digit index 6, countdown 7, and
trailing-zero count 8. No numeric operation leaves the Wasm modules.
