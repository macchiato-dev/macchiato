# Binary64 strings in bases 2 through 36

`format(value, radix)` writes a string at `0x10000` and returns its byte length.
Radix must be an integer from 2 through 36; other i32 values trap. This is the
numeric part of `Number.prototype.toString(radix)`, not object coercion or
the JavaScript conversion of the radix argument to an integer.

Digits are lowercase. Zero, including negative zero, is `0`. Exceptional
values are `NaN`, `Infinity` and `-Infinity`. Decimal formatting delegates to
[shortest decimal formatting](06-shortest-decimal.md). Other bases use ordinary
positional notation, with a point when needed and no radix prefix or exponent.
Output needs at most 1077 bytes, including the sign of the smallest subnormal
in base two. These strings are not JSON numbers except in radix ten.

## Pattern: stop inside the binary64 rounding interval

Represent the value and its lower/upper rounding distances as exact integers
with a common denominator. Use four [multiword slots](03-multiword.md):
numerator 0, denominator 1, lower distance 2 and upper distance 3.

Normally the distances are equal. At a normal power of two above the smallest
normal binade, the lower distance is half the upper one. Midpoint endpoints
belong to the value only if its binary significand is even. Both distinctions
matter; one symmetric epsilon cannot replace them.

Normalize the ratio to one leading radix digit, then extract each digit by
integer subtraction. After each digit, the remainder says where the exact
value lies between the truncated prefix and the incremented prefix. Stop as
soon as one of those prefixes is within the rounding interval. If both are,
choose the closer one; at an exact tie choose an even integer coefficient.
In an odd radix, coefficient parity is not just the last digit's parity, so
it is accumulated as `(parity * radix + digit) & 1`.

```text
format(value, radix):
    handle zero and nonfinite values; delegate finite radix ten
    decode abs(value) = significand * 2^exponent
    numerator = 4 * significand; denominator = 4
    lower = 1 at an asymmetric boundary, otherwise 2; upper = 2
    scale numerator and distances, or denominator, by the binary exponent
    normalize numerator / denominator into [1, radix), recording radix order
    repeat:
        digit, remainder = divide numerator by denominator
        append digit; update coefficient parity
        lower_ok = remainder is within lower distance of zero
        upper_ok = denominator - remainder is within upper distance of zero
        include equality only for an even binary significand
        if either candidate is valid:
            choose the valid candidate, or nearest/even if both are valid
            propagate an increment through radix-1 digits if needed
            break
        multiply remainder and both distances by radix
    remove trailing coefficient zeros
    render sign, leading or trailing zeros, and the radix point
```

The high-bound test temporarily subtracts the remainder from the denominator,
then restores it with exact addition. No fifth large-integer slot is needed.
Each extracted digit is below the radix, so repeated subtraction needs at
most 35 subtractions. Significant-digit generation is capped at 64 iterations
as an invariant check; leading/trailing positional zeros are emitted later.

This implements the closest/even shortest-representation guideline in
[ECMAScript Number::toString](https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html#sec-numeric-types-number-tostring).
Nondecimal native-engine output may differ where implementations approximate
the conversion. Tests check the exact rounding interval and minimal precision,
rather than demanding identical approximations in every radix.

## Memory and integration

Import `b` from the multiword module and `s` from shortest decimal formatting;
they must share memory. Significant digits use `0x20000..0x20040`. Nonfinite
labels use byte-length-prefixed strings at `0x33010`, after the four arithmetic
slots and the decimal-prefix parser's `Infinity` literal. No host conversion,
logarithm, allocation, lookup-power table or floating arithmetic is involved.
The radix-ten dependency may use input space, so callers should preserve an
input document elsewhere before invoking this formatter.

## Module

Function imports: set 0, shl 1, muladd 2, cmp 3, sub 4, add 5, divrem 6,
shortest 7. Helpers: emit 8, digit 9, span 10, literal 11. Format is 12.
The output cursor is private global 0 and is reset for each valid radix.

`[microwasm]`

- rf-header: `0061736d 01000000`
- rf-type-section: `01 {{size:rf-types}}`
  - rf-types: `06 60 02 7f 7f 00 60 03 7f 7f 7f 00 60 02 7f 7f 01 7f 60 01 7c 01 7f 60 01 7f 00 60 02 7c 7f 01 7f`
- rf-import-section: `02 {{size:rf-imports}}`
  - rf-imports: `09`
    - rf-import-memory: `01 62 06 6d656d6f7279 02 01 04 04`
    - rf-import-set: `01 62 03 736574 00 00`
    - rf-import-shl: `01 62 03 73686c 00 00`
    - rf-import-muladd: `01 62 06 6d756c616464 00 01`
    - rf-import-cmp: `01 62 03 636d70 00 02`
    - rf-import-sub: `01 62 03 737562 00 00`
    - rf-import-add: `01 62 03 616464 00 00`
    - rf-import-divrem: `01 62 06 64697672656d 00 02`
    - rf-import-shortest: `01 73 06 666f726d6174 00 03`
- rf-function-section: `03 {{size:rf-functions}}`
  - rf-functions: `05 04 04 00 04 05`
- rf-global-section: `06 {{size:rf-globals}}`
  - rf-globals: `01 7f 01 41 00 0b`
- rf-export-section: `07 {{size:rf-exports}}`
  - rf-exports: `02 06 666f726d6174 00 0c 06 6d656d6f7279 02 00`
- rf-code-section: `0a {{size:rf-code}}`
  - rf-code: `05`
    - rf-emit-record: `{{size:rf-emit-body}}`
      - rf-emit-body: `00`
        - rf-emit-byte: `23 00 20 00 3a 00 00`
        - rf-emit-next: `23 00 41 01 6a 24 00 0b`
    - rf-digit-record: `{{size:rf-digit-body}}`
      - rf-digit-body: `00`
        - rf-digit-char: `20 00 20 00 41 0a 49 04 7f 41 30 05 41 d700 0b 6a 10 08 0b`
    - rf-span-record: `{{size:rf-span-body}}`
      - rf-span-body: `00`
        - rf-span-exit: `02 40`
          - rf-span-loop: `03 40`
            - rf-span-bound: `20 00 20 01 4f 0d 01`
            - rf-span-digit: `41 808008 20 00 6a 2d 00 00 10 09`
            - rf-span-next: `20 00 41 01 6a 21 00 0c 00 0b`
          - rf-span-end: `0b 0b`
    - rf-literal-record: `{{size:rf-literal-body}}`
      - rf-literal-body: `01 02 7f`
        - rf-literal-length: `20 00 2d 00 00 21 01`
        - rf-literal-exit: `02 40`
          - rf-literal-loop: `03 40`
            - rf-literal-bound: `20 02 20 01 4f 0d 01`
            - rf-literal-byte: `20 00 20 02 6a 2d 00 01 10 08`
            - rf-literal-next: `20 02 41 01 6a 21 02 0c 00 0b`
          - rf-literal-end: `0b 0b`
    - rf-format-record: `{{size:rf-format-body}}`
      - rf-format-body: `02 02 7e 0e 7f`
        - rf-format-radix: `20 01 41 02 6b 41 22 4b 04 40 00 0b`
        - rf-format-output: `41 808004 24 00`
        - rf-format-raw: `20 00 bd 21 02`
        - rf-format-sign: `20 02 42 3f 88 a7 21 06`
        - rf-format-biased: `20 02 42 34 88 a7 41 ff0f 71 21 05`
        - rf-format-fraction: `20 02 42 01 42 34 86 42 01 7d 83 21 03`
        - rf-format-nonfinite: `20 05 41 ff0f 46 04 40`
          - rf-format-nan: `20 03 42 00 52 04 40 41 90e00c 10 0b`
          - rf-format-infinity: `05 20 06 04 40 41 2d 10 08 0b 41 94e00c 10 0b 0b`
          - rf-format-special-length: `23 00 41 808004 6b 0f 0b`
        - rf-format-decimal: `20 01 41 0a 46 04 40 20 00 10 07 0f 0b`
        - rf-format-normal: `20 05 04 40 20 03 42 01 42 34 86 84 21 03 20 05 41 b308 6b 21 04`
        - rf-format-subnormal: `05 41 ce77 21 04 0b`
        - rf-format-zero: `20 03 50 04 40 41 30 10 08 41 01 0f 0b`
        - rf-format-even: `20 03 42 01 83 50 21 07`
        - rf-format-high-word: `41 00 20 03 42 20 88 a7 10 00`
        - rf-format-low-word: `41 00 41 20 10 01 41 00 41 01 20 03 a7 10 02 41 00 41 02 10 01`
        - rf-format-denominator: `41 01 41 04 10 00`
        - rf-format-lower: `41 02 20 05 41 01 4b 20 03 42 01 42 34 86 51 71 04 7f 41 01 05 41 02 0b 10 00`
        - rf-format-upper: `41 03 41 02 10 00`
        - rf-format-binary-scale: `20 04 41 00 4e 04 40 41 00 20 04 10 01 41 02 20 04 10 01 41 03 20 04 10 01`
        - rf-format-denominator-scale: `05 41 01 41 00 20 04 6b 10 01 0b`
        - rf-format-normalize-large: `41 00 41 01 10 03 41 00 4e 04 40`
          - rf-format-large-exit: `02 40`
            - rf-format-large-loop: `03 40`
              - rf-format-large-multiply: `41 01 20 01 41 00 10 02`
              - rf-format-large-stop: `41 00 41 01 10 03 41 00 48 04 40 41 01 20 01 10 06 1a 0c 02 0b`
              - rf-format-large-order: `20 08 41 01 6a 21 08 0c 00 0b`
            - rf-format-large-end: `0b`
          - rf-format-normalize-small: `05`
          - rf-format-small-loop: `03 40`
            - rf-format-small-scale: `41 00 20 01 41 00 10 02 41 02 20 01 41 00 10 02 41 03 20 01 41 00 10 02`
            - rf-format-small-order: `20 08 41 01 6b 21 08`
            - rf-format-small-bound: `41 00 41 01 10 03 41 00 48 0d 00 0b 0b`
        - rf-format-digits-exit: `02 40`
          - rf-format-digits-loop: `03 40`
            - rf-format-digits-capacity: `20 09 41 c000 4f 04 40 00 0b`
            - rf-format-digit-zero: `41 00 21 0a`
            - rf-format-quotient-exit: `02 40`
              - rf-format-quotient-loop: `03 40`
                - rf-format-quotient-bound: `41 00 41 01 10 03 41 00 48 0d 01`
                - rf-format-quotient-subtract: `41 00 41 01 10 04 20 0a 41 01 6a 21 0a 0c 00 0b`
              - rf-format-quotient-end: `0b`
            - rf-format-store-digit: `41 808008 20 09 6a 20 0a 3a 00 00 20 09 41 01 6a 21 09`
            - rf-format-coefficient-parity: `20 0e 20 01 6c 20 0a 6a 41 01 71 21 0e`
            - rf-format-low-compare: `41 00 41 02 10 03 21 0b`
            - rf-format-low-good: `20 0b 41 00 48 20 0b 45 20 07 71 72 21 0c`
            - rf-format-high-distance: `41 01 41 00 10 04 41 03 41 01 10 03 21 0b 41 01 41 00 10 05`
            - rf-format-high-good: `20 0b 41 00 4a 20 0b 45 20 07 71 72 21 0d`
            - rf-format-stop: `20 0c 20 0d 72 04 40`
              - rf-format-only-up: `20 0d 20 0c 45 71 21 11`
              - rf-format-both-good: `20 0c 20 0d 71 04 40`
                - rf-format-twice-remainder: `41 00 41 01 10 01 41 00 41 01 10 03 21 0b`
                - rf-format-nearest-even: `20 0b 41 00 4a 20 0b 45 20 0e 71 72 21 11 0b`
              - rf-format-round-up: `20 11 04 40 20 09 21 0f`
                - rf-format-carry-exit: `02 40`
                  - rf-format-carry-loop: `03 40`
                    - rf-format-carry-position: `20 0f 41 01 6b 21 0f`
                    - rf-format-carry-digit: `41 808008 20 0f 6a 2d 00 00 41 01 6a 21 0a`
                    - rf-format-no-carry: `20 0a 20 01 49 04 40 41 808008 20 0f 6a 20 0a 3a 00 00 0c 02 0b`
                    - rf-format-carry-zero: `41 808008 20 0f 6a 41 00 3a 00 00`
                    - rf-format-carry-next: `20 0f 0d 00 0b`
                  - rf-format-leading-carry: `41 808008 41 01 3a 00 00 20 08 41 01 6a 21 08 0b 0b`
              - rf-format-stop-exit: `0c 02 0b`
            - rf-format-more-digits: `41 00 20 01 41 00 10 02 41 02 20 01 41 00 10 02 41 03 20 01 41 00 10 02 0c 00 0b`
          - rf-format-digits-end: `0b`
        - rf-format-trim-exit: `02 40`
          - rf-format-trim-loop: `03 40`
            - rf-format-trim-one: `20 09 41 01 4d 0d 01`
            - rf-format-trim-byte: `41 808008 20 09 6a 41 01 6b 2d 00 00 0d 01`
            - rf-format-trim-next: `20 09 41 01 6b 21 09 0c 00 0b`
          - rf-format-trim-end: `0b`
        - rf-format-sign-output: `20 06 04 40 41 2d 10 08 0b`
        - rf-format-integral-order: `20 08 41 00 4e 04 40`
          - rf-format-position: `20 08 41 01 6a 21 10`
          - rf-format-integral-digits: `20 09 20 10 4d 04 40 41 00 20 09 10 0a 20 10 20 09 6b 21 10`
            - rf-format-trailing-exit: `02 40`
              - rf-format-trailing-loop: `03 40`
                - rf-format-trailing-bound: `20 10 45 0d 01`
                - rf-format-trailing-zero: `41 30 10 08 20 10 41 01 6b 21 10 0c 00 0b`
              - rf-format-trailing-end: `0b`
            - rf-format-mixed: `05 41 00 20 10 10 0a 41 2e 10 08 20 10 20 09 10 0a 0b`
          - rf-format-fractional: `05 41 30 10 08 41 2e 10 08 41 7f 20 08 6b 21 10`
          - rf-format-leading-exit: `02 40`
            - rf-format-leading-loop: `03 40`
              - rf-format-leading-bound: `20 10 45 0d 01`
              - rf-format-leading-zero: `41 30 10 08 20 10 41 01 6b 21 10 0c 00 0b`
            - rf-format-leading-end: `0b`
          - rf-format-fractional-digits: `41 00 20 09 10 0a 0b`
        - rf-format-length: `23 00 41 808004 6b 0b`
- rf-data-section: `0b {{size:rf-data}}`
  - rf-data: `01 00 41 90e00c 0b 0d 03 4e614e 08 496e66696e697479`

Format locals: value/radix 0/1; u64 raw bits 2 and significand 3; i32 binary
exponent 4, biased exponent 5, sign 6, inclusive-endpoint flag 7, radix order
8, digit count 9, digit 10, comparison 11, lower/upper-valid flags 12/13,
coefficient parity 14, carry index 15, zero count/point position 16, round-up
flag 17. The numerator becomes a remainder after the first digit extraction.
