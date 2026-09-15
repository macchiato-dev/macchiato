# Pipe tables and decimal character references

[Block structure](04-blocks.md) · [Next: literal data](05-data.md)

These helpers support the transformation tools' table output and the tables
in the numeric documentation. They recognize rows beginning and ending with
`|`, with a header followed by a matching separator row. Separator cells have
at least three hyphens and optional surrounding colons. Alignment markers are
accepted but do not add styles. Every body row must have the header's width;
the first different row ends the table and is read as another Markdown block.

This is a deliberately small table dialect, not all GFM table syntax. Use
`&#124;` or `\|` inside a cell for a literal pipe. Outer pipes are required.
Backslash escapes of ASCII punctuation are decoded by the inline reader.
Cell-edge spaces and tabs are
formatting; encode significant ones as character references. CRLF works.

## Pattern: probe without emitting, then render

`row(start, end, mode)` returns a column count, or zero for invalid structure.
Mode 0 probes a normal row, 3 validates a separator, 1 emits header cells and
2 emits body cells. `table(start, length, render)` first probes the header and
separator. With render zero it returns just the next offset; otherwise it
emits the complete table. This lets the block reader close a paragraph or list
only after recognizing an actual table. Rows are scanned a constant number
of times, without a node tree or retained cell array.

Cell content uses the regular inline renderer. Decimal character references
are recognized there, but not inside code spans or code fences. Validation
allows only `&#` followed by one to seven decimal digits, a semicolon, and a
value from 1 through 0x10ffff. The original reference is emitted unchanged.
HTML decodes it as text; a reference to `<` never becomes an opening tag.
Malformed references go through normal escaping. There is no raw HTML path.

```text
if header has outer pipes and separator has the same column count:
    close any preceding paragraph/list
    emit table, header row, and body opening
    while the next row has matching outer pipes and width:
        trim cell-edge formatting; render each inline span
    close table; resume the ordinary block reader
```

## Function 8: row

Locals: start 0, end 1, mode 2, position 3, next pipe 4, cell start 5,
cell end 6, column count 7. Probe modes never write output.

`[microwasm]`

- row-record: `{{size:row-body}}`
  - row-body: `01 05 7f`
    - row-trim-exit: `02 40`
      - row-trim-loop: `03 40`
        - row-trim-bound: `20 01 20 00 4d 0d 01`
        - row-trim-byte: `20 01 41 01 6b 2d 00 00 21 03`
        - row-trim-space: `20 03 41 20 46 20 03 41 09 46 72 20 03 41 0d 46 72 45 0d 01`
        - row-trim-next: `20 01 41 01 6b 21 01 0c 00 0b`
      - row-trim-end: `0b`
    - row-minimum: `20 01 20 00 6b 41 02 49 04 40 41 00 0f 0b`
    - row-outer: `20 00 2d 00 00 41 fc00 47 20 01 41 01 6b 2d 00 00 41 fc00 47 72 04 40 41 00 0f 0b`
    - row-open: `20 02 41 01 6b 41 02 49 04 40 41 bd01 10 02 0b`
    - row-position: `20 00 41 01 6a 21 03`
    - row-exit: `02 40`
      - row-loop: `03 40`
        - row-bound: `20 03 20 01 4f 0d 01`
        - row-pipe-position: `20 03 21 04`
        - row-pipe-exit: `02 40`
          - row-pipe-loop: `03 40`
            - row-pipe-bound: `20 04 20 01 4f 04 40 41 00 0f 0b`
            - row-pipe-found: `20 04 2d 00 00 41 fc00 46 0d 01`
            - row-pipe-escape: `20 04 2d 00 00 41 dc00 46 04 40 20 04 41 01 6a 21 04 0b`
            - row-pipe-next: `20 04 41 01 6a 21 04 0c 00 0b`
          - row-pipe-end: `0b`
        - row-cell-range: `20 03 21 05 20 04 21 06`
        - row-leading-exit: `02 40`
          - row-leading-loop: `03 40`
            - row-leading-bound: `20 05 20 06 4f 0d 01`
            - row-leading-byte: `20 05 2d 00 00 41 20 46 20 05 2d 00 00 41 09 46 72 45 0d 01`
            - row-leading-next: `20 05 41 01 6a 21 05 0c 00 0b`
          - row-leading-end: `0b`
        - row-trailing-exit: `02 40`
          - row-trailing-loop: `03 40`
            - row-trailing-bound: `20 06 20 05 4d 0d 01`
            - row-trailing-byte: `20 06 41 01 6b 2d 00 00 41 20 46 20 06 41 01 6b 2d 00 00 41 09 46 72 45 0d 01`
            - row-trailing-next: `20 06 41 01 6b 21 06 0c 00 0b`
          - row-trailing-end: `0b`
        - row-rule: `20 02 41 03 46 04 40`
          - row-rule-leading-room: `20 05 20 06 49 04 40`
            - row-rule-leading-colon: `20 05 2d 00 00 41 3a 46 04 40 20 05 41 01 6a 21 05 0b 0b`
          - row-rule-trailing-room: `20 05 20 06 49 04 40`
            - row-rule-trailing-colon: `20 06 41 01 6b 2d 00 00 41 3a 46 04 40 20 06 41 01 6b 21 06 0b 0b`
          - row-rule-minimum: `20 06 20 05 6b 41 03 49 04 40 41 00 0f 0b`
          - row-rule-loop: `03 40`
            - row-rule-hyphen: `20 05 2d 00 00 41 2d 47 04 40 41 00 0f 0b`
            - row-rule-next: `20 05 41 01 6a 22 05 20 06 49 0d 00 0b 0b`
        - row-render: `20 02 41 01 6b 41 02 49 04 40`
          - row-cell-open: `20 02 41 01 46 04 7f 41 c901 05 41 d401 0b 10 02`
          - row-cell-content: `20 05 20 06 10 05`
          - row-cell-close: `20 02 41 01 46 04 7f 41 ce01 05 41 d901 0b 10 02 0b`
        - row-next: `20 07 41 01 6a 21 07 20 04 41 01 6a 21 03 0c 00 0b`
      - row-end: `0b`
    - row-close: `20 02 41 01 6b 41 02 49 04 40 41 c201 10 02 0b`
    - row-result: `20 07 0b`

## Function 9: table

Locals: start 0, input length 1, render flag 2, header end 3, rule start 4,
rule end 5, width 6, row position 7, row end 8. The line scanner's EOF offset
may be length + 1, which the main loop already treats as finished.

`[microwasm]`

- table-record: `{{size:table-body}}`
  - table-body: `01 06 7f`
    - table-header-end: `20 00 20 01 41 0a 10 03 21 03`
    - table-rule-start: `20 03 41 01 6a 22 04 20 01 4f 04 40 41 00 0f 0b`
    - table-rule-end: `20 04 20 01 41 0a 10 03 21 05`
    - table-header-width: `20 00 20 03 41 00 10 08 22 06 45 04 40 41 00 0f 0b`
    - table-rule-width: `20 04 20 05 41 03 10 08 20 06 47 04 40 41 00 0f 0b`
    - table-probe: `20 02 45 04 40 20 05 41 01 6a 0f 0b`
    - table-open: `41 8c01 10 02 20 00 20 03 41 01 10 08 1a 41 9b01 10 02`
    - table-position: `20 05 41 01 6a 21 07`
    - table-exit: `02 40`
      - table-loop: `03 40`
        - table-bound: `20 07 20 01 4f 0d 01`
        - table-line: `20 07 20 01 41 0a 10 03 21 08`
        - table-row-width: `20 07 20 08 41 00 10 08 20 06 47 0d 01`
        - table-row-render: `20 07 20 08 41 02 10 08 1a`
        - table-next: `20 08 41 01 6a 21 07 0c 00 0b`
      - table-end: `0b`
    - table-close: `41 ab01 10 02 20 07 0b`

## Function 10: character-reference

Locals: start 0, end 1, scan 2, byte 3, numeric value 4. A successful call
emits the validated reference and returns the next offset. Zero means no
match and emits nothing. Maximum scanning distance is ten bytes.

`[microwasm]`

- entity-record: `{{size:entity-body}}`
  - entity-body: `01 03 7f`
    - entity-room: `20 00 41 03 6a 20 01 4f 04 40 41 00 0f 0b`
    - entity-hash: `20 00 2d 00 01 41 23 47 04 40 41 00 0f 0b`
    - entity-position: `20 00 41 02 6a 21 02`
    - entity-exit: `02 40`
      - entity-loop: `03 40`
        - entity-bound: `20 02 20 01 4f 04 40 41 00 0f 0b`
        - entity-byte: `20 02 2d 00 00 21 03`
        - entity-semicolon: `20 03 41 3b 46 0d 01`
        - entity-digit: `20 03 41 30 6b 41 09 4b 20 02 20 00 6b 41 09 4f 72 04 40 41 00 0f 0b`
        - entity-accumulate: `20 04 41 0a 6c 20 03 41 30 6b 6a 21 04`
        - entity-next: `20 02 41 01 6a 21 02 0c 00 0b`
      - entity-end: `0b`
    - entity-value: `20 04 45 20 04 41 ffffc300 4b 72 04 40 41 00 0f 0b`
    - entity-after: `20 02 41 01 6a 21 02`
    - entity-copy-loop: `03 40`
      - entity-copy-byte: `20 00 2d 00 00 10 00`
      - entity-copy-next: `20 00 41 01 6a 22 00 20 02 49 0d 00 0b`
    - entity-result: `20 02 0b`

## Functions 11–12: decoded text and unescaped delimiters

Links need the same punctuation/reference decoding as ordinary prose, but
must not open another inline element inside an attribute or link label.
`decoded(start, end)` therefore has only three paths: decode a punctuation
escape, retain a valid numeric reference as an HTML reference, or HTML-escape
one ordinary byte. It never calls the inline renderer recursively.

`delimiter(start, end, target)` probes without writing. A backslash consumes
the following byte for scanning purposes; an unescaped target returns its
offset. At exhaustion it returns `end`, even if a trailing backslash advanced
the local scan position one past it. The bound test precedes every load.
The caller keeps ownership of both delimiters and decides what a miss means.

Both routines advance monotonically and allocate nothing. Scanning and
decoding remain separate so an escaped closing bracket cannot end a link
label, and decoding an entity to a quote cannot create another HTML attribute.

`[microwasm]`

- decoded-record: `{{size:decoded-body}}`
  - decoded-body: `01 02 7f`
    - decoded-loop: `02 40 03 40 20 00 20 01 4f 0d 01 20 00 2d 00 00 21 02`
      - decoded-slash: `20 02 41 dc00 46 20 00 41 01 6a 20 01 49 71 04 40 20 00 2d 00 01 21 03`
        - decoded-punctuation: `20 03 41 21 6b 41 0e 4d 20 03 41 3a 6b 41 06 4d 72 20 03 41 db00 6b 41 05 4d 72 20 03 41 fb00 6b 41 03 4d 72 04 40 20 03 10 01 20 00 41 02 6a 21 00 0c 02 0b 0b`
      - decoded-reference: `20 02 41 26 46 04 40 20 00 20 01 10 0a 22 03 04 40 20 03 21 00 0c 02 0b 0b`
      - decoded-byte: `20 02 10 01 20 00 41 01 6a 21 00 0c 00 0b 0b 0b`
- delimiter-record: `{{size:delimiter-body}}`
  - delimiter-body: `00`
    - delimiter-loop: `02 40 03 40 20 00 20 01 4f 0d 01`
      - delimiter-slash: `20 00 2d 00 00 41 dc00 46 04 40 20 00 41 02 6a 21 00 0c 01 0b`
      - delimiter-match: `20 00 2d 00 00 20 02 46 04 40 20 00 0f 0b`
      - delimiter-next: `20 00 41 01 6a 21 00 0c 00 0b 0b`
    - delimiter-missing: `20 01 0b`
