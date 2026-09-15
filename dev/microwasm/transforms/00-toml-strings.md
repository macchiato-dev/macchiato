# TOML strings as bounded JSON-quoted spans

This executable pattern belongs to the TOML reader; it is not another tool
in the fifty-tool count. `read(start, end, output)` reads one TOML basic or
literal string and returns `(sourceAfter, outputAfter)` as two Wasm values.
The source starts at its opening quote. The exclusive end bounds the whole
available source, not necessarily just this string. The caller checks what
may follow the returned source position.

Basic strings support `\b`, `\t`, `\n`, `\f`, `\r`, `\"`, `\\`,
`\uXXXX`, and `\UXXXXXXXX`. Literal strings do not interpret backslashes.
This pattern handles single-line strings, not triple-quoted strings. Raw
controls other than tab, DEL, malformed UTF-8 and invalid Unicode escape
scalars are errors. In particular a pair of surrogate escapes is not valid
TOML: use the scalar escape `\U0001F600` or the literal character instead.

The result is a JSON-quoted token suitable for the hierarchical Markdown
notation. Literal quotes/backslashes are escaped, raw tabs become `\t`,
and Unicode escapes are converted to scalar UTF-8 (or a JSON escape for
controls). Thus source spelling may change, but string contents do not.

## Pattern: decode escapes, validate copied UTF-8 once

```text
check disjoint input and output bounds
consume the opening quote; emit a JSON opening quote
until the matching closing quote:
  raw printable byte: copy, escaping JSON punctuation as necessary
  basic-string escape:
    short escape: emit the corresponding JSON escape
    Unicode escape: read exactly 4 or 8 hex digits, validate scalar, emit
emit the JSON closing quote
iterate the complete emitted JSON string to validate its UTF-8
return the next source position and next output position
```

The input is in the first 64 KiB; output is in the following 128 KiB. The
source stays unchanged and no scratch bytes or heap allocations are needed.
Every store is bounded. A failed call may leave partial output, but the next
call resets the sole output cursor. JSON decoding and validation use the
existing Wasm string iterator, not JavaScript string conversion.

The [TOML 1.0 string rules](https://toml.io/en/v1.0.0#string) define the
accepted escape spelling. The wider language, including multiline strings,
is intentionally outside this helper. Basic and literal names use this same
operation; there is no different key-string grammar here.

## Module

Import next-unit 0 and memory from `k`. Defined functions: read 1, emit 2,
quote-byte 3, Unicode scalar 4, hex-four 5, validate 6, hex-digit 7.
Global 0 is the output cursor. All functions except `read` are private.

`[microwasm]`

- ts-header: `0061736d 01000000`
- ts-type-section: `01 {{size:ts-types}}`
  - ts-types: `05 60 03 7f 7f 7f 03 7f 7f 7f 60 03 7f 7f 7f 02 7f 7f 60 01 7f 00 60 02 7f 7f 00 60 01 7f 01 7f`
- ts-import-section: `02 {{size:ts-imports}}`
  - ts-imports: `02 01 6b 04 6e657874 00 00 01 6b 06 6d656d6f7279 02 01 04 04`
- ts-function-section: `03 {{size:ts-functions}}`
  - ts-functions: `07 01 02 02 02 02 03 04`
- ts-global-section: `06 {{size:ts-globals}}`
  - ts-globals: `01 7f 01 41 00 0b`
- ts-export-section: `07 {{size:ts-exports}}`
  - ts-exports: `02 04 72656164 00 01 06 6d656d6f7279 02 00`
- ts-code-section: `0a {{size:ts-code}}`
  - ts-code: `07`
    - ts-read-record: `{{size:ts-read-body}}`
      - ts-read-body: `01 05 7f`
        - ts-read-bounds: `20 00 20 01 4f 20 01 41 808004 4b 72 20 02 41 808004 49 72 20 02 41 80800c 4b 72 04 40 00 0b`
        - ts-read-kind: `20 00 2d 00 00 21 03 20 03 41 22 47 20 03 41 27 47 71 04 40 00 0b`
        - ts-read-open: `20 02 24 00 20 02 21 07 41 22 10 02 20 00 41 01 6a 21 00`
        - ts-read-loop: `03 40`
          - ts-read-bound: `20 00 20 01 4f 04 40 00 0b`
          - ts-read-byte: `20 00 2d 00 00 21 04 20 00 41 01 6a 21 00`
          - ts-read-close: `20 04 20 03 46 04 40 41 22 10 02 20 07 23 00 10 06 20 00 23 00 0f 0b`
          - ts-read-control: `20 04 41 20 49 20 04 41 09 47 71 20 04 41 ff00 46 72 04 40 00 0b`
          - ts-read-escape: `20 03 41 22 46 20 04 41 dc00 46 71 04 40`
            - ts-escape-bound: `20 00 20 01 4f 04 40 00 0b`
            - ts-escape-byte: `20 00 2d 00 00 21 04 20 00 41 01 6a 21 00`
            - ts-escape-unicode: `20 04 41 f500 46 20 04 41 d500 46 72 04 40`
              - ts-unicode-digits: `20 04 41 f500 46 04 7f 41 04 05 41 08 0b 21 05 41 00 21 06`
              - ts-unicode-loop: `03 40 20 00 20 01 4f 04 40 00 0b 20 06 41 04 74 20 00 2d 00 00 10 07 72 21 06 20 00 41 01 6a 21 00 20 05 41 01 6b 22 05 0d 00 0b`
              - ts-unicode-scalar: `20 06 10 04`
              - ts-escape-short: `05`
              - ts-short-valid: `20 04 41 e200 46 20 04 41 f400 46 72 20 04 41 ee00 46 72 20 04 41 e600 46 72 20 04 41 f200 46 72 20 04 41 22 46 72 20 04 41 dc00 46 72 45 04 40 00 0b`
              - ts-short-write: `41 dc00 10 02 20 04 10 02 0b`
            - ts-read-raw: `05 20 04 10 03 0b`
          - ts-read-next: `0c 00 0b 00 0b`
    - ts-emit-record: `{{size:ts-emit-body}}`
      - ts-emit-body: `00 23 00 41 80800c 4f 04 40 00 0b 23 00 20 00 3a 00 00 23 00 41 01 6a 24 00 0b`
    - ts-byte-record: `{{size:ts-byte-body}}`
      - ts-byte-body: `00`
        - ts-byte-tab: `20 00 41 09 46 04 40 41 dc00 10 02 41 f400 10 02 0f 0b`
        - ts-byte-escape: `20 00 41 22 46 20 00 41 dc00 46 72 04 40 41 dc00 10 02 0b`
        - ts-byte-copy: `20 00 10 02 0b`
    - ts-unicode-record: `{{size:ts-unicode-body}}`
      - ts-unicode-body: `00`
        - ts-unicode-bound: `20 00 41 ffffc300 4b 20 00 41 80b003 6b 41 ff0f 4d 72 04 40 00 0b`
        - ts-unicode-control: `20 00 41 20 49 20 00 41 ff00 46 72 04 40 41 dc00 10 02 41 f500 10 02 20 00 10 05 0f 0b`
        - ts-unicode-ascii: `20 00 41 8001 49 04 40 20 00 10 03 0f 0b`
        - ts-unicode-two: `20 00 41 8010 49 04 40 20 00 41 06 76 41 c001 72 10 02`
          - ts-unicode-more: `05 20 00 41 808004 49 04 40 20 00 41 0c 76 41 e001 72 10 02`
            - ts-unicode-four: `05 20 00 41 12 76 41 f001 72 10 02 20 00 41 0c 76 41 3f 71 41 8001 72 10 02 0b`
          - ts-unicode-middle: `20 00 41 06 76 41 3f 71 41 8001 72 10 02 0b`
        - ts-unicode-last: `20 00 41 3f 71 41 8001 72 10 02 0b`
    - ts-hex-record: `{{size:ts-hex-body}}`
      - ts-hex-body: `01 02 7f`
        - ts-hex-start: `41 0c 21 01`
        - ts-hex-exit: `02 40`
          - ts-hex-loop: `03 40`
            - ts-hex-digit: `20 00 20 01 76 41 0f 71 21 02`
            - ts-hex-write: `20 02 20 02 41 0a 49 04 7f 41 30 05 41 d700 0b 6a 10 02`
            - ts-hex-done: `20 01 45 0d 01`
            - ts-hex-next: `20 01 41 04 6b 21 01 0c 00 0b 0b 0b`
    - ts-validate-record: `{{size:ts-validate-body}}`
      - ts-validate-body: `01 02 7f 20 00 41 01 6a 21 00 20 01 41 01 6b 21 01 03 40 20 00 20 01 20 02 10 00 21 02 21 00 21 03 20 03 41 7f 47 0d 00 0b 0b`
    - ts-digit-record: `{{size:ts-digit-body}}`
      - ts-digit-body: `00 20 00 41 30 6b 41 09 4d 04 40 20 00 41 30 6b 0f 0b 20 00 41 20 72 41 e100 6b 22 00 41 05 4b 04 40 00 0b 20 00 41 0a 6a 0b`

Read locals: source cursor/end 0/1, output start 2, quote 3, byte 4,
remaining hex digits 5, scalar 6, emitted string start 7. Validation locals:
cursor/end 0/1, pending low surrogate 2, unit 3. Unicode arithmetic is unsigned;
even an eight-digit escape larger than `0x7fffffff` must fail the scalar bound.
