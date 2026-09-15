# Typed Markdown table to JSON objects

Read a pipe table with JSON-string headers and JSON-value cells. Each body
row becomes an object. Blank cells omit properties; `null`, `false`, `0`, and
`""` remain present values. This reverses the representation produced by
[JSON objects to table](08-json-objects-to-table.md).

```text
| "name" | "score" | "active" |
| --- | --- | --- |
| "Ben" | 12.50 |  |
| "Ada" |  | true |
|  |  |  |
```

becomes:

```json
[{"name":"Ben","score":12.50},{"name":"Ada","active":true},{}]
```

Headers must be complete JSON strings, including their quotes. Their decoded
names must be unique: `"name"` and `"\u006eame"` cannot name two columns.
Empty-string names and names such as `"__proto__"` are ordinary keys. There
is no JavaScript object construction. Header order determines property order;
this does not reconstruct each source object's original property ordering.
The selected header spelling is used in every object, while value spellings,
including nested duplicate keys and exact number tokens, remain intact.

The [typed-row table rules](11-table-to-json-rows.md) apply: outer pipes,
rectangular rows, a hyphen separator with optional alignment colons, LF/CRLF,
one-pass decimal references and ASCII punctuation escapes, and no extra prose.
An empty or whitespace-only document gives `[]`. A header plus separator with
no body rows also gives `[]`. A body row of blank cells gives `{}`.

Only a cell empty after trimming literal spaces/tabs means missing. A cell
containing `&#32;` is not a missing-value marker: after decoding, it must still
contain a complete JSON value. Values are never inferred from bare text, and
commas or braces cannot escape a cell to construct extra properties. Errors
trap; keep the previous output unless the whole conversion succeeds.

## Pattern: retain source spans and reuse the decoder

The [table decoder](11-table-to-json-rows.md) exports its existing cell decoder
as an actual Wasm function. This tool does not duplicate that code or call a
JavaScript transformation. The decoder reuses scratch in the last memory page.
The JSON parser validates each decoded cell separately and emits compact JSON.

Keep just the original start/end span of every header, eight bytes per column.
To check a new header, compact it temporarily into the output region and
compare it against each earlier decoded/compacted header using the shared
[key comparator](00-json-string-keys.md). Once all headers are checked, reset
the output cursor and write the result. For each present cell, decode its
header and value afresh. This trades repeated short-header decoding for a
simple bounded implementation without a second string store or object graph.
Header uniqueness checks are quadratic in the number of columns.

```text
validate and remember each header; reject equivalent names
reset output; write the JSON fence and outer '['
check the separator
for each body row:
    write '{'
    for each nonblank cell:
        write a comma unless this is the first present property
        append the validated header, ':' and validated value
    write '}'; check the row width
write outer ']' and the closing fence
```

Input is caller-supplied UTF-8 at `0..0x10000`, at most 64 KiB, and is never
modified. Output starts at `0x10000` and is limited to 120 KiB, ending before
`0x2e000`. Up to 1,024 header records occupy `0x2e000..0x30000`; the parser's
twelve literal bytes and decoder scratch follow. A decoded cell is at most
65,524 bytes. Nesting is at most 128 containers, including the outer array
and object row. Empty cells do not consume JSON depth.

The parser itself can emit up to `0x30000`. Immediately after each append,
this tool checks its stricter output end before touching another header.
A failed append may overwrite header records, but no corrupted records are
used: the call traps and the next run rebuilds them. Prefix checks use at
most the combined size of two source header cells, so they cannot reach the
record region. Shared memory must not be used concurrently.

## Module

Instantiate the number scanner `n`, JSON parser `p`, key comparator `k`, and
typed-row decoder module `d`, all sharing `n.memory`. Then instantiate this
module. Imports: compact-span 0, decode 1, equal 2. Defined functions: run 3,
emit 4, prefix 5, append-cell 6, header 7, row 8. Globals: output cursor 0,
header width 1. No host conversion callbacks or hidden data sections.

`[microwasm]`

- to-header: `0061736d 01000000`
- to-type-section: `01 {{size:to-types}}`
  - to-types: `08 60 04 7f 7f 7f 7f 01 7f 60 02 7f 7f 01 7f 60 01 7f 01 7f 60 01 7f 00 60 00 00 60 02 7f 7f 00 60 03 7f 7f 7f 00 60 03 7f 7f 7f 01 7f`
- to-import-section: `02 {{size:to-imports}}`
  - to-imports: `04 01 70 0b 636f6d706163745370616e 00 00 01 64 06 6465636f6465 00 01 01 6b 05 657175616c 00 00 01 70 06 6d656d6f7279 02 01 04 04`
- to-function-section: `03 {{size:to-functions}}`
  - to-functions: `06 02 03 04 05 06 07`
- to-global-section: `06 {{size:to-globals}}`
  - to-globals: `02 7f 01 41 00 0b 7f 01 41 00 0b`
- to-export-section: `07 {{size:to-exports}}`
  - to-exports: `02 03 72756e 00 03 06 6d656d6f7279 02 00`
- to-code-section: `0a {{size:to-code}}`
  - to-code: `06`
    - to-run-record: `{{size:to-run-body}}`
      - to-run-body: `01 04 7f`
        - to-run-bound: `20 00 41 808004 4b 04 40 00 0b`
        - to-run-reset: `41 808004 24 00 41 00 24 01`
        - to-trim-exit: `02 40`
          - to-trim-loop: `03 40`
            - to-trim-bound: `20 00 45 0d 01`
            - to-trim-byte: `20 00 41 01 6b 2d 00 00 21 03`
            - to-trim-space: `20 03 41 20 46 20 03 41 09 46 72 20 03 41 0a 46 72 20 03 41 0d 46 72 45 0d 01`
            - to-trim-next: `20 00 41 01 6b 21 00 0c 00 0b 0b`
        - to-lines-exit: `02 40`
          - to-lines-loop: `03 40`
            - to-lines-bound: `20 01 20 00 4f 0d 01`
            - to-line-start: `20 01 21 02`
            - to-line-exit: `02 40`
              - to-line-loop: `03 40`
                - to-line-bound: `20 02 20 00 4f 0d 01`
                - to-line-lf: `20 02 2d 00 00 41 0a 46 0d 01`
                - to-line-next: `20 02 41 01 6a 21 02 0c 00 0b 0b`
            - to-row-comma: `20 04 41 02 4b 04 40 41 2c 10 04 0b`
            - to-line-convert: `20 01 20 02 20 04 41 02 49 04 7f 20 04 05 41 02 0b 10 08 21 03`
            - to-header-width: `20 04 45 04 40 20 03 24 01 10 05`
              - to-width-check: `05 20 03 23 01 47 04 40 00 0b 0b`
            - to-lines-next: `20 04 41 01 6a 21 04 20 02 41 01 6a 21 01 0c 00 0b 0b`
        - to-separator-required: `20 04 41 01 46 04 40 00 0b`
        - to-empty: `20 04 45 04 40 10 05 0b`
        - to-close: `41 dd00 10 04 41 0a 10 04 41 e000 10 04 41 e000 10 04 41 e000 10 04 41 0a 10 04 23 00 41 808004 6b 0b`
    - to-emit-record: `{{size:to-emit-body}}`
      - to-emit-body: `00`
        - to-emit-bound: `23 00 41 80c00b 4f 04 40 00 0b`
        - to-emit-byte: `23 00 20 00 3a 00 00 23 00 41 01 6a 24 00 0b`
    - to-prefix-record: `{{size:to-prefix-body}}`
      - to-prefix-body: `00`
        - to-prefix-reset: `41 808004 24 00`
        - to-prefix-bytes: `41 e000 10 04 41 e000 10 04 41 e000 10 04 41 ea00 10 04 41 f300 10 04 41 ef00 10 04 41 ee00 10 04 41 0a 10 04 41 db00 10 04 0b`
    - to-append-record: `{{size:to-append-body}}`
      - to-append-body: `00`
        - to-append-validated: `23 00 41 8c800c 20 00 20 01 10 01 23 00 41 02 10 00 6a 24 00`
        - to-append-bound: `23 00 41 80c00b 4b 04 40 00 0b 0b`
    - to-key-record: `{{size:to-key-body}}`
      - to-key-body: `01 04 7f`
        - to-key-count: `20 02 41 8008 4f 04 40 00 0b`
        - to-key-validate: `41 8c800c 20 00 20 01 10 01 41 808004 41 00 10 00 41 808004 6a 21 03`
        - to-key-string: `41 808004 2d 00 00 41 22 47 04 40 00 0b`
        - to-key-exit: `02 40`
          - to-key-loop: `03 40`
            - to-key-bound: `20 04 20 02 4f 0d 01`
            - to-key-record-address: `41 80c00b 20 04 41 03 74 6a 21 05`
            - to-key-previous: `41 8c800c 20 05 28 02 00 20 05 28 02 04 10 01 20 03 41 00 10 00 20 03 6a 21 06`
            - to-key-duplicate: `41 808004 20 03 20 03 20 06 10 02 04 40 00 0b`
            - to-key-next: `20 04 41 01 6a 21 04 0c 00 0b 0b`
        - to-key-save-address: `41 80c00b 20 02 41 03 74 6a 21 05`
        - to-key-save: `20 05 20 00 36 02 00 20 05 20 01 36 02 04 0b`
    - to-row-record: `{{size:to-row-body}}`
      - to-row-body: `01 07 7f`
        - to-row-trim-exit: `02 40`
          - to-row-trim-loop: `03 40`
            - to-row-trim-bound: `20 01 20 00 4d 0d 01`
            - to-row-trim-byte: `20 01 41 01 6b 2d 00 00 21 03`
            - to-row-trim-space: `20 03 41 20 46 20 03 41 09 46 72 20 03 41 0d 46 72 45 0d 01`
            - to-row-trim-next: `20 01 41 01 6b 21 01 0c 00 0b 0b`
        - to-row-minimum: `20 01 20 00 6b 41 02 49 04 40 00 0b`
        - to-row-outer: `20 00 2d 00 00 41 fc00 47 20 01 41 01 6b 2d 00 00 41 fc00 47 72 04 40 00 0b`
        - to-row-open: `20 02 41 02 46 04 40 41 fb00 10 04 0b`
        - to-row-position: `20 00 41 01 6a 21 03`
        - to-row-exit: `02 40`
          - to-row-loop: `03 40`
            - to-row-bound: `20 03 20 01 4f 0d 01`
            - to-row-cell-start: `20 03 21 04`
            - to-pipe-exit: `02 40`
              - to-pipe-loop: `03 40`
                - to-pipe-bound: `20 04 20 01 4f 04 40 00 0b`
                - to-pipe-found: `20 04 2d 00 00 41 fc00 46 0d 01`
                - to-pipe-escape: `20 04 2d 00 00 41 dc00 46 04 40 20 04 41 01 6a 21 04 0b`
                - to-pipe-next: `20 04 41 01 6a 21 04 0c 00 0b 0b`
            - to-cell-range: `20 03 21 05 20 04 21 06`
            - to-leading-exit: `02 40`
              - to-leading-loop: `03 40`
                - to-leading-bound: `20 05 20 06 4f 0d 01`
                - to-leading-space: `20 05 2d 00 00 41 20 46 20 05 2d 00 00 41 09 46 72 45 0d 01`
                - to-leading-next: `20 05 41 01 6a 21 05 0c 00 0b 0b`
            - to-trailing-exit: `02 40`
              - to-trailing-loop: `03 40`
                - to-trailing-bound: `20 06 20 05 4d 0d 01`
                - to-trailing-space: `20 06 41 01 6b 2d 00 00 41 20 46 20 06 41 01 6b 2d 00 00 41 09 46 72 45 0d 01`
                - to-trailing-next: `20 06 41 01 6b 21 06 0c 00 0b 0b`
            - to-row-header: `20 02 45 04 40 20 05 20 06 20 07 10 07`
              - to-row-not-header: `05 20 02 41 01 46 04 40`
                - to-rule-leading-room: `20 05 20 06 49 04 40`
                  - to-rule-leading: `20 05 2d 00 00 41 3a 46 04 40 20 05 41 01 6a 21 05 0b 0b`
                - to-rule-trailing-room: `20 05 20 06 49 04 40`
                  - to-rule-trailing: `20 06 41 01 6b 2d 00 00 41 3a 46 04 40 20 06 41 01 6b 21 06 0b 0b`
                - to-rule-minimum: `20 06 20 05 6b 41 03 49 04 40 00 0b`
                - to-rule-loop: `03 40`
                  - to-rule-byte: `20 05 2d 00 00 41 2d 47 04 40 00 0b`
                  - to-rule-next: `20 05 41 01 6a 22 05 20 06 49 0d 00 0b`
                - to-row-data: `05`
                - to-column-bound: `20 07 23 01 4f 04 40 00 0b`
                - to-present: `20 05 20 06 49 04 40`
                  - to-property-comma: `20 08 04 40 41 2c 10 04 0b`
                  - to-property-key: `41 80c00b 20 07 41 03 74 6a 21 09 20 09 28 02 00 20 09 28 02 04 10 06`
                  - to-property-colon: `41 3a 10 04`
                  - to-property-value: `20 05 20 06 10 06`
                  - to-property-count: `20 08 41 01 6a 21 08 0b 0b 0b`
            - to-row-next: `20 07 41 01 6a 21 07 20 04 41 01 6a 21 03 0c 00 0b 0b`
        - to-row-close: `20 02 41 02 46 04 40 41 fd00 10 04 0b`
        - to-row-result: `20 07 0b`

Run locals: length 0, line start/end 1/2, width 3, line index 4. Header locals:
source start/end 0/1, column 2, current compact end 3, prior column 4, record
address 5, prior compact end 6. Row locals: source start/end 0/1, mode 2
(header 0, separator 1, body 2), cursor 3, pipe 4, trimmed cell start/end 5/6,
column 7, emitted-property count 8, header-record address 9. Scanning and
separator checks follow the typed-row tool; decoding stays in that module.
