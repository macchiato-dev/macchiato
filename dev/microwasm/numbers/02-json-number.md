# Strict JSON number syntax

This is the lexical part of JSON number parsing. `valid(start, end)` returns
one when the entire input span follows JSON's number grammar, otherwise zero.
It does not convert to binary64 or round the value. Keeping the original
decimal bytes is useful when converting structured data between formats:
`1.2300e+50` need not lose precision or be reformatted incidentally.

The span must lie in the first 64 KiB of exported memory. Empty, reversed and
out-of-bounds spans return zero. The module has four fixed memory pages so a
calling Microwasm tool can import this memory for input, output and scratch.
Both functions are byte scanners with no imports or allocations.

Accepted examples include `0`, `-0`, `123`, `-12.5`, `1e9`, `1E-9` and `1e+9`.
Rejected examples include `+1`, `01`, `.5`, `1.`, `1e`, `NaN`, `Infinity`,
hexadecimal prefixes, surrounding whitespace and separators such as `_`.
`1e9999` is valid syntax; overflow during later binary64 conversion is a
separate concern. This is not the more permissive JavaScript `parseFloat`.

## Pattern: advance over one digit run

`digits(start, end)` returns the first non-digit position or end. The caller
checks whether it advanced when at least one digit is required. This avoids
duplicating separate integer, fraction and exponent loops.

```text
digits(p, end):
    while p < end and u32(memory[p] - '0') <= 9: p += 1
    return p

valid(start, end):
    if start >= end or end > 0x10000: return 0
    p = start
    if memory[p] == '-': p += 1
    if p == end: return 0
    if memory[p] == '0': p += 1
    else:
        if memory[p] not in '1'..='9': return 0
        p = digits(p, end)
    if p < end and memory[p] == '.':
        first = p + 1; p = digits(first, end)
        if p == first: return 0
    if p < end and (memory[p] | 0x20) == 'e':
        p += 1
        if p < end and memory[p] in ['+', '-']: p += 1
        first = p; p = digits(first, end)
        if p == first: return 0
    return p == end
```

```mermaid
flowchart LR
    A[Optional minus] --> B[Zero or integer digits]
    B --> C[Optional fraction with digits]
    C --> D[Optional exponent with digits]
    D --> E[Require end of span]
```

## The module

Both functions have type `(i32, i32) -> i32`. Function 1 is `valid`; function 0
is also exported as `digits` for other parsers. `digits` is a low-level scan:
its caller must provide `0 <= start <= end <= 0x10000`. Unlike `valid`, it
does not check that precondition itself.

`[microwasm]`

- jn-header: `0061736d 01000000`
- jn-type-section: `01 {{size:jn-types}}`
  - jn-types: `01 60 02 7f 7f 01 7f`
- jn-function-section: `03 {{size:jn-functions}}`
  - jn-functions: `02 00 00`
- jn-memory-section: `05 {{size:jn-memories}}`
  - jn-memories: `01 01 04 04`
- jn-export-section: `07 {{size:jn-exports}}`
  - jn-exports: `03 05 76616c6964 00 01 06 646967697473 00 00 06 6d656d6f7279 02 00`
- jn-code-section: `0a {{size:jn-code}}`
  - jn-code: `02`
    - jn-digits-record: `{{size:jn-digits-body}}`
      - jn-digits-body: `00`
        - jn-digits-exit: `02 40`
          - jn-digits-loop: `03 40`
            - jn-digits-bound: `20 00 20 01 4f 0d 01`
            - jn-digits-byte: `20 00 2d 00 00 41 30 6b 41 09 4b 0d 01`
            - jn-digits-next: `20 00 41 01 6a 21 00 0c 00 0b`
          - jn-digits-end: `0b`
        - jn-digits-result: `20 00 0b`
    - jn-valid-record: `{{size:jn-valid-body}}`
      - jn-valid-body: `01 02 7f`
        - jn-valid-bounds: `20 00 20 01 4f 20 01 41 808004 4b 72 04 40 41 00 0f 0b`
        - jn-valid-start: `20 00 21 02`
        - jn-valid-sign: `20 02 2d 00 00 41 2d 46 04 40 20 02 41 01 6a 21 02 0b`
        - jn-valid-after-sign: `20 02 20 01 46 04 40 41 00 0f 0b`
        - jn-valid-zero: `20 02 2d 00 00 41 30 46 04 40 20 02 41 01 6a 21 02`
        - jn-valid-nonzero: `05 20 02 2d 00 00 41 31 6b 41 08 4b 04 40 41 00 0f 0b`
        - jn-valid-integer: `20 02 20 01 10 00 21 02 0b`
        - jn-fraction-room: `20 02 20 01 49 04 40`
          - jn-fraction-dot: `20 02 2d 00 00 41 2e 46 04 40`
            - jn-fraction-start: `20 02 41 01 6a 22 03 20 01 10 00 21 02`
            - jn-fraction-empty: `20 02 20 03 46 04 40 41 00 0f 0b 0b 0b`
        - jn-exponent-room: `20 02 20 01 49 04 40`
          - jn-exponent-marker: `20 02 2d 00 00 41 20 72 41 e500 46 04 40`
            - jn-exponent-next: `20 02 41 01 6a 21 02`
            - jn-exponent-sign-room: `20 02 20 01 49 04 40`
              - jn-exponent-sign-byte: `20 02 2d 00 00 21 03`
              - jn-exponent-sign: `20 03 41 2b 46 20 03 41 2d 46 72 04 40 20 02 41 01 6a 21 02 0b 0b`
            - jn-exponent-digits: `20 02 21 03 20 02 20 01 10 00 21 02`
            - jn-exponent-empty: `20 02 20 03 46 04 40 41 00 0f 0b 0b 0b`
        - jn-valid-result: `20 02 20 01 46 0b`

Validator locals are start 0, end 1, position 2, and temporary/first-digit 3.
Only bytes `0x30..0x39` are digits; there is no locale-dependent classification.
