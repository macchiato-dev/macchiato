# Whole-string JavaScript numeric conversion

`parse(start, end)` implements the string part of JavaScript `Number(text)`
on a UTF-8 span in the first 64 KiB. Invalid spans trap. Invalid numeric text
returns NaN, rather than accepting the numeric prefix as `parseInt` and
`parseFloat` do. No host coercion, trimming or parsing is involved.

Leading and trailing ECMAScript whitespace are allowed; an empty or all-space
string produces positive zero. Decimal syntax allows a sign, leading zeros,
`.5`, `1.`, and a complete exponent. Exact-case `Infinity` accepts a sign.
Unsigned `0x`, `0o` and `0b` prefixes select bases 16, 8 and 2. A sign before
one of those prefixes is invalid. Separators and trailing junk are invalid.
Negative decimal zero is preserved. Overflow produces signed infinity.

The input is already text: generic JavaScript object/Boolean/null coercions
and BigInt conversion are outside this byte interface. The relevant grammar
is [StringNumericLiteral](https://tc39.es/ecma262/multipage/abstract-operations.html#sec-tonumber-applied-to-the-string-type).

## Pattern: validate the whole token before numeric conversion

The scanner leaves input intact and records byte offsets. Once a valid token
ends, the shared whitespace scanner must reach the end of the entire span.
This avoids separate backward UTF-8 scanning or a trimmed copy.

```text
parse(start, end):
    p = skip(start, end)
    if p == end: return +0
    consume optional sign, remembering whether one was present
    if no sign and a radix prefix is present:
        require at least one digit, all valid for that radix
        require only whitespace after those digits
        return integer_parse(digit_start, digit_end, radix)
    if the next bytes are "Infinity":
        require only whitespace afterward
        return signed infinity
    scan decimal integer and optional fractional digits
    require at least one coefficient digit
    if an exponent marker is present: require a complete exponent
    require only whitespace after the decimal token
    return decimal(token_start, token_end)
```

`p.skip` and `p.parse` come from [integer parsing](07-parse-integer.md),
`n.digits` from [the JSON scanner](02-json-number.md), and `f.decimal` from
[binary64 conversion](04-json-binary64.md). All share the same memory.
Prefixed integers are validated in full before invoking the prefix parser;
it cannot silently accept junk. Decimal conversion likewise only receives
a validated token. `Infinity` is a byte-length-prefixed literal at `0x33030`,
outside every numeric scratch region. Neither input nor output is modified.

## Module

Function imports: skip 0, digits 1, decimal 2, integer 3. Defined helpers:
digit 4, parse 5. Digit decoding uses the same ASCII ranges as integer parsing.

`[microwasm]`

- wn-header: `0061736d 01000000`
- wn-type-section: `01 {{size:wn-types}}`
  - wn-types: `04 60 02 7f 7f 01 7f 60 02 7f 7f 01 7c 60 03 7f 7f 7f 01 7c 60 01 7f 01 7f`
- wn-import-section: `02 {{size:wn-imports}}`
  - wn-imports: `05`
    - wn-import-memory: `01 66 06 6d656d6f7279 02 01 04 04`
    - wn-import-skip: `01 70 04 736b6970 00 00`
    - wn-import-digits: `01 6e 06 646967697473 00 00`
    - wn-import-decimal: `01 66 07 646563696d616c 00 01`
    - wn-import-integer: `01 70 05 7061727365 00 02`
- wn-function-section: `03 {{size:wn-functions}}`
  - wn-functions: `02 03 01`
- wn-export-section: `07 {{size:wn-exports}}`
  - wn-exports: `02 05 7061727365 00 05 06 6d656d6f7279 02 00`
- wn-code-section: `0a {{size:wn-code}}`
  - wn-code: `02`
    - wn-digit-record: `{{size:wn-digit-body}}`
      - wn-digit-body: `01 01 7f`
        - wn-digit-decimal: `20 00 41 30 6b 22 01 41 09 4d 04 40 20 01 0f 0b`
        - wn-digit-letter: `20 00 41 20 72 41 e100 6b 22 01 41 05 4d 04 40 20 01 41 0a 6a 0f 0b`
        - wn-digit-invalid: `41 7f 0b`
    - wn-parse-record: `{{size:wn-parse-body}}`
      - wn-parse-body: `01 0a 7f`
        - wn-parse-skip: `20 00 20 01 10 00 22 02 21 03`
        - wn-parse-empty: `20 02 20 01 46 04 40 44 0000000000000000 0f 0b`
        - wn-parse-sign-byte: `20 02 2d 00 00 21 04`
        - wn-parse-negative: `20 04 41 2d 46 21 06`
        - wn-parse-has-sign: `20 06 20 04 41 2b 46 72 21 05`
        - wn-parse-sign: `20 05 04 40 20 02 41 01 6a 21 02 20 06 45 04 40 20 02 21 03 0b 0b`
        - wn-prefix-room: `20 05 45 20 02 41 02 6a 20 01 4d 71 04 40`
          - wn-prefix-zero: `20 02 2d 00 00 41 30 46 04 40`
            - wn-prefix-marker: `20 02 2d 00 01 41 20 72 21 04`
            - wn-prefix-hex: `20 04 41 f800 46 04 40 41 10 21 07 0b`
            - wn-prefix-octal: `20 04 41 ef00 46 04 40 41 08 21 07 0b`
            - wn-prefix-binary: `20 04 41 e200 46 04 40 41 02 21 07 0b 0b 0b`
        - wn-prefixed: `20 07 04 40`
          - wn-prefixed-start: `20 02 41 02 6a 22 02 21 08`
          - wn-prefixed-exit: `02 40`
            - wn-prefixed-loop: `03 40`
              - wn-prefixed-bound: `20 02 20 01 4f 0d 01`
              - wn-prefixed-digit: `20 02 2d 00 00 10 04 20 07 4f 0d 01`
              - wn-prefixed-next: `20 02 41 01 6a 21 02 0c 00 0b`
            - wn-prefixed-end: `0b`
          - wn-prefixed-valid: `20 02 20 08 46 20 02 20 01 10 00 20 01 47 72 04 40 44 000000000000f87f 0f 0b`
          - wn-prefixed-result: `20 08 20 02 20 07 10 03 0f 0b`
        - wn-infinity-length: `41 b0e00c 2d 00 00 21 08`
        - wn-infinity-room: `20 02 20 08 6a 20 01 4d 04 40`
          - wn-infinity-exit: `02 40`
            - wn-infinity-loop: `03 40`
              - wn-infinity-complete: `20 0b 20 08 46 04 40`
                - wn-infinity-tail: `20 02 20 08 6a 20 01 10 00 20 01 47 04 40 44 000000000000f87f 0f 0b`
                - wn-infinity-result: `20 06 04 7c 44 000000000000f0ff 05 44 000000000000f07f 0b 0f 0b`
              - wn-infinity-byte: `20 02 20 0b 6a 2d 00 00 41 b1e00c 20 0b 6a 2d 00 00 47 0d 01`
              - wn-infinity-next: `20 0b 41 01 6a 21 0b 0c 00 0b`
            - wn-infinity-end: `0b 0b`
        - wn-integer-start: `20 02 21 09`
        - wn-integer-digits: `20 02 20 01 10 01 21 02 20 02 20 09 6b 21 0a`
        - wn-fraction-room: `20 02 20 01 49 04 40`
          - wn-fraction-point: `20 02 2d 00 00 41 2e 46 04 40`
            - wn-fraction-start: `20 02 41 01 6a 22 09 20 01 10 01 21 02`
            - wn-fraction-count: `20 0a 20 02 20 09 6b 6a 21 0a 0b 0b`
        - wn-no-digits: `20 0a 45 04 40 44 000000000000f87f 0f 0b`
        - wn-exponent-room: `20 02 20 01 49 04 40`
          - wn-exponent-marker: `20 02 2d 00 00 41 20 72 41 e500 46 04 40`
            - wn-exponent-next: `20 02 41 01 6a 21 02`
            - wn-exponent-sign-room: `20 02 20 01 49 04 40`
              - wn-exponent-sign-byte: `20 02 2d 00 00 21 04`
              - wn-exponent-sign: `20 04 41 2b 46 20 04 41 2d 46 72 04 40 20 02 41 01 6a 21 02 0b 0b`
            - wn-exponent-start: `20 02 21 09`
            - wn-exponent-digits: `20 02 20 01 10 01 21 02`
            - wn-exponent-empty: `20 02 20 09 46 04 40 44 000000000000f87f 0f 0b 0b 0b`
        - wn-decimal-tail: `20 02 20 01 10 00 20 01 47 04 40 44 000000000000f87f 0f 0b`
        - wn-decimal-result: `20 03 20 02 10 02 0b`
- wn-data-section: `0b {{size:wn-data}}`
  - wn-data: `01 00 41 b0e00c 0b 09 08 496e66696e697479`

Locals: start/end 0/1, position 2, decimal token start 3, byte 4, sign-present
flag 5, negative flag 6, prefixed radix 7, digit start/literal length 8,
digit-run start 9, coefficient digit count 10 and literal index 11.
