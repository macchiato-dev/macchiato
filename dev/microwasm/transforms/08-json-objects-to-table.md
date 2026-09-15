# JSON objects to a table with a header union

Convert a fenced JSON array of objects to a typed Markdown table. Columns
follow the first appearance of each property name, including properties found
only in later objects. Keys compare by decoded string value, so `"name"` and
`"\u006eame"` share a column. The first spelling becomes the header.

```json
[{"name":"Ben","score":12.50},{"name":"Ada","active":true},{}]
```

becomes:

```text
| "name" | "score" | "active" |
| --- | --- | --- |
| "Ben" | 12.50 |  |
| "Ada" |  | true |
|  |  |  |
```

Blank cells mean missing properties, not `null` or empty strings. Present
values retain their exact JSON tokens, including number spelling, escapes and
nested objects/arrays. Markdown-active bytes use decimal character references,
as in [JSON rows to table](10-json-rows-to-table.md). A nested object's duplicate
keys remain intact, but duplicate top-level keys within one row are rejected:
there is only one cell in which to put that property's value. This includes
duplicates written with different escapes. Names are not normalized or folded.

An empty array produces empty Markdown. Non-object rows are rejected. A
nonempty array consisting only of empty objects is rejected because a pipe
table cannot represent its row count with zero columns. Empty objects among
objects with properties work normally and become blank rows.

## Pattern: keep spans, not an object graph

Validate and compact the complete input with the shared JSON parser, then copy
its body to `0x3000c..0x40000`. Scan twice. The first pass builds the ordered
header union; the second fills one row of value spans and immediately emits
it. No decoded strings or per-row object trees are retained. The original
input stays untouched. Both imported functions are actual Wasm functions.

Each 16-byte column record stores key start/end and two working words. During
the first pass one working word records the last row that supplied the key,
detecting duplicates. During the second pass those words are value start/end;
zero start means absent. Clear only these two words between rows, keeping the
header spans. Lookup is a linear scan of headers with early-exit string
comparison: simple and bounded, but quadratic for many distinct columns.

```text
validate and copy the compact JSON body
for each object: collect keys; reject duplicate keys within that object
emit headers and separator
for each object:
    clear the row's value spans
    scan its properties into the existing column records
    emit each value, or a blank cell when absent
```

The fixed four-page memory holds input at `0..0x10000`, output at
`0x10000..0x2c000` (112 KiB), up to 1,024 column records at
`0x2c000..0x30000`, twelve parser literal bytes, and the compact source body.
Input is at most 64 KiB and the compact body at most 65,524 bytes. The shared
parser enforces JSON syntax and a 128-container nesting limit. All capacity
failures trap; publish only successful output. Another run resets working
state, including after a trap. Do not use the shared memory concurrently.

## Module

Instantiate the number scanner as `n`, the JSON parser as `p`, and the
[key comparator](00-json-string-keys.md) as `k`, sharing `n.memory`.
Function indices: compact 0, equal 1, run 2, emit 3, escape 4, copy 5,
scan 6, lookup 7, row 8, output-row 9, clear-values 10.
Globals: output cursor 0, column count 1, pass 2 (0 collect, 1 render).

`[microwasm]`

- jo-header: `0061736d 01000000`
- jo-type-section: `01 {{size:jo-types}}`
  - jo-types: `06 60 01 7f 01 7f 60 01 7f 00 60 02 7f 7f 00 60 02 7f 7f 01 7f 60 04 7f 7f 7f 7f 01 7f 60 00 00`
- jo-import-section: `02 {{size:jo-imports}}`
  - jo-imports: `03 01 70 07 636f6d70616374 00 00 01 6b 05 657175616c 00 04 01 70 06 6d656d6f7279 02 01 04 04`
- jo-function-section: `03 {{size:jo-functions}}`
  - jo-functions: `09 00 01 01 02 03 03 04 01 05`
- jo-global-section: `06 {{size:jo-globals}}`
  - jo-globals: `03 7f 01 41 00 0b 7f 01 41 00 0b 7f 01 41 00 0b`
- jo-export-section: `07 {{size:jo-exports}}`
  - jo-exports: `02 03 72756e 00 02 06 6d656d6f7279 02 00`
- jo-code-section: `0a {{size:jo-code}}`
  - jo-code: `09`
    - jo-run-record: `{{size:jo-run-body}}`
      - jo-run-body: `01 05 7f`
        - jo-validate: `20 00 10 00 41 0d 6b 21 05`
        - jo-body-bound: `20 05 41 02 49 20 05 41 f4ff03 4b 72 04 40 00 0b`
        - jo-scratch: `41 8c800c 41 888004 20 05 fc 0a 00 00`
        - jo-cursors: `41 8d800c 21 01 41 8c800c 20 05 6a 41 01 6b 21 02`
        - jo-root: `41 8c800c 2d 00 00 41 db00 47 20 02 2d 00 00 41 dd00 47 72 04 40 00 0b`
        - jo-reset: `41 808004 24 00 41 00 24 01 41 00 24 02`
        - jo-collect-exit: `02 40`
          - jo-collect-loop: `03 40`
            - jo-collect-bound: `20 01 20 02 4f 0d 01`
            - jo-collect-row-id: `20 03 41 01 6a 21 03`
            - jo-collect-row: `20 01 20 02 41 00 20 03 10 08 21 01`
            - jo-collect-last: `20 01 20 02 46 0d 01`
            - jo-collect-next: `20 01 41 01 6a 21 01 0c 00 0b 0b`
        - jo-empty: `23 01 45 04 40 20 03 04 40 00 0b 41 00 0f 0b`
        - jo-header-row: `41 01 10 09 23 01 21 04`
        - jo-rule-loop: `03 40`
          - jo-rule-cell: `41 fc00 10 03 41 20 10 03 41 2d 10 03 41 2d 10 03 41 2d 10 03 41 20 10 03`
          - jo-rule-next: `20 04 41 01 6b 22 04 0d 00 0b`
        - jo-rule-end: `41 fc00 10 03 41 0a 10 03`
        - jo-render-start: `41 01 24 02 41 8d800c 21 01`
        - jo-render-loop: `03 40`
          - jo-render-clear: `10 0a`
          - jo-render-row: `20 01 20 02 41 01 41 00 10 08 21 01 41 00 10 09`
          - jo-render-next: `20 01 20 02 49 04 40 20 01 41 01 6a 21 01 0c 01 0b 0b`
        - jo-result: `23 00 41 808004 6b 0b`
    - jo-emit-record: `{{size:jo-emit-body}}`
      - jo-emit-body: `00`
        - jo-emit-bound: `23 00 41 80800b 4f 04 40 00 0b`
        - jo-emit-byte: `23 00 20 00 3a 00 00 23 00 41 01 6a 24 00 0b`
    - jo-escape-record: `{{size:jo-escape-body}}`
      - jo-escape-body: `00`
        - jo-escape-special: `20 00 41 20 4d 20 00 41 26 46 72 20 00 41 3c 46 72 20 00 41 3e 46 72 20 00 41 fc00 46 72 20 00 41 dc00 46 72 20 00 41 e000 46 72 20 00 41 2a 46 72 20 00 41 df00 46 72 20 00 41 db00 46 72 20 00 41 dd00 46 72 04 40`
          - jo-escape-prefix: `41 26 10 03 41 23 10 03`
          - jo-escape-hundreds: `20 00 41 e400 4f 04 40 20 00 41 e400 6e 41 30 6a 10 03 0b`
          - jo-escape-tens: `20 00 41 0a 4f 04 40 20 00 41 0a 6e 41 0a 70 41 30 6a 10 03 0b`
          - jo-escape-ones: `20 00 41 0a 70 41 30 6a 10 03 41 3b 10 03`
          - jo-escape-plain: `05 20 00 10 03 0b 0b`
    - jo-copy-record: `{{size:jo-copy-body}}`
      - jo-copy-body: `00`
        - jo-copy-exit: `02 40`
          - jo-copy-loop: `03 40`
            - jo-copy-bound: `20 00 20 01 4f 0d 01`
            - jo-copy-byte: `20 00 2d 00 00 10 04`
            - jo-copy-next: `20 00 41 01 6a 21 00 0c 00 0b 0b 0b`
    - jo-scan-record: `{{size:jo-scan-body}}`
      - jo-scan-body: `01 04 7f`
        - jo-scan-start: `20 00 21 02`
        - jo-scan-exit: `02 40`
          - jo-scan-loop: `03 40`
            - jo-scan-bound: `20 02 20 01 4f 04 40 00 0b`
            - jo-scan-byte: `20 02 2d 00 00 21 05`
            - jo-scan-string: `20 04 04 40`
              - jo-scan-escape: `20 05 41 dc00 46 04 40 20 02 41 01 6a 21 02`
                - jo-scan-string-close: `05 20 05 41 22 46 04 40 41 00 21 04 0b 0b`
              - jo-scan-outside: `05`
              - jo-scan-string-open: `20 05 41 22 46 04 40 41 01 21 04`
                - jo-scan-structure: `05`
                - jo-scan-end-token: `20 03 45 20 05 41 2c 46 20 05 41 dd00 46 72 20 05 41 fd00 46 72 20 05 41 3a 46 72 71 0d 03`
                - jo-scan-open: `20 05 41 db00 46 20 05 41 fb00 46 72 04 40 20 03 41 01 6a 21 03 0b`
                - jo-scan-close: `20 05 41 dd00 46 20 05 41 fd00 46 72 04 40 20 03 41 01 6b 21 03 0b 0b 0b`
            - jo-scan-next: `20 02 41 01 6a 21 02 0c 00 0b 0b`
        - jo-scan-result: `20 02 0b`
    - jo-lookup-record: `{{size:jo-lookup-body}}`
      - jo-lookup-body: `01 02 7f`
        - jo-lookup-exit: `02 40`
          - jo-lookup-loop: `03 40`
            - jo-lookup-bound: `20 02 23 01 4f 0d 01`
            - jo-lookup-address: `41 80800b 20 02 41 04 74 6a 21 03`
            - jo-lookup-equal: `20 00 20 01 20 03 28 02 00 20 03 28 02 04 10 01 04 40 20 03 0f 0b`
            - jo-lookup-next: `20 02 41 01 6a 21 02 0c 00 0b 0b`
        - jo-lookup-capacity: `23 02 23 01 41 8008 4f 72 04 40 00 0b`
        - jo-lookup-new: `41 80800b 23 01 41 04 74 6a 21 03`
        - jo-lookup-key: `20 03 20 00 36 02 00 20 03 20 01 36 02 04`
        - jo-lookup-clear: `20 03 41 00 36 02 08 20 03 41 00 36 02 0c`
        - jo-lookup-count: `23 01 41 01 6a 24 01 20 03 0b`
    - jo-row-record: `{{size:jo-row-body}}`
      - jo-row-body: `01 04 7f`
        - jo-row-open: `20 00 2d 00 00 41 fb00 47 04 40 00 0b 20 00 41 01 6a 21 00`
        - jo-row-empty: `20 00 2d 00 00 41 fd00 46 04 40 20 00 41 01 6a 0f 0b`
        - jo-property-loop: `03 40`
          - jo-key-end: `20 00 20 01 10 06 21 04`
          - jo-value-start: `20 04 41 01 6a 21 05`
          - jo-value-end: `20 05 20 01 10 06 21 06`
          - jo-key-lookup: `20 00 20 04 10 07 21 07`
          - jo-row-render: `20 02 04 40 20 07 20 05 36 02 08 20 07 20 06 36 02 0c`
            - jo-row-collect: `05 20 07 28 02 08 20 03 46 04 40 00 0b 20 07 20 03 36 02 08 0b`
          - jo-row-end: `20 06 2d 00 00 41 fd00 46 04 40 20 06 41 01 6a 0f 0b`
          - jo-row-next: `20 06 41 01 6a 21 00 0c 00 0b 00 0b`
    - jo-output-record: `{{size:jo-output-body}}`
      - jo-output-body: `01 02 7f`
        - jo-output-open: `41 fc00 10 03`
        - jo-output-loop: `03 40`
          - jo-output-address: `41 80800b 20 01 41 04 74 6a 21 02`
          - jo-output-space: `41 20 10 03`
          - jo-output-header: `20 00 04 40 20 02 28 02 00 20 02 28 02 04 10 05`
            - jo-output-value: `05 20 02 28 02 08 04 40 20 02 28 02 08 20 02 28 02 0c 10 05 0b 0b`
          - jo-output-cell-end: `41 20 10 03 41 fc00 10 03`
          - jo-output-next: `20 01 41 01 6a 22 01 23 01 49 0d 00 0b`
        - jo-output-end: `41 0a 10 03 0b`
    - jo-clear-record: `{{size:jo-clear-body}}`
      - jo-clear-body: `01 02 7f`
        - jo-clear-loop: `03 40`
          - jo-clear-address: `41 80800b 20 00 41 04 74 6a 21 01`
          - jo-clear-words: `20 01 41 00 36 02 08 20 01 41 00 36 02 0c`
          - jo-clear-next: `20 00 41 01 6a 22 00 23 01 49 0d 00 0b 0b`

Run locals: input length 0, cursor 1, outer closing bracket 2, row ID 3,
separator counter 4, body length 5. Scan locals follow the row-array tool's
cursor/depth/string/byte pattern, adding colon and closing brace delimiters.
Lookup locals: key start/end 0/1, column index 2, record address 3. Row locals:
cursor 0, bound 1, pass 2, row ID 3, key end 4, value start/end 5/6, record 7.
