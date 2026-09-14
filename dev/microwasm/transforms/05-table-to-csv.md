# Markdown table to fenced CSV

Convert one rectangular pipe table to CSV. The header becomes the first
record and the hyphen separator is omitted. Every field is quoted; embedded
quotes are doubled. Commas, CR, LF and Unicode stay in the field. There is no
numeric inference, and empty fields stay empty strings.

```text
| name | note |
| --- | --- |
| Ben | hello,&#32;world |
| Ada | said "hi" |
```

becomes:

```csv
"name","note"
"Ben","hello, world"
"Ada","said ""hi"""
```

The table must start with `|` and every row must have outer pipes. Spaces and
tabs at cell edges are formatting. Use decimal references such as `&#32;`
for significant spaces, `&#10;` for an embedded newline, and `&#124;` for a
pipe. Backslash escapes of ASCII punctuation are also decoded, including
`\|` and `\\`. Other inline Markdown is retained as literal source text,
not interpreted as rich text. Named and hexadecimal entities remain literal.
Decimal references accept Unicode scalar values; malformed references remain
literal. C0 controls other than tab, LF and CR are not representable here.

The separator must match the header width and have at least three hyphens
per cell, optionally surrounded by colons. Subsequent rows must match too.
LF and CRLF work. Only whitespace may follow the table; internal blank lines
and extra prose are errors. Input must be valid UTF-8, at most 64 KiB.
Output starts at `0x10000` with a 128 KiB cap. Invalid input or overflow traps;
discard partial output and reuse the instance for the next run.

## Pattern: format fields, then wrap the result

Rows are scanned directly from input. The cell writer removes table escaping
and writes quoted CSV without an intermediate array of strings. While writing,
the byte emitter tracks the longest backtick run. At the end, choose a fence
of at least three backticks and longer than any run in the CSV. One overlapping
`memory.copy` shifts the body right to make room for that opening fence.
This is a bounded copy of the final body, not repeated string concatenation.

```text
for each table line:
    parse cells, respecting backslash-escaped pipe separators
    if second line: validate the separator and its width
    else: write quoted CSV fields and one record newline
choose fence_length = max(3, longest_backtick_run + 1)
check final output capacity
shift body by fence_length + length('csv' + newline)
write opening fence, then closing fence after the body
```

## Module

Functions: run 0, emit 1, CSV byte 2, cell 3, Unicode scalar 4, row 5,
decimal reference 6. Globals: output cursor 0, longest backtick run 1,
current backtick run 2. Memory has four fixed pages and no imports.

`[microwasm]`

- tc-header: `0061736d 01000000`
- tc-type-section: `01 {{size:tc-types}}`
  - tc-types: `05 60 01 7f 01 7f 60 01 7f 00 60 02 7f 7f 00 60 03 7f 7f 7f 01 7f 60 02 7f 7f 01 7f`
- tc-function-section: `03 {{size:tc-functions}}`
  - tc-functions: `07 00 01 01 02 01 03 04`
- tc-memory-section: `05 {{size:tc-memories}}`
  - tc-memories: `01 01 04 04`
- tc-global-section: `06 {{size:tc-globals}}`
  - tc-globals: `03 7f 01 41 00 0b 7f 01 41 00 0b 7f 01 41 00 0b`
- tc-export-section: `07 {{size:tc-exports}}`
  - tc-exports: `02 03 72756e 00 00 06 6d656d6f7279 02 00`
- tc-code-section: `0a {{size:tc-code}}`
  - tc-code: `07`
    - tc-run-record: `{{size:tc-run-body}}`
      - tc-run-body: `01 08 7f`
        - tc-bound: `20 00 41 808004 4b 04 40 00 0b`
        - tc-reset: `41 808004 24 00 41 00 24 01 41 00 24 02`
        - tc-trim-exit: `02 40`
          - tc-trim-loop: `03 40`
            - tc-trim-bound: `20 00 45 0d 01`
            - tc-trim-byte: `20 00 41 01 6b 2d 00 00 21 03`
            - tc-trim-space: `20 03 41 20 46 20 03 41 09 46 72 20 03 41 0a 46 72 20 03 41 0d 46 72 45 0d 01`
            - tc-trim-next: `20 00 41 01 6b 21 00 0c 00 0b`
          - tc-trim-end: `0b`
        - tc-lines-exit: `02 40`
          - tc-lines-loop: `03 40`
            - tc-lines-bound: `20 01 20 00 4f 0d 01`
            - tc-line-start: `20 01 21 02`
            - tc-line-exit: `02 40`
              - tc-line-loop: `03 40`
                - tc-line-bound: `20 02 20 00 4f 0d 01`
                - tc-line-lf: `20 02 2d 00 00 41 0a 46 0d 01`
                - tc-line-next: `20 02 41 01 6a 21 02 0c 00 0b`
              - tc-line-end: `0b`
            - tc-line-convert: `20 01 20 02 20 04 41 01 47 10 05 21 03`
            - tc-first-width: `20 04 45 04 40 20 03 21 05`
              - tc-check-width: `05 20 03 20 05 47 04 40 00 0b 0b`
            - tc-lines-next: `20 04 41 01 6a 21 04 20 02 41 01 6a 21 01 0c 00 0b`
          - tc-lines-end: `0b`
        - tc-require-header-rule: `20 04 41 02 49 04 40 00 0b`
        - tc-body-length: `23 00 41 808004 6b 21 06`
        - tc-fence-length: `23 01 41 01 6a 21 07 20 07 41 03 49 04 40 41 03 21 07 0b`
        - tc-prefix-length: `20 07 41 04 6a 21 08`
        - tc-final-bound: `20 06 20 08 6a 20 07 6a 41 01 6a 41 808008 4b 04 40 00 0b`
        - tc-shift-body: `41 808004 20 08 6a 41 808004 20 06 fc 0a 00 00`
        - tc-prefix-reset: `41 808004 24 00 20 07 21 03`
        - tc-open-loop: `03 40 41 e000 10 01 20 03 41 01 6b 22 03 0d 00 0b`
        - tc-open-label: `41 e300 10 01 41 f300 10 01 41 f600 10 01 41 0a 10 01`
        - tc-close-position: `41 808004 20 08 6a 20 06 6a 24 00 20 07 21 03`
        - tc-close-loop: `03 40 41 e000 10 01 20 03 41 01 6b 22 03 0d 00 0b`
        - tc-result: `41 0a 10 01 23 00 41 808004 6b 0b`
    - tc-emit-record: `{{size:tc-emit-body}}`
      - tc-emit-body: `00`
        - tc-emit-bound: `23 00 41 80800c 4f 04 40 00 0b`
        - tc-emit-store: `23 00 20 00 3a 00 00 23 00 41 01 6a 24 00`
        - tc-emit-backtick: `20 00 41 e000 46 04 40`
          - tc-emit-run: `23 02 41 01 6a 24 02`
          - tc-emit-longest: `23 02 23 01 4b 04 40 23 02 24 01 0b`
          - tc-emit-reset: `05 41 00 24 02 0b 0b`
    - tc-byte-record: `{{size:tc-byte-body}}`
      - tc-byte-body: `00`
        - tc-byte-control: `20 00 41 20 49 20 00 41 09 47 71 20 00 41 0a 47 71 20 00 41 0d 47 71 04 40 00 0b`
        - tc-byte-copy: `20 00 10 01 20 00 41 22 46 04 40 20 00 10 01 0b 0b`
    - tc-cell-record: `{{size:tc-cell-body}}`
      - tc-cell-body: `01 03 7f`
        - tc-cell-open: `41 22 10 01`
        - tc-cell-exit: `02 40`
          - tc-cell-loop: `03 40`
            - tc-cell-bound: `20 00 20 01 4f 0d 01`
            - tc-cell-byte: `20 00 2d 00 00 21 02`
            - tc-cell-slash: `20 02 41 dc00 46 20 00 41 01 6a 20 01 49 71 04 40`
              - tc-cell-next-byte: `20 00 2d 00 01 21 03`
              - tc-cell-punctuation: `20 03 41 21 6b 41 0e 4d 20 03 41 3a 6b 41 06 4d 72 20 03 41 db00 6b 41 05 4d 72 20 03 41 fb00 6b 41 03 4d 72 04 40`
                - tc-cell-escaped: `20 03 10 02 20 00 41 02 6a 21 00 0c 02 0b 0b`
            - tc-cell-reference: `20 02 41 26 46 04 40`
              - tc-cell-decoded: `20 00 20 01 10 06 22 04 04 40 20 04 21 00 0c 02 0b 0b`
            - tc-cell-ordinary: `20 02 10 02 20 00 41 01 6a 21 00 0c 00 0b`
          - tc-cell-end: `0b`
        - tc-cell-close: `41 22 10 01 0b`
    - tc-unicode-record: `{{size:tc-unicode-body}}`
      - tc-unicode-body: `00`
        - tc-unicode-ascii: `20 00 41 8001 49 04 40 20 00 10 02 0f 0b`
        - tc-unicode-two: `20 00 41 8010 49 04 40 20 00 41 06 76 41 c001 72 10 02`
          - tc-unicode-more: `05 20 00 41 808004 49 04 40 20 00 41 0c 76 41 e001 72 10 02`
            - tc-unicode-four: `05 20 00 41 12 76 41 f001 72 10 02 20 00 41 0c 76 41 3f 71 41 8001 72 10 02 0b`
          - tc-unicode-middle: `20 00 41 06 76 41 3f 71 41 8001 72 10 02 0b`
        - tc-unicode-last: `20 00 41 3f 71 41 8001 72 10 02 0b`
    - tc-row-record: `{{size:tc-row-body}}`
      - tc-row-body: `01 05 7f`
        - tc-row-trim-exit: `02 40`
          - tc-row-trim-loop: `03 40`
            - tc-row-trim-bound: `20 01 20 00 4d 0d 01`
            - tc-row-trim-byte: `20 01 41 01 6b 2d 00 00 21 03`
            - tc-row-trim-space: `20 03 41 20 46 20 03 41 09 46 72 20 03 41 0d 46 72 45 0d 01`
            - tc-row-trim-next: `20 01 41 01 6b 21 01 0c 00 0b`
          - tc-row-trim-end: `0b`
        - tc-row-minimum: `20 01 20 00 6b 41 02 49 04 40 00 0b`
        - tc-row-outer: `20 00 2d 00 00 41 fc00 47 20 01 41 01 6b 2d 00 00 41 fc00 47 72 04 40 00 0b`
        - tc-row-position: `20 00 41 01 6a 21 03`
        - tc-row-exit: `02 40`
          - tc-row-loop: `03 40`
            - tc-row-bound: `20 03 20 01 4f 0d 01`
            - tc-row-cell-start: `20 03 21 04`
            - tc-pipe-exit: `02 40`
              - tc-pipe-loop: `03 40`
                - tc-pipe-bound: `20 04 20 01 4f 04 40 00 0b`
                - tc-pipe-found: `20 04 2d 00 00 41 fc00 46 0d 01`
                - tc-pipe-escape: `20 04 2d 00 00 41 dc00 46 04 40 20 04 41 01 6a 21 04 0b`
                - tc-pipe-next: `20 04 41 01 6a 21 04 0c 00 0b`
              - tc-pipe-end: `0b`
            - tc-cell-range: `20 03 21 05 20 04 21 06`
            - tc-leading-exit: `02 40`
              - tc-leading-loop: `03 40`
                - tc-leading-bound: `20 05 20 06 4f 0d 01`
                - tc-leading-space: `20 05 2d 00 00 41 20 46 20 05 2d 00 00 41 09 46 72 45 0d 01`
                - tc-leading-next: `20 05 41 01 6a 21 05 0c 00 0b`
              - tc-leading-end: `0b`
            - tc-trailing-exit: `02 40`
              - tc-trailing-loop: `03 40`
                - tc-trailing-bound: `20 06 20 05 4d 0d 01`
                - tc-trailing-space: `20 06 41 01 6b 2d 00 00 41 20 46 20 06 41 01 6b 2d 00 00 41 09 46 72 45 0d 01`
                - tc-trailing-next: `20 06 41 01 6b 21 06 0c 00 0b`
              - tc-trailing-end: `0b`
            - tc-row-data: `20 02 04 40`
              - tc-row-comma: `20 07 04 40 41 2c 10 01 0b`
              - tc-row-cell: `20 05 20 06 10 03`
              - tc-row-rule: `05`
              - tc-rule-leading-room: `20 05 20 06 49 04 40`
                - tc-rule-leading: `20 05 2d 00 00 41 3a 46 04 40 20 05 41 01 6a 21 05 0b 0b`
              - tc-rule-trailing-room: `20 05 20 06 49 04 40`
                - tc-rule-trailing: `20 06 41 01 6b 2d 00 00 41 3a 46 04 40 20 06 41 01 6b 21 06 0b 0b`
              - tc-rule-minimum: `20 06 20 05 6b 41 03 49 04 40 00 0b`
              - tc-rule-loop: `03 40`
                - tc-rule-byte: `20 05 2d 00 00 41 2d 47 04 40 00 0b`
                - tc-rule-next: `20 05 41 01 6a 22 05 20 06 49 0d 00 0b 0b`
            - tc-row-next: `20 07 41 01 6a 21 07 20 04 41 01 6a 21 03 0c 00 0b`
          - tc-row-end: `0b`
        - tc-row-newline: `20 02 04 40 41 0a 10 01 0b`
        - tc-row-result: `20 07 0b`
    - tc-reference-record: `{{size:tc-reference-body}}`
      - tc-reference-body: `01 03 7f`
        - tc-reference-room: `20 00 41 03 6a 20 01 4f 04 40 41 00 0f 0b`
        - tc-reference-hash: `20 00 2d 00 01 41 23 47 04 40 41 00 0f 0b`
        - tc-reference-start: `20 00 41 02 6a 21 02`
        - tc-reference-exit: `02 40`
          - tc-reference-loop: `03 40`
            - tc-reference-bound: `20 02 20 01 4f 04 40 41 00 0f 0b`
            - tc-reference-byte: `20 02 2d 00 00 21 03`
            - tc-reference-semicolon: `20 03 41 3b 46 0d 01`
            - tc-reference-digit: `20 03 41 30 6b 41 09 4b 20 02 20 00 6b 41 09 4f 72 04 40 41 00 0f 0b`
            - tc-reference-accumulate: `20 04 41 0a 6c 20 03 41 30 6b 6a 21 04`
            - tc-reference-next: `20 02 41 01 6a 21 02 0c 00 0b`
          - tc-reference-end: `0b`
        - tc-reference-range: `20 04 45 20 04 41 ffffc300 4b 72 20 04 41 80b003 6b 41 ff0f 4d 72 04 40 41 00 0f 0b`
        - tc-reference-output: `20 04 10 04 20 02 41 01 6a 0b`

Run locals: length 0, line start/end 1/2, temporary/countdown 3, row index 4,
width 5, CSV byte length 6, fence length 7, prefix length 8. Row locals:
start/end 0/1, data-mode 2, position 3, next pipe 4, cell start/end 5/6,
column count 7. All offsets and loop counters are i32.
