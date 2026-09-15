# TOML assignments to hierarchical Markdown data

Tool 19 reads a `toml` fenced block and emits a hierarchical data list.
The root is always `{}`. Basic/literal quoted keys and bare keys become
JSON-quoted list keys. Values include strings, Booleans, decimal integers,
decimal/exponent floats, arrays and inline tables. This includes the output
of the companion TOML writer and ordinary hand-edited assignment documents.

```toml
name = 'Ben'
location = { city = "Phoenix" }
tags = [
  "wasm", # a comment
  "Markdown",
]
```

becomes:

```text
- {}
  - "name" "Ben"
  - "location" {}
    - "city" "Phoenix"
  - "tags" []
    - "wasm"
    - "Markdown"
```

## Documented TOML data subset

Strings use the [shared TOML string reader](./00-toml-strings.md), including
four- and eight-digit scalar escapes. Plain keys permit ASCII letters,
digits, underscores and hyphens. Quoted dots remain part of a key. Duplicate
decoded keys are rejected within each table, including tables in arrays.

Decimal numbers may have a leading plus and underscores between digits.
These two decorations are removed for JSON-compatible list tokens; all
remaining digits, exponent spelling and negative zero are retained. Integers
must fit signed 64 bits. Floats are not converted to a host number. Null,
nonfinite floats, date/time values and nondecimal integers are outside this
subset and trap rather than changing type.

Arrays may cross lines, contain comments and have a trailing comma. Inline
tables follow TOML 1.0: no trailing comma or line break between entries.
An array value inside an inline table may itself span lines. LF and CRLF
work. Comments reject forbidden controls and malformed UTF-8.

Table headers, dotted assignment paths, arrays-of-table headers and
triple-quoted strings are not implemented here. Use nested inline tables
for this representation. The parser rejects such unsupported syntax; it
does not claim to read every TOML configuration file. The fence must use
exactly three backticks and `toml`, without surrounding prose.

## Pattern: nesting determines output, separators determine input

```text
write the root object marker
skip blank lines and comments
for each root assignment:
  entry(depth = 1, root output start)
  require a line ending or the end of the document
entry(depth, table output start):
  write indentation and the list item marker
  read a key; compare it with earlier direct-child keys of this table
  require '='; read value(depth)
value(depth):
  scalar: emit a JSON string or '= ' token, then newline
  array: emit '[]'; read comma-separated child values
  inline table: emit '{}'; read comma-separated child entries
```

Duplicate checking rescans previous emitted direct-child lines. Their quoted
keys are already validated, so no object tree or key table is needed. This
costs quadratic time for wide tables. The source stays in the first 64 KiB,
output in the next 128 KiB; only eight fixed fence bytes use the last page.
There are at most 128 collections including the root. Stores are bounded;
failed runs may leave partial output but reset correctly on the next call.
The host must retain the previous result on a trap, not publish partial data.

## Inside scalar: normalize only after checking each decoration

`tl-scalar-scan` stops before whitespace, comments or collection delimiters;
the caller still owns those separators. Exact true/false tokens take the
Boolean branch. Other tokens must become valid JSON numbers. A leading plus
is removed only when a digit follows. Each underscore must have digits on
both sides before it is omitted; deleting underscores blindly would accept
invalid spellings such as `1__2`.

The cleaned token is written once, then checked by the shared JSON-number
validator. A point or exponent selects the float path, preserving that text
without rounding. Otherwise accumulate the decimal magnitude in a u64,
checking before multiplication; the final bound is `2^63 - 1` for positive
numbers and `2^63` for negative numbers. No sign is applied to that magnitude,
so the asymmetric negative endpoint is representable during the check.

Array and inline-table loops intentionally differ after a comma. The array
loop accepts a closing bracket on its next iteration, allowing trailing commas.
The inline-table path requires another entry and does not admit that shortcut.
Their whitespace modes differ too: arrays allow comments/newlines between
values; inline-table separators do not. Recursive array values retain their
own mode even when they occur inside an inline table.

## Module

Imports: string-read 0 from `s`, key-equal 1 and next-unit 2 from `k`,
valid-memory 3 from `n`, and `n.memory`. Defined functions: run 4, emit 5,
prefix 6, skip 7, value 8, entry 9, key 10, scalar 11, duplicate 12,
quote-end 13, newline 14, bare-key-byte 15, whitespace 16.
Globals: output 0, source cursor 1, source end 2.

`[microwasm]`

- tl-header: `0061736d 01000000`
- tl-type-section: `01 {{size:tl-types}}`
  - tl-types: `09 60 03 7f 7f 7f 02 7f 7f 60 04 7f 7f 7f 7f 01 7f 60 03 7f 7f 7f 03 7f 7f 7f 60 02 7f 7f 01 7f 60 01 7f 01 7f 60 01 7f 00 60 02 7f 7f 00 60 00 00 60 05 7f 7f 7f 7f 7f 00`
- tl-import-section: `02 {{size:tl-imports}}`
  - tl-imports: `05 01 73 04 72656164 00 00 01 6b 05 657175616c 00 01 01 6b 04 6e657874 00 02 01 6e 0b 76616c69644d656d6f7279 00 03 01 6e 06 6d656d6f7279 02 01 04 04`
- tl-function-section: `03 {{size:tl-functions}}`
  - tl-functions: `0d 04 05 05 05 05 06 07 07 08 03 07 04 04`
- tl-global-section: `06 {{size:tl-globals}}`
  - tl-globals: `03 7f 01 41 00 0b 7f 01 41 00 0b 7f 01 41 00 0b`
- tl-export-section: `07 {{size:tl-exports}}`
  - tl-exports: `02 03 72756e 00 04 06 6d656d6f7279 02 00`
- tl-code-section: `0a {{size:tl-code}}`
  - tl-code: `0d`
    - tl-run-record: `{{size:tl-run-body}}`
      - tl-run-body: `01 03 7f`
        - tl-run-bound: `20 00 41 0b 49 20 00 41 808004 4b 72 04 40 00 0b`
        - tl-run-prefix: `03 40 20 01 2d 00 00 20 01 41 81820c 6a 2d 00 00 47 04 40 00 0b 20 01 41 01 6a 22 01 41 07 49 0d 00 0b`
        - tl-run-opening: `20 00 24 02 41 07 24 01 10 0e 23 01 21 02 20 00 21 01`
        - tl-run-trim: `02 40 03 40 20 01 45 0d 01 20 01 41 01 6b 2d 00 00 10 10 45 0d 01 20 01 41 01 6b 21 01 0c 00 0b 0b`
        - tl-run-closing-bound: `20 01 20 02 41 03 6a 49 04 40 00 0b 20 01 41 03 6b 24 02`
        - tl-run-closing: `03 40 23 02 20 03 6a 2d 00 00 41 e000 47 04 40 00 0b 20 03 41 01 6a 22 03 41 03 49 0d 00 0b`
        - tl-run-closing-line: `23 02 20 02 47 04 40 23 02 41 01 6b 2d 00 00 41 0a 47 04 40 00 0b 0b`
        - tl-run-root: `41 808004 24 00 41 00 10 06 41 fb00 10 05 41 fd00 10 05 41 0a 10 05 23 00 21 03 41 01 10 07`
        - tl-run-exit: `02 40 03 40 23 01 23 02 4f 0d 01 41 01 20 03 10 09 41 00 10 07 23 01 23 02 49 04 40 10 0e 0b 41 01 10 07 0c 00 0b 0b`
        - tl-run-result: `23 00 41 808004 6b 0b`
    - tl-emit-record: `{{size:tl-emit-body}}`
      - tl-emit-body: `00 23 00 41 80800c 4f 04 40 00 0b 23 00 20 00 3a 00 00 23 00 41 01 6a 24 00 0b`
    - tl-prefix-record: `{{size:tl-prefix-body}}`
      - tl-prefix-body: `00 02 40 03 40 20 00 45 0d 01 41 20 10 05 41 20 10 05 20 00 41 01 6b 21 00 0c 00 0b 0b 41 2d 10 05 41 20 10 05 0b`
    - tl-skip-record: `{{size:tl-skip-body}}`
      - tl-skip-body: `01 01 7f`
        - tl-skip-loop: `03 40`
          - tl-skip-bound: `23 01 23 02 4f 04 40 0f 0b`
          - tl-skip-byte: `23 01 2d 00 00 21 01`
          - tl-skip-space: `20 01 41 20 46 20 01 41 09 46 72 04 40 23 01 41 01 6a 24 01 0c 01 0b`
          - tl-skip-newline: `20 01 41 0a 46 20 01 41 0d 46 72 04 40 20 00 45 04 40 0f 0b 10 0e 0c 01 0b`
          - tl-skip-not-comment: `20 01 41 23 47 04 40 0f 0b`
          - tl-skip-comment: `02 40 03 40`
            - tl-comment-bound: `23 01 23 02 4f 0d 01 23 01 2d 00 00 21 01`
            - tl-comment-end: `20 01 41 0a 46 20 01 41 0d 46 72 0d 01`
            - tl-comment-control: `20 01 41 20 49 20 01 41 09 47 71 20 01 41 ff00 46 72 04 40 00 0b`
            - tl-comment-unicode: `20 01 41 8001 4f 04 40 23 01 23 02 41 00 10 02 1a 24 01 1a`
              - tl-comment-ascii: `05 23 01 41 01 6a 24 01 0b`
            - tl-comment-next: `0c 00 0b 0b`
          - tl-skip-next: `0c 00 0b 0b`
    - tl-value-record: `{{size:tl-value-body}}`
      - tl-value-body: `01 02 7f`
        - tl-value-bound: `23 01 23 02 4f 04 40 00 0b 23 01 2d 00 00 21 01`
        - tl-value-string: `20 01 41 22 46 20 01 41 27 46 72 04 40 23 01 23 02 23 00 10 00 24 00 24 01 41 0a 10 05 0f 0b`
        - tl-value-array: `20 01 41 db00 46 04 40`
          - tl-array-depth: `20 00 41 8001 4f 04 40 00 0b 23 01 41 01 6a 24 01 41 db00 10 05 41 dd00 10 05 41 0a 10 05 41 01 10 07`
          - tl-array-loop: `03 40`
            - tl-array-bound: `23 01 23 02 4f 04 40 00 0b`
            - tl-array-empty: `23 01 2d 00 00 41 dd00 46 04 40 23 01 41 01 6a 24 01 0f 0b`
            - tl-array-child: `20 00 41 01 6a 10 06 20 00 41 01 6a 10 08 41 01 10 07`
            - tl-array-close: `23 01 23 02 4f 04 40 00 0b 23 01 2d 00 00 41 dd00 46 04 40 23 01 41 01 6a 24 01 0f 0b`
            - tl-array-comma: `23 01 2d 00 00 41 2c 47 04 40 00 0b 23 01 41 01 6a 24 01 41 01 10 07 0c 00 0b 0b`
        - tl-value-table: `20 01 41 fb00 46 04 40`
          - tl-table-depth: `20 00 41 8001 4f 04 40 00 0b 23 01 41 01 6a 24 01 41 fb00 10 05 41 fd00 10 05 41 0a 10 05 23 00 21 02 41 00 10 07`
          - tl-table-empty: `23 01 23 02 4f 04 40 00 0b 23 01 2d 00 00 41 fd00 46 04 40 23 01 41 01 6a 24 01 0f 0b`
          - tl-table-loop: `03 40`
            - tl-table-child: `20 00 41 01 6a 20 02 10 09 41 00 10 07`
            - tl-table-close: `23 01 23 02 4f 04 40 00 0b 23 01 2d 00 00 41 fd00 46 04 40 23 01 41 01 6a 24 01 0f 0b`
            - tl-table-comma: `23 01 2d 00 00 41 2c 47 04 40 00 0b 23 01 41 01 6a 24 01 41 00 10 07 0c 00 0b 0b`
        - tl-value-scalar: `10 0b 0b`
    - tl-entry-record: `{{size:tl-entry-body}}`
      - tl-entry-body: `01 03 7f`
        - tl-entry-prefix: `23 00 21 02 20 00 10 06 23 00 21 03 10 0a 23 00 21 04`
        - tl-entry-duplicate: `20 01 20 02 20 03 20 04 20 00 10 0c`
        - tl-entry-equals: `41 00 10 07 23 01 23 02 4f 04 40 00 0b 23 01 2d 00 00 41 3d 47 04 40 00 0b 23 01 41 01 6a 24 01 41 00 10 07`
        - tl-entry-value: `41 20 10 05 20 00 10 08 0b`
    - tl-key-record: `{{size:tl-key-body}}`
      - tl-key-body: `01 02 7f`
        - tl-key-bound: `23 01 23 02 4f 04 40 00 0b 23 01 2d 00 00 21 00`
        - tl-key-quoted: `20 00 41 22 46 20 00 41 27 46 72 04 40 23 01 23 02 23 00 10 00 24 00 24 01 0f 0b`
        - tl-key-bare-start: `20 00 10 0f 45 04 40 00 0b 41 22 10 05`
        - tl-key-bare-loop: `03 40 23 01 2d 00 00 10 05 23 01 41 01 6a 24 01 23 01 23 02 4f 04 40 05 23 01 2d 00 00 10 0f 0d 01 0b 0b`
        - tl-key-close: `41 22 10 05 0b`
    - tl-scalar-record: `{{size:tl-scalar-body}}`
      - tl-scalar-body: `02 06 7f 01 7e`
        - tl-scalar-start: `23 01 21 00 23 01 21 01`
        - tl-scalar-scan: `02 40 03 40 20 01 23 02 4f 0d 01 20 01 2d 00 00 21 04 20 04 10 10 20 04 41 23 46 72 20 04 41 2c 46 72 20 04 41 dd00 46 72 20 04 41 fd00 46 72 0d 01 20 01 41 01 6a 21 01 0c 00 0b 0b`
        - tl-scalar-empty: `20 00 20 01 46 04 40 00 0b 20 01 24 01`
        - tl-scalar-true: `20 01 20 00 6b 41 04 46 04 40 20 00 28 00 00 41 f4e4d5ab06 46 21 05 0b`
        - tl-scalar-false: `20 01 20 00 6b 41 05 46 04 40 20 00 28 00 00 41 e6c2b19b07 46 20 00 2d 00 04 41 e500 46 71 21 05 0b`
        - tl-scalar-prefix: `41 3d 10 05 41 20 10 05 23 00 21 02`
        - tl-scalar-boolean: `20 05 04 40 03 40 20 00 2d 00 00 10 05 20 00 41 01 6a 22 00 20 01 49 0d 00 0b 41 0a 10 05 0f 0b`
        - tl-scalar-plus: `20 00 2d 00 00 41 2b 46 04 40 20 00 41 01 6a 21 00 20 00 20 01 4f 04 40 00 0b 20 00 2d 00 00 41 30 6b 41 09 4b 04 40 00 0b 0b 20 00 21 03`
        - tl-scalar-copy-exit: `02 40 03 40`
          - tl-scalar-copy-bound: `20 03 20 01 4f 0d 01 20 03 2d 00 00 21 04`
          - tl-scalar-underscore: `20 04 41 df00 46 04 40`
            - tl-underscore-bound: `20 03 20 00 46 20 03 41 01 6a 20 01 4f 72 04 40 00 0b`
            - tl-underscore-digits: `20 03 41 01 6b 2d 00 00 41 30 6b 41 09 4b 20 03 2d 00 01 41 30 6b 41 09 4b 72 04 40 00 0b`
            - tl-scalar-byte: `05 20 04 10 05 0b`
          - tl-scalar-copy-next: `20 03 41 01 6a 21 03 0c 00 0b 0b`
        - tl-scalar-valid: `20 02 23 00 10 03 45 04 40 00 0b 20 02 21 03`
        - tl-scalar-float-scan: `03 40 20 03 2d 00 00 21 04 20 04 41 2e 46 20 04 41 20 72 41 e500 46 72 04 40 41 0a 10 05 0f 0b 20 03 41 01 6a 22 03 23 00 49 0d 00 0b`
        - tl-scalar-sign: `20 02 2d 00 00 41 2d 46 21 05 20 02 20 05 6a 21 03`
        - tl-scalar-digits: `03 40 20 06 42 cc99b3e6cc99b3e60c 56 04 40 00 0b 20 06 42 0a 7e 20 03 2d 00 00 41 30 6b ad 7c 21 06 20 03 41 01 6a 22 03 23 00 49 0d 00 0b`
        - tl-scalar-integer-bound: `20 06 42 ffffffffffffffffff00 20 05 ad 7c 56 04 40 00 0b 41 0a 10 05 0b`
    - tl-duplicate-record: `{{size:tl-duplicate-body}}`
      - tl-duplicate-body: `01 03 7f`
        - tl-duplicate-exit: `02 40 03 40`
          - tl-duplicate-bound: `20 00 20 01 4f 0d 01 20 00 21 05`
          - tl-duplicate-line: `03 40 20 05 2d 00 00 41 0a 46 04 40 05 20 05 41 01 6a 21 05 0c 01 0b 0b`
          - tl-duplicate-indent-start: `20 00 21 06`
          - tl-duplicate-indent: `02 40 03 40 20 06 20 05 4f 0d 01 20 06 2d 00 00 41 20 47 0d 01 20 06 41 01 6a 21 06 0c 00 0b 0b`
          - tl-duplicate-child: `20 06 20 00 6b 20 04 41 02 6c 46 04 40 20 06 41 02 6a 22 06 20 05 10 0d 21 07 20 06 20 07 20 02 20 03 10 01 04 40 00 0b 0b`
          - tl-duplicate-next: `20 05 41 01 6a 21 00 0c 00 0b 0b 0b`
    - tl-quoted-record: `{{size:tl-quoted-body}}`
      - tl-quoted-body: `00 20 00 41 01 6a 21 00 03 40 20 00 20 01 4f 04 40 00 0b 20 00 2d 00 00 41 22 46 04 40 20 00 41 01 6a 0f 0b 20 00 2d 00 00 41 dc00 46 04 40 20 00 41 01 6a 21 00 0b 20 00 41 01 6a 21 00 0c 00 0b 00 0b`
    - tl-newline-record: `{{size:tl-newline-body}}`
      - tl-newline-body: `00 23 01 23 02 4f 04 40 00 0b 23 01 2d 00 00 41 0d 46 04 40 23 01 41 01 6a 24 01 0b 23 01 23 02 4f 04 40 00 0b 23 01 2d 00 00 41 0a 47 04 40 00 0b 23 01 41 01 6a 24 01 0b`
    - tl-bare-record: `{{size:tl-bare-body}}`
      - tl-bare-body: `00 20 00 41 30 6b 41 09 4d 20 00 41 20 72 41 e100 6b 41 19 4d 72 20 00 41 df00 46 72 20 00 41 2d 46 72 0b`
    - tl-whitespace-record: `{{size:tl-whitespace-body}}`
      - tl-whitespace-body: `00 20 00 41 20 46 20 00 41 09 46 72 20 00 41 0a 46 72 20 00 41 0d 46 72 0b`
- tl-data-section: `0b {{size:tl-data}}`
  - tl-data: `01 00 41 80820c 0b {{size:tl-literals}}`
    - tl-literals: `07 606060746f6d6c`

Value locals: depth 0, byte 1, table output start 2. Entry locals: depth 0,
table start 1, line start 2, key start/end 3/4. Scalar locals: source start/end
0/1, emitted token start 2, cursor 3, byte 4, Boolean/negative flag 5,
unsigned magnitude 6 (i64). Duplicate locals match the YAML reader pattern.
