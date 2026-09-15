# Typed Markdown table to JSON rows

Read a rectangular pipe table whose cells are JSON values and produce a
fenced JSON array of row arrays. The header becomes the first row; its hyphen
separator is omitted. This reverses [JSON rows to table](10-json-rows-to-table.md).

```text
| "name" | "score" | "metadata" |
| --- | --- | --- |
| "Ben" | 12.50 | {"active":true} |
| "Ada" | null | &#91;"wasm","Markdown"&#93; |
```

becomes:

```json
[["name","score","metadata"],["Ben",12.50,{"active":true}],["Ada",null,["wasm","Markdown"]]]
```

Every decoded cell must be exactly one JSON value. Strings need JSON quotes;
plain `Ben` is not inferred to be a string, and an empty cell is not silently
turned into null. `"12"` and `12` stay different. Nested values, duplicate
object keys, number spellings and string escapes are preserved. Insignificant
JSON whitespace is compacted. A cell like `1,2` is rejected rather than
creating two columns, even if concatenating the entire table could yield
syntactically valid JSON.

The table starts at byte zero and every row has outer pipes. Cell-edge spaces
and tabs are formatting; decimal character references and backslash escapes
of ASCII punctuation are decoded once, following the same rules as
[table to CSV](05-table-to-csv.md). Use `&#124;` for a pipe inside a JSON string,
and `&#92;` for a JSON escape's backslash. Named/hexadecimal or malformed
character references remain literal. Decoded characters must still form valid
JSON: a literal newline within quotes is invalid, whereas a JSON `\n` escape
is valid. The separator has at least three hyphens per cell, optional colons,
and the header's width. Every later row must match that width too.

LF and CRLF work. Empty or whitespace-only input represents the empty array.
A nonempty table requires both a header and separator, even if there are no
body rows. Blank internal lines and extra prose are rejected. Input is
caller-supplied UTF-8, at most 64 KiB; output starts at `0x10000` with a
128 KiB cap. Nesting is limited to 128 containers including the two array
levels supplied by this converter. Errors trap and a later call resets state;
publish output only after a successful return.

## Pattern: decode and validate one cell at a time

The original input is not modified. Each cell is decoded into scratch at
`0x3000c..0x40000`, after the shared parser's literals. The parser's
`compactSpan` entry validates that complete cell and appends compact JSON
directly to the output. Scratch is reused for the next cell. This avoids both
an object tree and a full intermediate JSON document, while ensuring that
JSON punctuation cannot escape its table cell.
One decoded cell may occupy at most 65,524 scratch bytes; longer cells trap
even if their table source fits the separate 64 KiB input limit.

```text
write the opening JSON fence and outer '['
for each table row:
    if separator: check hyphens and column count
    otherwise:
        write row '[' and separating commas
        for each cell:
            decode table escapes into scratch
            append compactSpan(scratchStart, scratchEnd, output, 2)
        write row ']'; verify the header's width
write outer ']' and the closing fence
```

The row scanning, punctuation decoding and decimal-reference pattern follows
the table-to-CSV implementation, but the final consumer is the JSON validator,
not a CSV string writer. Numeric references are limited to seven decimal
digits and valid nonzero Unicode scalar values; malformed references are
ordinary text. Actual JSON escapes are handled by the shared JSON parser.

## Module

Instantiate the number scanner as `n`, the JSON parser using `n` as `p`, and
this module using `p`. Imports are its actual Wasm `compactSpan` and memory.
The four-page memory is shared, with separate original-input, output, parser
literal and scratch regions. There are no host conversion callbacks.
Functions: compact-span 0, run 1, emit 2, scratch-byte 3, cell 4, Unicode 5,
row 6, decimal-reference 7, decode 8. Globals: output cursor 0 and scratch
cursor 1. The exported `decode(start, end)` also makes the cell-unescaping
pattern available to other Wasm tools: it reads an exclusive span within the
first page, writes at `0x3000c`, and returns the exclusive scratch end.
It does not validate JSON or change the output cursor. Source and scratch
overflow trap; each call resets scratch. No decoded data survives the next
decode call, so callers must consume it immediately.

`[microwasm]`

- tj-header: `0061736d 01000000`
- tj-type-section: `01 {{size:tj-types}}`
  - tj-types: `06 60 04 7f 7f 7f 7f 01 7f 60 01 7f 01 7f 60 01 7f 00 60 02 7f 7f 00 60 03 7f 7f 7f 01 7f 60 02 7f 7f 01 7f`
- tj-import-section: `02 {{size:tj-imports}}`
  - tj-imports: `02 01 70 0b 636f6d706163745370616e 00 00 01 70 06 6d656d6f7279 02 01 04 04`
- tj-function-section: `03 {{size:tj-functions}}`
  - tj-functions: `08 01 02 02 03 02 04 05 05`
- tj-global-section: `06 {{size:tj-globals}}`
  - tj-globals: `02 7f 01 41 00 0b 7f 01 41 00 0b`
- tj-export-section: `07 {{size:tj-exports}}`
  - tj-exports: `03 03 72756e 00 01 06 6d656d6f7279 02 00 06 6465636f6465 00 08`
- tj-code-section: `0a {{size:tj-code}}`
  - tj-code: `08`
    - tj-run-record: `{{size:tj-run-body}}`
      - tj-run-body: `01 05 7f`
        - tj-run-bound: `20 00 41 808004 4b 04 40 00 0b`
        - tj-run-reset: `41 808004 24 00`
        - tj-run-prefix: `41 e000 10 02 41 e000 10 02 41 e000 10 02 41 ea00 10 02 41 f300 10 02 41 ef00 10 02 41 ee00 10 02 41 0a 10 02 41 db00 10 02`
        - tj-trim-exit: `02 40`
          - tj-trim-loop: `03 40`
            - tj-trim-bound: `20 00 45 0d 01`
            - tj-trim-byte: `20 00 41 01 6b 2d 00 00 21 03`
            - tj-trim-space: `20 03 41 20 46 20 03 41 09 46 72 20 03 41 0a 46 72 20 03 41 0d 46 72 45 0d 01`
            - tj-trim-next: `20 00 41 01 6b 21 00 0c 00 0b`
          - tj-trim-end: `0b`
        - tj-lines-exit: `02 40`
          - tj-lines-loop: `03 40`
            - tj-lines-bound: `20 01 20 00 4f 0d 01`
            - tj-line-start: `20 01 21 02`
            - tj-line-exit: `02 40`
              - tj-line-loop: `03 40`
                - tj-line-bound: `20 02 20 00 4f 0d 01`
                - tj-line-lf: `20 02 2d 00 00 41 0a 46 0d 01`
                - tj-line-next: `20 02 41 01 6a 21 02 0c 00 0b`
              - tj-line-end: `0b`
            - tj-row-comma: `20 04 41 01 4b 04 40 41 2c 10 02 0b`
            - tj-line-convert: `20 01 20 02 20 04 41 01 47 10 06 21 03`
            - tj-first-width: `20 04 45 04 40 20 03 21 05`
              - tj-check-width: `05 20 03 20 05 47 04 40 00 0b 0b`
            - tj-lines-next: `20 04 41 01 6a 21 04 20 02 41 01 6a 21 01 0c 00 0b`
          - tj-lines-end: `0b`
        - tj-require-separator: `20 04 41 01 46 04 40 00 0b`
        - tj-run-close: `41 dd00 10 02 41 0a 10 02 41 e000 10 02 41 e000 10 02 41 e000 10 02 41 0a 10 02 23 00 41 808004 6b 0b`
    - tj-emit-record: `{{size:tj-emit-body}}`
      - tj-emit-body: `00 23 00 41 80800c 4f 04 40 00 0b 23 00 20 00 3a 00 00 23 00 41 01 6a 24 00 0b`
    - tj-scratch-record: `{{size:tj-scratch-body}}`
      - tj-scratch-body: `00 23 01 41 808010 4f 04 40 00 0b 23 01 20 00 3a 00 00 23 01 41 01 6a 24 01 0b`
    - tj-cell-record: `{{size:tj-cell-body}}`
      - tj-cell-body: `00`
        - tj-cell-validate: `23 00 41 8c800c 20 00 20 01 10 08 23 00 41 02 10 00 6a 24 00 0b`
    - tj-unicode-record: `{{size:tj-unicode-body}}`
      - tj-unicode-body: `00`
        - tj-unicode-ascii: `20 00 41 8001 49 04 40 20 00 10 03 0f 0b`
        - tj-unicode-two: `20 00 41 8010 49 04 40 20 00 41 06 76 41 c001 72 10 03`
          - tj-unicode-more: `05 20 00 41 808004 49 04 40 20 00 41 0c 76 41 e001 72 10 03`
            - tj-unicode-four: `05 20 00 41 12 76 41 f001 72 10 03 20 00 41 0c 76 41 3f 71 41 8001 72 10 03 0b`
          - tj-unicode-middle: `20 00 41 06 76 41 3f 71 41 8001 72 10 03 0b`
        - tj-unicode-last: `20 00 41 3f 71 41 8001 72 10 03 0b`
    - tj-row-record: `{{size:tj-row-body}}`
      - tj-row-body: `01 05 7f`
        - tj-row-trim-exit: `02 40`
          - tj-row-trim-loop: `03 40`
            - tj-row-trim-bound: `20 01 20 00 4d 0d 01`
            - tj-row-trim-byte: `20 01 41 01 6b 2d 00 00 21 03`
            - tj-row-trim-space: `20 03 41 20 46 20 03 41 09 46 72 20 03 41 0d 46 72 45 0d 01`
            - tj-row-trim-next: `20 01 41 01 6b 21 01 0c 00 0b`
          - tj-row-trim-end: `0b`
        - tj-row-minimum: `20 01 20 00 6b 41 02 49 04 40 00 0b`
        - tj-row-outer: `20 00 2d 00 00 41 fc00 47 20 01 41 01 6b 2d 00 00 41 fc00 47 72 04 40 00 0b`
        - tj-row-open: `20 02 04 40 41 db00 10 02 0b`
        - tj-row-position: `20 00 41 01 6a 21 03`
        - tj-row-exit: `02 40`
          - tj-row-loop: `03 40`
            - tj-row-bound: `20 03 20 01 4f 0d 01`
            - tj-row-cell-start: `20 03 21 04`
            - tj-pipe-exit: `02 40`
              - tj-pipe-loop: `03 40`
                - tj-pipe-bound: `20 04 20 01 4f 04 40 00 0b`
                - tj-pipe-found: `20 04 2d 00 00 41 fc00 46 0d 01`
                - tj-pipe-escape: `20 04 2d 00 00 41 dc00 46 04 40 20 04 41 01 6a 21 04 0b`
                - tj-pipe-next: `20 04 41 01 6a 21 04 0c 00 0b`
              - tj-pipe-end: `0b`
            - tj-cell-range: `20 03 21 05 20 04 21 06`
            - tj-leading-exit: `02 40`
              - tj-leading-loop: `03 40`
                - tj-leading-bound: `20 05 20 06 4f 0d 01`
                - tj-leading-space: `20 05 2d 00 00 41 20 46 20 05 2d 00 00 41 09 46 72 45 0d 01`
                - tj-leading-next: `20 05 41 01 6a 21 05 0c 00 0b`
              - tj-leading-end: `0b`
            - tj-trailing-exit: `02 40`
              - tj-trailing-loop: `03 40`
                - tj-trailing-bound: `20 06 20 05 4d 0d 01`
                - tj-trailing-space: `20 06 41 01 6b 2d 00 00 41 20 46 20 06 41 01 6b 2d 00 00 41 09 46 72 45 0d 01`
                - tj-trailing-next: `20 06 41 01 6b 21 06 0c 00 0b`
              - tj-trailing-end: `0b`
            - tj-row-data: `20 02 04 40`
              - tj-cell-comma: `20 07 04 40 41 2c 10 02 0b`
              - tj-row-cell: `20 05 20 06 10 04`
              - tj-row-rule: `05`
              - tj-rule-leading-room: `20 05 20 06 49 04 40`
                - tj-rule-leading: `20 05 2d 00 00 41 3a 46 04 40 20 05 41 01 6a 21 05 0b 0b`
              - tj-rule-trailing-room: `20 05 20 06 49 04 40`
                - tj-rule-trailing: `20 06 41 01 6b 2d 00 00 41 3a 46 04 40 20 06 41 01 6b 21 06 0b 0b`
              - tj-rule-minimum: `20 06 20 05 6b 41 03 49 04 40 00 0b`
              - tj-rule-loop: `03 40`
                - tj-rule-byte: `20 05 2d 00 00 41 2d 47 04 40 00 0b`
                - tj-rule-next: `20 05 41 01 6a 22 05 20 06 49 0d 00 0b 0b`
            - tj-row-next: `20 07 41 01 6a 21 07 20 04 41 01 6a 21 03 0c 00 0b`
          - tj-row-end: `0b`
        - tj-row-close: `20 02 04 40 41 dd00 10 02 0b`
        - tj-row-result: `20 07 0b`
    - tj-reference-record: `{{size:tj-reference-body}}`
      - tj-reference-body: `01 03 7f`
        - tj-reference-room: `20 00 41 03 6a 20 01 4f 04 40 41 00 0f 0b`
        - tj-reference-hash: `20 00 2d 00 01 41 23 47 04 40 41 00 0f 0b`
        - tj-reference-start: `20 00 41 02 6a 21 02`
        - tj-reference-exit: `02 40`
          - tj-reference-loop: `03 40`
            - tj-reference-bound: `20 02 20 01 4f 04 40 41 00 0f 0b`
            - tj-reference-byte: `20 02 2d 00 00 21 03`
            - tj-reference-semicolon: `20 03 41 3b 46 0d 01`
            - tj-reference-digit: `20 03 41 30 6b 41 09 4b 20 02 20 00 6b 41 09 4f 72 04 40 41 00 0f 0b`
            - tj-reference-accumulate: `20 04 41 0a 6c 20 03 41 30 6b 6a 21 04`
            - tj-reference-next: `20 02 41 01 6a 21 02 0c 00 0b`
          - tj-reference-end: `0b`
        - tj-reference-range: `20 04 45 20 04 41 ffffc300 4b 72 20 04 41 80b003 6b 41 ff0f 4d 72 04 40 41 00 0f 0b`
        - tj-reference-output: `20 04 10 05 20 02 41 01 6a 0b`
    - tj-decode-record: `{{size:tj-decode-body}}`
      - tj-decode-body: `01 03 7f`
        - tj-decode-bound: `20 00 20 01 4b 20 01 41 808004 4b 72 04 40 00 0b`
        - tj-cell-reset: `41 8c800c 24 01`
        - tj-cell-exit: `02 40`
          - tj-cell-loop: `03 40`
            - tj-cell-bound: `20 00 20 01 4f 0d 01`
            - tj-cell-byte: `20 00 2d 00 00 21 02`
            - tj-cell-slash: `20 02 41 dc00 46 20 00 41 01 6a 20 01 49 71 04 40`
              - tj-cell-next-byte: `20 00 2d 00 01 21 03`
              - tj-cell-punctuation: `20 03 41 21 6b 41 0e 4d 20 03 41 3a 6b 41 06 4d 72 20 03 41 db00 6b 41 05 4d 72 20 03 41 fb00 6b 41 03 4d 72 04 40`
                - tj-cell-escaped: `20 03 10 03 20 00 41 02 6a 21 00 0c 02 0b 0b`
            - tj-cell-reference: `20 02 41 26 46 04 40`
              - tj-cell-decoded: `20 00 20 01 10 07 22 04 04 40 20 04 21 00 0c 02 0b 0b`
            - tj-cell-ordinary: `20 02 10 03 20 00 41 01 6a 21 00 0c 00 0b`
          - tj-cell-end: `0b`
        - tj-decode-result: `23 01 0b`

Run locals: length 0, line start/end 1/2, temporary width 3, line index 4,
header width 5. Row locals: start/end 0/1, data-mode 2, cursor 3, next pipe 4,
cell start/end 5/6, column count 7. Decoder locals: start/end 0/1, current byte 2,
escaped byte 3, decoded-reference end 4.
