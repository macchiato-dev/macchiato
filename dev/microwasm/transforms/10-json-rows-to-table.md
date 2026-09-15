# JSON rows to a Markdown table

Convert a fenced JSON array of row arrays to a rectangular Markdown table.
The first row becomes the header. Each cell contains a JSON value, so a string
keeps its quotes and `"12"` stays distinct from `12`. Nested objects and arrays
are compact JSON within one cell, not extra table rows or columns.

```json
[
  ["name", "score", "metadata"],
  ["Ben", 12.50, {"active": true}],
  ["Ada", null, ["wasm", "Markdown"]]
]
```

becomes:

```text
| "name" | "score" | "metadata" |
| --- | --- | --- |
| "Ben" | 12.50 | {"active":true} |
| "Ada" | null | &#91;"wasm","Markdown"&#93; |
```

The table is a typed representation: cells are JSON source, not inferred
spreadsheet values. Number spellings, duplicate object keys and string escapes
are preserved. Markdown-active characters are escaped with decimal character
references, so pipes inside strings cannot become cell boundaries and text
like `[link](https://example.com/)` remains data. The rendered table displays
the original JSON cell text; the code view exposes the escaping.

The root must be an array and each row must be a nonempty array of equal
width. An empty outer array produces empty Markdown, because it has no header.
A single row produces a header and its separator, with no body rows. A
zero-column row is rejected: a pipe table cannot represent it unambiguously.
Arrays containing non-array rows or mismatched widths are also rejected.

Input uses the [JSON parser's fence contract](02-json-to-list.md): exactly a
triple-backtick `json` fence, LF or CRLF, and surrounding JSON whitespace.
It is caller-supplied UTF-8, at most 64 KiB. Output starts at `0x10000`, has a
128 KiB cap, and contains only a table or an empty document. Nesting is capped
at 128 containers including the outer array and row arrays. Invalid input or
capacity overflow traps; publish only a successful result. Reuse after a trap
does not require a new instance.

## Pattern: validate once, scan structural boundaries

The shared JSON parser first validates and compacts the document, without an
object tree. Copy its JSON body once to the unused final memory page, leaving
the parser's twelve literal bytes alone. This frees the full output area for
table escaping, which can expand a byte into several bytes. The original
input is untouched. A subsequent run rebuilds the scratch content.

The compact JSON body can be at most 65,524 bytes: the input has to include
its Markdown fence. Scratch begins at `0x3000c`, leaving exactly that much
space in four pages. Both the length and output stores are checked. This tool
must not share this scratch page concurrently with other transformations.

```text
validate and compact the complete fenced JSON document
copy its body to scratch; require an outer array
for each row:
    require a nonempty array
    for each cell:
        scan to the next row-level comma or closing bracket
        copy the JSON span through the Markdown cell escaper
    require the first row's width
    emit a header separator only after the first row
```

The scanner only needs nesting depth, whether it is inside a string, and
skipping the next byte after a backslash. It scans already validated JSON;
it is not an alternative JSON validator. The cell escaping is the same small
byte-wise pattern documented in [CSV to table](04-csv-to-table.md), written
here against this module's own output cursor so no callback is needed.

## Module

Instantiate the JSON-number scanner as `n`, the JSON parser using `n` as `p`,
then this module with `p`. Imports are its actual Wasm `compact` function and
four-page memory. No host conversion or JavaScript JSON parsing is used.
Function indices: compact 0, run 1, emit 2, escape-byte 3, copy-cell 4,
scan-cell 5, finish-row 6. Globals: output cursor 0, first-row width 1.

`[microwasm]`

- jt-header: `0061736d 01000000`
- jt-type-section: `01 {{size:jt-types}}`
  - jt-types: `04 60 01 7f 01 7f 60 01 7f 00 60 02 7f 7f 00 60 02 7f 7f 01 7f`
- jt-import-section: `02 {{size:jt-imports}}`
  - jt-imports: `02 01 70 07 636f6d70616374 00 00 01 70 06 6d656d6f7279 02 01 04 04`
- jt-function-section: `03 {{size:jt-functions}}`
  - jt-functions: `06 00 01 01 02 03 01`
- jt-global-section: `06 {{size:jt-globals}}`
  - jt-globals: `02 7f 01 41 00 0b 7f 01 41 00 0b`
- jt-export-section: `07 {{size:jt-exports}}`
  - jt-exports: `02 03 72756e 00 01 06 6d656d6f7279 02 00`
- jt-code-section: `0a {{size:jt-code}}`
  - jt-code: `06`
    - jt-run-record: `{{size:jt-run-body}}`
      - jt-run-body: `01 05 7f`
        - jt-run-validate: `20 00 10 00 41 0d 6b 21 05`
        - jt-run-body-bound: `20 05 41 02 49 20 05 41 f4ff03 4b 72 04 40 00 0b`
        - jt-run-scratch: `41 8c800c 41 888004 20 05 fc 0a 00 00`
        - jt-run-cursors: `41 8d800c 21 01 41 8c800c 20 05 6a 41 01 6b 21 02`
        - jt-run-root: `41 8c800c 2d 00 00 41 db00 47 20 02 2d 00 00 41 dd00 47 72 04 40 00 0b`
        - jt-run-reset: `41 808004 24 00 41 00 24 01`
        - jt-rows-exit: `02 40`
          - jt-rows-loop: `03 40`
            - jt-rows-bound: `20 01 20 02 4f 0d 01`
            - jt-row-open: `20 01 2d 00 00 41 db00 47 04 40 00 0b 20 01 41 01 6a 21 01`
            - jt-row-empty: `20 01 2d 00 00 41 dd00 46 04 40 00 0b`
            - jt-row-prefix: `41 fc00 10 02 41 20 10 02 41 00 21 04`
            - jt-cells-exit: `02 40`
              - jt-cells-loop: `03 40`
                - jt-cell-span: `20 01 20 02 10 05 21 03`
                - jt-cell-emit: `20 01 20 03 10 04 41 20 10 02 41 fc00 10 02`
                - jt-cell-count: `20 04 41 01 6a 21 04 20 03 41 01 6a 21 01`
                - jt-cell-row-end: `20 03 2d 00 00 41 dd00 46 0d 01`
                - jt-cell-next: `41 20 10 02 0c 00 0b`
              - jt-cells-end: `0b`
            - jt-row-finish: `20 04 10 06`
            - jt-row-last: `20 01 20 02 46 0d 01`
            - jt-row-next: `20 01 41 01 6a 21 01 0c 00 0b`
          - jt-rows-end: `0b`
        - jt-run-result: `23 00 41 808004 6b 0b`
    - jt-emit-record: `{{size:jt-emit-body}}`
      - jt-emit-body: `00`
        - jt-emit-bound: `23 00 41 80800c 4f 04 40 00 0b`
        - jt-emit-byte: `23 00 20 00 3a 00 00 23 00 41 01 6a 24 00 0b`
    - jt-escape-record: `{{size:jt-escape-body}}`
      - jt-escape-body: `00`
        - jt-escape-special: `20 00 41 20 4d 20 00 41 26 46 72 20 00 41 3c 46 72 20 00 41 3e 46 72 20 00 41 fc00 46 72 20 00 41 dc00 46 72 20 00 41 e000 46 72 20 00 41 2a 46 72 20 00 41 df00 46 72 20 00 41 db00 46 72 20 00 41 dd00 46 72 04 40`
          - jt-escape-entity: `41 26 10 02 41 23 10 02`
          - jt-escape-hundreds: `20 00 41 e400 4f 04 40 20 00 41 e400 6e 41 30 6a 10 02 0b`
          - jt-escape-tens: `20 00 41 0a 4f 04 40 20 00 41 0a 6e 41 0a 70 41 30 6a 10 02 0b`
          - jt-escape-ones: `20 00 41 0a 70 41 30 6a 10 02 41 3b 10 02`
          - jt-escape-plain: `05 20 00 10 02 0b 0b`
    - jt-copy-record: `{{size:jt-copy-body}}`
      - jt-copy-body: `00`
        - jt-copy-exit: `02 40`
          - jt-copy-loop: `03 40`
            - jt-copy-bound: `20 00 20 01 4f 0d 01`
            - jt-copy-byte: `20 00 2d 00 00 10 03`
            - jt-copy-next: `20 00 41 01 6a 21 00 0c 00 0b`
          - jt-copy-end: `0b 0b`
    - jt-scan-record: `{{size:jt-scan-body}}`
      - jt-scan-body: `01 04 7f`
        - jt-scan-start: `20 00 21 02`
        - jt-scan-exit: `02 40`
          - jt-scan-loop: `03 40`
            - jt-scan-bound: `20 02 20 01 4f 04 40 00 0b`
            - jt-scan-byte: `20 02 2d 00 00 21 05`
            - jt-scan-string: `20 04 04 40`
              - jt-scan-escape: `20 05 41 dc00 46 04 40 20 02 41 01 6a 21 02`
                - jt-scan-string-close: `05 20 05 41 22 46 04 40 41 00 21 04 0b 0b`
              - jt-scan-outside: `05`
              - jt-scan-string-open: `20 05 41 22 46 04 40 41 01 21 04`
                - jt-scan-structure: `05`
                - jt-scan-cell-end: `20 03 45 20 05 41 2c 46 20 05 41 dd00 46 72 71 0d 03`
                - jt-scan-nested-open: `20 05 41 db00 46 20 05 41 fb00 46 72 04 40 20 03 41 01 6a 21 03 0b`
                - jt-scan-nested-close: `20 05 41 dd00 46 20 05 41 fd00 46 72 04 40 20 03 41 01 6b 21 03 0b 0b 0b`
            - jt-scan-next: `20 02 41 01 6a 21 02 0c 00 0b`
          - jt-scan-end: `0b`
        - jt-scan-result: `20 02 0b`
    - jt-row-record: `{{size:jt-row-body}}`
      - jt-row-body: `00`
        - jt-row-newline: `41 0a 10 02`
        - jt-row-header: `23 01 45 04 40 20 00 24 01`
          - jt-rule-loop: `03 40`
            - jt-rule-cell: `41 fc00 10 02 41 20 10 02 41 2d 10 02 41 2d 10 02 41 2d 10 02 41 20 10 02`
            - jt-rule-next: `20 00 41 01 6b 22 00 0d 00 0b`
          - jt-rule-end: `41 fc00 10 02 41 0a 10 02`
          - jt-row-width: `05 23 01 20 00 47 04 40 00 0b 0b 0b`

Run locals: length 0, cursor 1, outer-array end 2, cell end 3, row width 4,
compact body length 5. Scan locals: start 0, bound 1, cursor 2, depth 3,
in-string flag 4, byte 5. Boundary detection cannot mistake a comma or bracket
inside a quoted string for a row delimiter.
