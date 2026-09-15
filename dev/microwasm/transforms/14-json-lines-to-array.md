# JSON Lines to a fenced JSON array

Read a `jsonl` fence and wrap its records in one JSON array. Each nonempty
line must contain exactly one complete JSON value, not necessarily an object.
Objects, arrays, strings, numbers, Booleans and null are all valid records.

```jsonl
{"name":"Ben","city":"Phoenix"}
{"name":"Ada","city":"London"}
null
```

becomes:

```json
[{"name":"Ben","city":"Phoenix"},{"name":"Ada","city":"London"},null]
```

The [JSON Lines format](https://jsonlines.org/) uses UTF-8 and LF record
boundaries. CRLF works because CR is JSON whitespace. Blank or whitespace-only
record lines are invalid; a trailing LF does not create an extra record.
An empty fence has zero records and becomes `[]`. The Markdown wrapper needs
its closing fence on a separate line, so its last record ends with LF or CRLF.
A BOM, multiline record, comment, or two values on one line is rejected.

Both fences use exactly three backticks, begin at column zero, and carry
the exact lowercase label. The opening fence starts at input byte zero; only
JSON whitespace may follow the closing fence. Whitespace within a record is
compacted except inside strings. Duplicate keys, string escapes and number
spellings remain unchanged, even when a number exceeds binary64's range.

Input is caller-supplied UTF-8, at most 64 KiB. Output starts at `0x10000`
and cannot reach `0x30000`. Nesting is limited to 128 containers, including
the new outer array: each record can therefore contain at most 127 nested
containers. Errors trap; callers publish only a successful result. A later
call resets state without requiring a new Wasm instance.

## Pattern: append a validated span, not a parsed object

The shared [JSON descent](02-json-to-list.md) exports `compactSpan`, imported
here as function 0. Each call reads a bounded line of the original input and
writes directly at the current output cursor. There is no substring allocation,
temporary list or JavaScript conversion. Passing depth 1 accounts for the
outer array when checking the shared nesting limit.

```text
write opening JSON fence and '['
for each LF-delimited record:
    write a comma except before the first record
    append compactSpan(recordStart, recordEnd, output, 1)
write ']', LF and closing fence
```

The [reverse tool](15-array-to-json-lines.md) shares this module. It validates
and compacts the entire input array before splitting its top-level elements.
That second scan needs only nesting depth, an in-string flag and skipping the
next byte after a backslash. It does not attempt to recognize JSON syntax a
second time. Replacing a separator with LF cannot change any string data.

## Module and memory

Instantiate the numeric scanner as `n`, the shared JSON parser using `n`,
and this module using that parser as `p`. All share its fixed four-page memory.
Imports are `p.compactSpan` and `p.memory`, actual Wasm exports rather than
host wrappers. Functions: records-to-array 1, array-to-records 2, emit 3,
read-fence 4, write-prefix 5 and finish-fence 6. Globals: output cursor 0 and
input body's end 1. A length-prefixed fence label lives at `0x30100`, separate
from the shared parser's literals at `0x30000`.

The reverse path compacts at `0x10008`, leaving prefix space. The output
`jsonl` prefix occupies nine bytes, replacing the opening array bracket.
The closing bracket becomes the final record's LF, or is discarded for an
empty array. The bound-checked emitter adds the closing fence. No full-buffer
copy is needed in either direction, and the input is never modified.

`[microwasm]`

- ja-header: `0061736d 01000000`
- ja-type-section: `01 {{size:ja-types}}`
  - ja-types: `05 60 04 7f 7f 7f 7f 01 7f 60 01 7f 01 7f 60 01 7f 00 60 02 7f 7f 01 7f 60 00 01 7f`
- ja-import-section: `02 {{size:ja-imports}}`
  - ja-imports: `02 01 70 0b 636f6d706163745370616e 00 00 01 70 06 6d656d6f7279 02 01 04 04`
- ja-function-section: `03 {{size:ja-functions}}`
  - ja-functions: `06 01 01 02 03 02 04`
- ja-global-section: `06 {{size:ja-globals}}`
  - ja-globals: `02 7f 01 41 00 0b 7f 01 41 00 0b`
- ja-export-section: `07 {{size:ja-exports}}`
  - ja-exports: `03 03 72756e 00 01 05 6172726179 00 02 06 6d656d6f7279 02 00`
- ja-code-section: `0a {{size:ja-code}}`
  - ja-code: `06`
    - ja-records-record: `{{size:ja-records-body}}`
      - ja-records-body: `01 03 7f`
        - ja-records-fence: `20 00 41 01 10 04 21 01`
        - ja-records-prefix: `41 808004 24 00 41 00 10 05 41 db00 10 03`
        - ja-records-exit: `02 40`
          - ja-records-loop: `03 40`
            - ja-records-bound: `20 01 23 01 4f 0d 01`
            - ja-line-start: `20 01 21 02`
            - ja-line-exit: `02 40`
              - ja-line-loop: `03 40`
                - ja-line-bound: `20 02 23 01 4f 0d 01`
                - ja-line-lf: `20 02 2d 00 00 41 0a 46 0d 01`
                - ja-line-next: `20 02 41 01 6a 21 02 0c 00 0b`
              - ja-line-end: `0b`
            - ja-record-comma: `20 03 04 40 41 2c 10 03 0b`
            - ja-record-append: `23 00 20 01 20 02 23 00 41 01 10 00 6a 24 00`
            - ja-record-next: `41 01 21 03 20 02 41 01 6a 21 01 0c 00 0b`
          - ja-records-end: `0b`
        - ja-records-close: `41 dd00 10 03 41 0a 10 03 10 06 0b`
    - ja-array-record: `{{size:ja-array-body}}`
      - ja-array-body: `01 06 7f`
        - ja-array-fence: `20 00 41 00 10 04 21 01`
        - ja-array-validate: `20 01 23 01 41 888004 41 00 10 00 21 02`
        - ja-array-minimum: `20 02 41 02 49 04 40 00 0b`
        - ja-array-end-cursor: `41 888004 20 02 6a 41 01 6b 21 02`
        - ja-array-kind: `41 888004 2d 00 00 41 db00 47 20 02 2d 00 00 41 dd00 47 72 04 40 00 0b`
        - ja-array-prefix: `41 808004 24 00 41 01 10 05 41 898004 21 03`
        - ja-array-exit: `02 40`
          - ja-array-loop: `03 40`
            - ja-array-bound: `20 03 20 02 4f 0d 01`
            - ja-array-byte: `20 03 2d 00 00 21 04`
            - ja-array-in-string: `20 05 04 40`
              - ja-array-escaped: `20 04 41 dc00 46 04 40 20 03 41 01 6a 21 03`
                - ja-array-quote-close: `05 20 04 41 22 46 04 40 41 00 21 05 0b 0b`
              - ja-array-outside: `05`
              - ja-array-quote-open: `20 04 41 22 46 04 40 41 01 21 05`
                - ja-array-delimiters: `05`
                - ja-array-nesting-open: `20 04 41 db00 46 20 04 41 fb00 46 72 04 40 20 06 41 01 6a 21 06 0b`
                - ja-array-nesting-close: `20 04 41 dd00 46 20 04 41 fd00 46 72 04 40 20 06 41 01 6b 21 06 0b`
                - ja-array-record-separator: `20 04 41 2c 46 20 06 45 71 04 40 20 03 41 0a 3a 00 00 0b 0b 0b`
            - ja-array-next: `20 03 41 01 6a 21 03 0c 00 0b`
          - ja-array-end: `0b`
        - ja-array-close: `20 02 24 00 20 02 41 898004 4b 04 40 41 0a 10 03 0b 10 06 0b`
    - ja-emit-record: `{{size:ja-emit-body}}`
      - ja-emit-body: `00`
        - ja-emit-bound: `23 00 41 80800c 4f 04 40 00 0b`
        - ja-emit-byte: `23 00 20 00 3a 00 00 23 00 41 01 6a 24 00 0b`
    - ja-fence-record: `{{size:ja-fence-body}}`
      - ja-fence-body: `01 04 7f`
        - ja-fence-bound: `20 00 41 808004 4b 20 00 41 0c 20 01 6a 49 72 04 40 00 0b`
        - ja-fence-label-loop: `03 40`
          - ja-fence-label-byte: `20 02 2d 00 00 41 81820c 20 02 6a 2d 00 00 47 04 40 00 0b`
          - ja-fence-label-next: `20 02 41 01 6a 22 02 41 80820c 2d 00 00 49 0d 00 0b`
        - ja-fence-jsonl: `20 01 04 40 20 02 2d 00 00 41 ec00 47 04 40 00 0b 20 02 41 01 6a 21 02 0b`
        - ja-fence-cr: `20 02 2d 00 00 41 0d 46 04 40 20 02 41 01 6a 21 02 0b`
        - ja-fence-lf: `20 02 2d 00 00 41 0a 47 04 40 00 0b 20 02 41 01 6a 21 03`
        - ja-fence-trim-start: `20 00 21 04`
        - ja-fence-trim-exit: `02 40`
          - ja-fence-trim-loop: `03 40`
            - ja-fence-trim-bound: `20 04 45 0d 01`
            - ja-fence-trim-byte: `20 04 41 01 6b 2d 00 00 21 05`
            - ja-fence-trim-space: `20 05 41 20 46 20 05 41 09 46 72 20 05 41 0a 46 72 20 05 41 0d 46 72 45 0d 01`
            - ja-fence-trim-next: `20 04 41 01 6b 21 04 0c 00 0b`
          - ja-fence-trim-end: `0b`
        - ja-fence-close-bound: `20 04 20 03 41 03 6a 49 04 40 00 0b`
        - ja-fence-close-start: `20 04 41 03 6b 21 02`
        - ja-fence-close-line: `20 02 41 01 6b 2d 00 00 41 0a 47 04 40 00 0b`
        - ja-fence-close-bytes: `20 02 2d 00 00 41 e000 47 20 02 2d 00 01 41 e000 47 72 20 02 2d 00 02 41 e000 47 72 04 40 00 0b`
        - ja-fence-result: `20 02 24 01 20 03 0b`
    - ja-prefix-record: `{{size:ja-prefix-body}}`
      - ja-prefix-body: `01 02 7f`
        - ja-prefix-start: `41 81820c 21 01 41 81820c 41 80820c 2d 00 00 6a 21 02`
        - ja-prefix-loop: `03 40`
          - ja-prefix-byte: `20 01 2d 00 00 10 03`
          - ja-prefix-next: `20 01 41 01 6a 22 01 20 02 49 0d 00 0b`
        - ja-prefix-label: `20 00 04 40 41 ec00 10 03 0b 41 0a 10 03 0b`
    - ja-finish-record: `{{size:ja-finish-body}}`
      - ja-finish-body: `00 41 e000 10 03 41 e000 10 03 41 e000 10 03 41 0a 10 03 23 00 41 808004 6b 0b`
- ja-data-section: `0b {{size:ja-data}}`
  - ja-data: `01 00 41 80820c 0b {{size:ja-literals}}`
    - ja-literals: `07 6060606a736f6e`

Records locals: input length 0, record start 1, record end 2, first-record
flag 3. Array locals: length 0, input body start 1, output end 2, cursor 3,
byte 4, in-string flag 5, nesting depth 6. Fence locals: length 0, dialect 1,
cursor 2, body start 3, trimmed end 4, byte 5. All output stores stay
in the output region, including the reverse path's in-place separator writes.
