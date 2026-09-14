# JavaScript-style integer parsing in bases 2 through 36

`parse(start, end, radix)` reads a UTF-8 byte span and returns a binary64 value
with JavaScript `parseInt` syntax. The span must lie in the first 64 KiB;
invalid spans trap. Empty input, no leading digits, or an invalid radix return
NaN. Input is not modified. Scratch is the shared multiword region.

The radix is already an i32, corresponding to JavaScript's `ToInt32` step.
There is no object-to-string coercion in this byte interface. Radix zero
means decimal unless a `0x`/`0X` prefix selects hexadecimal. Explicit radix 16
also accepts that prefix. Other bases do not strip it. `0b` and `0o` are not
prefixes for `parseInt`; leading zero does not imply octal.

Leading ECMAScript whitespace and an optional `+` or `-` are accepted. Parsing
stops at the first invalid digit, including a decimal point, underscore or
whitespace after digits. Uppercase and lowercase ASCII letters have the same
value. Negative zero is preserved. Overflow produces signed infinity.

The contract follows [ECMAScript parseInt](https://tc39.es/ecma262/multipage/global-object.html#sec-parseint-string-radix).
We accumulate exactly and round once, including radixes for which the standard
allows implementation approximation. Consequently a large value in an odd
radix may differ from a native engine's approximate result. Tests use exact
BigInt accumulation as the oracle there, not a requirement to copy such errors.

## Patterns: shared whitespace and one final rounding

`skip(start, end)` is exported to reuse the same leading-whitespace behavior
in other numeric entry points. It returns an offset, not a substring. Accepted
Unicode spaces are U+00A0, U+1680, U+2000..200A, U+2028/2029, U+202F, U+205F,
U+3000 and U+FEFF, plus ASCII space and U+0009..000D. U+0085, U+180E and U+200B
are not whitespace. Reads are bounded by end, including partial UTF-8 sequences.

The private `space` helper returns a byte width or zero. Invalid UTF-8 cannot
masquerade as accepted whitespace. Non-whitespace Unicode simply ends the
digit prefix; this parser is not a UTF-8 validator for the unused suffix.

```text
parse(start, end, radix):
    p = skip(start, end)
    consume optional sign
    validate radix, and strip an allowed hexadecimal prefix
    set numerator = 0, denominator = 1
    while p < end:
        digit = decode_ascii_digit(memory[p])
        if digit >= radix: break
        numerator = numerator * radix + digit
        if bit_length(numerator) > 1024: return signed infinity
        p += 1
    if no digits: return NaN
    if numerator == 0: return signed zero
    return round_ratio(sign, sticky=false)
```

Once an unsigned integer exceeds 1024 bits, no following valid digits can
bring it back into finite range. Returning infinity immediately avoids growing
the scratch value for a 64 KiB run of digits. Values near the overflow threshold
still reach the exact ratio rounder, which handles significand carry.

Imports are [multiword operations](03-multiword.md) as `b`, and
[ratio rounding](04-json-binary64.md) as `f`. Their memory must be the same.
The host passes references to Wasm exports, not native parsing callbacks.

## Module

Function imports: round 0, set 1, muladd 2, bits 3. Defined functions: space 4,
skip 5, digit 6, special 7, parse 8. Special constructs signed zero/infinity
from an exponent field. NaN is an explicit f64 constant.

`[microwasm]`

- ip-header: `0061736d 01000000`
- ip-type-section: `01 {{size:ip-types}}`
  - ip-types: `06 60 02 7f 7f 01 7c 60 02 7f 7f 00 60 03 7f 7f 7f 00 60 01 7f 01 7f 60 02 7f 7f 01 7f 60 03 7f 7f 7f 01 7c`
- ip-import-section: `02 {{size:ip-imports}}`
  - ip-imports: `05`
    - ip-import-memory: `01 66 06 6d656d6f7279 02 01 04 04`
    - ip-import-round: `01 66 05 726f756e64 00 00`
    - ip-import-set: `01 62 03 736574 00 01`
    - ip-import-muladd: `01 62 06 6d756c616464 00 02`
    - ip-import-bits: `01 62 04 62697473 00 03`
- ip-function-section: `03 {{size:ip-functions}}`
  - ip-functions: `05 04 04 03 00 05`
- ip-export-section: `07 {{size:ip-exports}}`
  - ip-exports: `03 05 7061727365 00 08 04 736b6970 00 05 06 6d656d6f7279 02 00`
- ip-code-section: `0a {{size:ip-code}}`
  - ip-code: `05`
    - ip-space-record: `{{size:ip-space-body}}`
      - ip-space-body: `01 03 7f`
        - ip-space-empty: `20 00 20 01 4f 04 40 41 00 0f 0b`
        - ip-space-byte: `20 00 2d 00 00 21 02`
        - ip-space-ascii: `20 02 41 09 6b 41 04 4d 20 02 41 20 46 72 04 40 41 01 0f 0b`
        - ip-space-two-room: `20 00 41 02 6a 20 01 4b 04 40 41 00 0f 0b`
        - ip-space-second: `20 00 2d 00 01 21 03`
        - ip-space-nbsp: `20 02 41 c201 46 20 03 41 a001 46 71 04 40 41 02 0f 0b`
        - ip-space-three-room: `20 00 41 03 6a 20 01 4b 04 40 41 00 0f 0b`
        - ip-space-third: `20 00 2d 00 02 21 04`
        - ip-space-utf8-prefix: `20 02 41 f001 71 41 e001 47 20 03 41 c001 71 41 8001 47 72 20 04 41 c001 71 41 8001 47 72 04 40 41 00 0f 0b`
        - ip-space-codepoint: `20 02 41 0f 71 41 0c 74 20 03 41 3f 71 41 06 74 72 20 04 41 3f 71 72 21 02`
        - ip-space-ogham: `20 02 41 802d 46`
        - ip-space-typographic: `20 02 41 80c000 6b 41 0a 4d 72`
        - ip-space-line-separators: `20 02 41 a8c000 6b 41 01 4d 72`
        - ip-space-narrow: `20 02 41 afc000 46 72`
        - ip-space-medium: `20 02 41 dfc000 46 72`
        - ip-space-ideographic: `20 02 41 80e000 46 72`
        - ip-space-bom: `20 02 41 fffd03 46 72`
        - ip-space-result: `04 7f 41 03 05 41 00 0b 0b`
    - ip-skip-record: `{{size:ip-skip-body}}`
      - ip-skip-body: `01 01 7f`
        - ip-skip-bounds: `20 00 20 01 4b 20 01 41 808004 4b 72 04 40 00 0b`
        - ip-skip-exit: `02 40`
          - ip-skip-loop: `03 40`
            - ip-skip-width: `20 00 20 01 10 04 22 02 45 0d 01`
            - ip-skip-next: `20 00 20 02 6a 21 00 0c 00 0b`
          - ip-skip-end: `0b`
        - ip-skip-result: `20 00 0b`
    - ip-digit-record: `{{size:ip-digit-body}}`
      - ip-digit-body: `01 01 7f`
        - ip-digit-decimal: `20 00 41 30 6b 22 01 41 09 4d 04 40 20 01 0f 0b`
        - ip-digit-letter: `20 00 41 20 72 41 e100 6b 22 01 41 19 4d 04 40 20 01 41 0a 6a 0f 0b`
        - ip-digit-invalid: `41 7f 0b`
    - ip-special-record: `{{size:ip-special-body}}`
      - ip-special-body: `00`
        - ip-special-bits: `20 00 ad 42 3f 86 20 01 ad 42 34 86 84 bf 0b`
    - ip-parse-record: `{{size:ip-parse-body}}`
      - ip-parse-body: `01 07 7f`
        - ip-parse-skip: `20 00 20 01 10 05 21 03`
        - ip-parse-empty: `20 03 20 01 46 04 40 44 000000000000f87f 0f 0b`
        - ip-parse-sign-byte: `20 03 2d 00 00 21 05`
        - ip-parse-negative: `20 05 41 2d 46 21 04`
        - ip-parse-sign: `20 04 20 05 41 2b 46 72 04 40 20 03 41 01 6a 21 03 0b`
        - ip-parse-prefix-allowed: `20 02 45 20 02 41 10 46 72 21 09`
        - ip-parse-default: `20 02 45 04 40 41 0a 21 02 0b`
        - ip-parse-radix: `20 02 41 02 6b 41 22 4b 04 40 44 000000000000f87f 0f 0b`
        - ip-parse-prefix-room: `20 09 20 03 41 02 6a 20 01 4d 71 04 40`
          - ip-parse-prefix-bytes: `20 03 2d 00 00 41 30 46 20 03 2d 00 01 41 20 72 41 f800 46 71 04 40`
            - ip-parse-hex: `41 10 21 02 20 03 41 02 6a 21 03 0b 0b`
        - ip-parse-scratch: `41 00 41 00 10 01 41 01 41 01 10 01`
        - ip-parse-exit: `02 40`
          - ip-parse-loop: `03 40`
            - ip-parse-bound: `20 03 20 01 4f 0d 01`
            - ip-parse-digit: `20 03 2d 00 00 10 06 21 06`
            - ip-parse-stop: `20 06 20 02 4f 0d 01`
            - ip-parse-accumulate: `41 00 20 02 20 06 10 02 41 01 21 07`
            - ip-parse-bits: `41 00 10 03 21 08`
            - ip-parse-overflow: `20 08 41 8008 4b 04 40 20 04 41 ff0f 10 07 0f 0b`
            - ip-parse-next: `20 03 41 01 6a 21 03 0c 00 0b`
          - ip-parse-end: `0b`
        - ip-parse-no-digits: `20 07 45 04 40 44 000000000000f87f 0f 0b`
        - ip-parse-zero: `20 08 45 04 40 20 04 41 00 10 07 0f 0b`
        - ip-parse-round: `20 04 41 00 10 00 0b`

Parse locals: start/end/radix 0..2, position 3, sign 4, byte 5, digit 6,
found-digit flag 7, bit length 8, allow-prefix flag 9. ASCII digit decoding
returns -1 for an invalid digit, making an unsigned radix comparison reject it.
