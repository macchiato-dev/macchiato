# JavaScript-style decimal prefix parsing

`parse(start, end)` implements the numeric text behavior of JavaScript's
`parseFloat` on a UTF-8 span in the first 64 KiB. Invalid spans trap; text
without a valid numeric prefix returns NaN. It shares memory with the other
numeric modules and never modifies input or output space.

Leading ECMAScript whitespace, `+`, leading zeros, `.5`, `1.`, complete
exponents, and exact-case `Infinity` are accepted. A suffix is ignored.
An incomplete exponent is not consumed: `1e+oops` yields 1. Hexadecimal and
binary/octal prefixes are not recognized: `0x10` yields zero. Negative zero
survives. This is not strict JSON or whole-string `Number()` conversion.

The syntax follows [ECMAScript parseFloat](https://tc39.es/ecma262/multipage/global-object.html#sec-parsefloat-string).
The input is already text, so object coercion belongs to a JavaScript facade,
not this byte-level interface. The host does not scan or normalize the string.

## Pattern: remember the last complete prefix

The scanner tracks the last valid end before attempting an exponent. A sign
or exponent marker is not enough: only a following digit run advances that
valid end. Consequently there is no backtracking through the coefficient.

```text
parse(start, end):
    p = skip_ecmascript_whitespace(start, end)
    remember token start, dropping an optional plus but keeping a minus
    advance p past the sign
    if the next eight bytes are "Infinity": return signed infinity
    scan integer digits
    if the next byte is '.': scan fractional digits
    if neither digit run advanced: return NaN
    valid_end = p
    if an exponent marker follows:
        consume optional exponent sign, then scan digits
        if there were exponent digits: valid_end = p
    return decimal(token_start, valid_end)
```

`f.decimal` from [binary64 conversion](04-json-binary64.md) receives this
validated prefix. It accepts a missing integer or trailing decimal point,
so no `0` insertion or token copying is necessary—even for a full 64 KiB
input. `p.skip` from [integer parsing](07-parse-integer.md) handles Unicode
whitespace, and `n.digits` from the [JSON scanner](02-json-number.md) handles
ASCII digit runs. All imports are Wasm functions using the same memory.

The sole literal is `Infinity`, stored with one unsigned-byte length at
`0x33000`. It lies after all four multiword slots, outside numeric scratch.
The matching loop uses that explicit length and does not read a terminator.

## Module

Function imports: decimal 0, skip 1, digits 2. Exported parse is function 3.
Type 0 is `(i32, i32) -> f64`; type 1 is `(i32, i32) -> i32`.

`[microwasm]`

- fp-header: `0061736d 01000000`
- fp-type-section: `01 {{size:fp-types}}`
  - fp-types: `02 60 02 7f 7f 01 7c 60 02 7f 7f 01 7f`
- fp-import-section: `02 {{size:fp-imports}}`
  - fp-imports: `04`
    - fp-import-memory: `01 66 06 6d656d6f7279 02 01 04 04`
    - fp-import-decimal: `01 66 07 646563696d616c 00 00`
    - fp-import-skip: `01 70 04 736b6970 00 01`
    - fp-import-digits: `01 6e 06 646967697473 00 01`
- fp-function-section: `03 {{size:fp-functions}}`
  - fp-functions: `01 00`
- fp-export-section: `07 {{size:fp-exports}}`
  - fp-exports: `02 05 7061727365 00 03 06 6d656d6f7279 02 00`
- fp-code-section: `0a {{size:fp-code}}`
  - fp-code: `01`
    - fp-parse-record: `{{size:fp-parse-body}}`
      - fp-parse-body: `01 09 7f`
        - fp-parse-skip: `20 00 20 01 10 01 22 03 21 02`
        - fp-parse-empty: `20 03 20 01 46 04 40 44 000000000000f87f 0f 0b`
        - fp-parse-sign-byte: `20 03 2d 00 00 21 0a`
        - fp-parse-negative: `20 0a 41 2d 46 21 08`
        - fp-parse-sign: `20 08 20 0a 41 2b 46 72 04 40 20 03 41 01 6a 21 03`
          - fp-parse-drop-plus: `20 08 45 04 40 20 03 21 02 0b 0b`
        - fp-infinity-length: `41 80e00c 2d 00 00 21 07`
        - fp-infinity-room: `20 03 20 07 6a 20 01 4d 04 40`
          - fp-infinity-exit: `02 40`
            - fp-infinity-loop: `03 40`
              - fp-infinity-complete: `20 09 20 07 46 04 40 20 08 04 7c 44 000000000000f0ff 05 44 000000000000f07f 0b 0f 0b`
              - fp-infinity-byte: `20 03 20 09 6a 2d 00 00 41 81e00c 20 09 6a 2d 00 00 47 0d 01`
              - fp-infinity-next: `20 09 41 01 6a 21 09 0c 00 0b`
            - fp-infinity-end: `0b 0b`
        - fp-integer-start: `20 03 21 04`
        - fp-integer-digits: `20 03 20 01 10 02 21 03 20 03 20 04 6b 21 05`
        - fp-fraction-room: `20 03 20 01 49 04 40`
          - fp-fraction-point: `20 03 2d 00 00 41 2e 46 04 40`
            - fp-fraction-start: `20 03 41 01 6a 22 04 20 01 10 02 21 03`
            - fp-fraction-count: `20 05 20 03 20 04 6b 6a 21 05 0b 0b`
        - fp-no-digits: `20 05 45 04 40 44 000000000000f87f 0f 0b`
        - fp-valid-prefix: `20 03 21 06`
        - fp-exponent-room: `20 03 20 01 49 04 40`
          - fp-exponent-marker: `20 03 2d 00 00 41 20 72 41 e500 46 04 40`
            - fp-exponent-next: `20 03 41 01 6a 21 03`
            - fp-exponent-sign-room: `20 03 20 01 49 04 40`
              - fp-exponent-sign-byte: `20 03 2d 00 00 21 0a`
              - fp-exponent-sign: `20 0a 41 2b 46 20 0a 41 2d 46 72 04 40 20 03 41 01 6a 21 03 0b 0b`
            - fp-exponent-start: `20 03 21 07`
            - fp-exponent-digits: `20 03 20 01 10 02 21 03`
            - fp-exponent-complete: `20 03 20 07 4b 04 40 20 03 21 06 0b 0b 0b`
        - fp-convert: `20 02 20 06 10 00 0b`
- fp-data-section: `0b {{size:fp-data}}`
  - fp-data: `01 00 41 80e00c 0b 09 08 496e66696e697479`

Locals: start/end 0/1, token start 2, position 3, digit-run start 4, digit
count 5, last valid end 6, exponent start/literal length 7, negative flag 8,
literal index 9, byte 10. The conversion only sees a complete numeric prefix.
