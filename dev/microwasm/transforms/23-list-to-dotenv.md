# Markdown string properties to dotenv

Tool 23 writes a flat object of strings as a `dotenv` fenced block. It pairs
with [the dotenv reader](22-dotenv-to-list.md); no environment is modified.

```text
- {}
  - NAME Ben
  - PORT "3030"
  - GREETING "Hello # friend"
  - LINES "first\nsecond"
  - LITERAL "${NAME}"
  - EMPTY ""
```

becomes:

```dotenv
NAME=Ben
PORT=3030
GREETING="Hello # friend"
LINES="first\nsecond"
LITERAL=${NAME}
EMPTY=
```

## Quote for this dialect, not for a shell

Names must be nonempty ASCII letters, digits, underscores, dots or hyphens.
Names are case-sensitive and duplicates are errors. Root arrays, nested
objects/arrays and typed non-string values are rejected. All strings are
decoded from the list's JSON quoting, including surrogate pairs. Lone
surrogates, C0 controls other than tab/LF/CR, and DEL are rejected.

Unquoted values are preferred when they have no `#` or line breaks, no outer
space/tab and do not begin with a quote delimiter. Empty strings use `NAME=`.
Otherwise the writer tries double quotes, single quotes, then backticks.
Double quotes encode LF/CR as `\n`/`\r`. Single quotes and backticks preserve
physical LF, but cannot preserve CR because dotenv normalizes physical CR.

The reader retains a backslash before a matching quote. Accordingly, a quote
delimiter is usable only when occurrences of it in the value already have a
preceding backslash. The writer never invents those backslashes. Double
quotes also cannot preserve an existing literal `\n` or `\r` sequence, so
those values use unquoted or literal-quoted text. A trailing backslash rules
out all quoted forms in this strict dialect; an ordinary unquoted path is
still fine. If no form preserves the value, conversion fails rather than
silently changing it. This is dotenv data, **not shell-escaped commands**.

The surrounding Markdown matters too: if a literal multiline value contains
a line that could close a three-backtick fence, the writer uses a longer
fence. Other backticks remain ordinary data. This keeps the rendered contents
consistent with the source without changing the value. There is no
interpolation, variable expansion, command substitution or environment lookup.
Consumers that perform
such operations have their own policies beyond this transformation.

## Pattern: one string decode, then a small choice of encodings

```text
compile the list to validated compact JSON; copy its body to scratch
require a flat object of uniquely named strings
for each assignment:
  decode and validate its name; write name + '='
  decode its value to temporary UTF-8 in the output region
  scan those bytes to determine which quoting forms preserve the value
  render the chosen form after the temporary bytes
  copy that result back over the temporary bytes, then emit a newline
enlarge both fences if a literal value contains a closing-fence line
```

The temporary value is reused immediately; there is no retained tree or heap.
The JSON decoder is shared with the visible INI-writer pattern, while the
byte scan handles destination quoting without decoding Unicode twice.
Duplicate checks rescan earlier validated JSON keys, with quadratic cost for
wide objects and constant extra space. Import calls go directly between Wasm
modules; JavaScript does not convert the data.

Input and compact intermediate JSON each have a 64 KiB limit. Temporary and
final output share the next 128 KiB; every write is bounded. The last page
holds the JSON body instead of the list compiler's finished stack. Original
input stays unchanged. A failed run must not publish partial output, and a
subsequent run rebuilds the stack and resets all cursors. A very long embedded
backtick line can expand the output beyond the reader's 64 KiB input limit;
round trips are subject to both tools' memory limits.

## Module

Imports: list-run 0, equal 1, next-unit 2 and memory. Definitions: run 3,
emit 4, scan 5, decode 6, UTF-8 7, format 8, unique 9, name-byte 10,
fence-size 11. Globals: output 0, source cursor 1, source end 2, fence length 3.

`[microwasm]`

- ld-header: `0061736d 01000000`
- ld-type-section: `01 {{size:ld-types}}`
  - ld-types: `06 60 01 7f 01 7f 60 04 7f 7f 7f 7f 01 7f 60 03 7f 7f 7f 03 7f 7f 7f 60 01 7f 00 60 03 7f 7f 7f 00 60 02 7f 7f 00`
- ld-import-section: `02 {{size:ld-imports}}`
  - ld-imports: `04 01 6c 03 72756e 00 00 01 6b 05 657175616c 00 01 01 6b 04 6e657874 00 02 01 6c 06 6d656d6f7279 02 01 04 04`
- ld-function-section: `03 {{size:ld-functions}}`
  - ld-functions: `09 00 03 00 04 03 03 04 00 05`
- ld-global-section: `06 {{size:ld-globals}}`
  - ld-globals: `04 7f 01 41 00 0b 7f 01 41 00 0b 7f 01 41 00 0b 7f 01 41 03 0b`
- ld-export-section: `07 {{size:ld-exports}}`
  - ld-exports: `02 03 72756e 00 03 06 6d656d6f7279 02 00`
- ld-code-section: `0a {{size:ld-code}}`
  - ld-code: `09`
    - ld-run-record: `{{size:ld-run-body}}`
      - ld-run-body: `01 06 7f`
        - ld-compile: `20 00 10 00 41 0d 6b 21 01`
        - ld-source-bound: `20 01 45 20 01 41 808004 4b 72 04 40 00 0b`
        - ld-source-copy: `41 80800c 41 888004 20 01 fc 0a 00 00`
        - ld-reset: `41 808004 24 00 41 80800c 24 01 41 80800c 20 01 6a 24 02 41 03 24 03`
        - ld-root-kind: `23 01 2d 00 00 41 fb00 47 04 40 00 0b 23 01 41 01 6a 24 01 23 01 21 02`
        - ld-fence: `41 e000 10 04 41 e000 10 04 41 e000 10 04 41 e400 10 04 41 ef00 10 04 41 f400 10 04 41 e500 10 04 41 ee00 10 04 41 f600 10 04 41 0a 10 04`
        - ld-root-loop: `02 40 03 40`
          - ld-root-close: `23 01 2d 00 00 41 fd00 46 0d 01`
          - ld-key-span: `23 01 21 03 23 01 10 05 21 04 20 02 20 03 20 04 10 09`
          - ld-key-output: `20 03 20 04 41 01 10 06 41 3d 10 04 20 04 41 01 6a 24 01`
          - ld-value-kind: `23 01 2d 00 00 41 22 47 04 40 00 0b 23 01 10 05 21 05 23 00 21 06`
          - ld-value-output: `23 01 20 05 41 00 10 06 20 06 10 08 41 0a 10 04 20 05 24 01`
          - ld-root-next: `23 01 2d 00 00 41 fd00 46 0d 01 23 01 41 01 6a 24 01 0c 00 0b 0b`
        - ld-root-end: `23 01 41 01 6a 23 02 47 04 40 00 0b`
        - ld-fence-extra: `23 03 41 03 6b 21 01 23 00 20 01 6a 41 80800c 4b 04 40 00 0b`
        - ld-fence-shift: `41 808004 20 01 6a 41 808004 23 00 41 808004 6b fc 0a 00 00 23 00 20 01 6a 24 00 41 00 21 02`
        - ld-fence-fill: `02 40 03 40 20 02 20 01 4f 0d 01 41 808004 20 02 6a 41 e000 3a 00 00 20 02 41 01 6a 21 02 0c 00 0b 0b 41 00 21 02`
        - ld-close: `03 40 41 e000 10 04 20 02 41 01 6a 22 02 23 03 49 0d 00 0b 41 0a 10 04 23 00 41 808004 6b 0b`
    - ld-emit-record: `{{size:ld-emit-body}}`
      - ld-emit-body: `00 23 00 41 80800c 4f 04 40 00 0b 23 00 20 00 3a 00 00 23 00 41 01 6a 24 00 0b`
    - ld-scan-record: `{{size:ld-scan-body}}`
      - ld-scan-body: `01 03 7f`
        - ld-scan-exit: `02 40`
          - ld-scan-loop: `03 40`
            - ld-scan-bound: `20 00 23 02 4f 0d 01`
            - ld-scan-byte: `20 00 2d 00 00 21 03`
            - ld-scan-string: `20 02 04 40`
              - ld-scan-escape: `20 03 41 dc00 46 04 40 20 00 41 01 6a 21 00`
                - ld-scan-string-close: `05 20 03 41 22 46 04 40 41 00 21 02 0b 0b`
              - ld-scan-outside: `05 20 03 41 22 46 04 40 41 01 21 02`
                - ld-scan-structure: `05`
                - ld-scan-stop: `20 01 45 20 03 41 2c 46 20 03 41 3a 46 72 20 03 41 dd00 46 72 20 03 41 fd00 46 72 71 0d 03`
                - ld-scan-open: `20 03 41 db00 46 20 03 41 fb00 46 72 04 40 20 01 41 01 6a 21 01 0b`
                - ld-scan-close: `20 03 41 dd00 46 20 03 41 fd00 46 72 04 40 20 01 41 01 6b 21 01 0b 0b 0b`
            - ld-scan-next: `20 00 41 01 6a 21 00 0c 00 0b 0b`
        - ld-scan-result: `20 00 0b`
    - ld-decode-record: `{{size:ld-decode-body}}`
      - ld-decode-body: `01 04 7f`
        - ld-decode-open: `20 00 41 01 6a 21 00 20 01 41 01 6b 21 01`
        - ld-decode-exit: `02 40 03 40`
          - ld-decode-unit: `20 00 20 01 20 03 10 02 21 03 21 00 21 04`
          - ld-decode-end: `20 04 41 7f 46 0d 01`
          - ld-decode-high: `20 04 41 80b003 6b 41 ff07 4d 04 40`
            - ld-decode-low: `20 00 20 01 20 03 10 02 21 03 21 00 21 05`
            - ld-decode-low-check: `20 05 41 80b803 6b 41 ff07 4b 04 40 00 0b`
            - ld-decode-pair: `20 04 41 80b003 6b 41 0a 74 20 05 41 80b803 6b 6a 41 808004 6a 21 04`
            - ld-decode-lone-low: `05 20 04 41 80b803 6b 41 ff07 4d 04 40 00 0b 0b`
          - ld-decode-control: `20 04 41 20 49 20 04 41 09 47 71 20 04 41 0a 47 71 20 04 41 0d 47 71 20 04 41 ff00 46 72 04 40 00 0b`
          - ld-decode-key: `20 02 04 40 20 04 10 0a 45 04 40 00 0b 0b`
          - ld-decode-copy: `20 04 10 07 20 06 41 01 6a 21 06 0c 00 0b 0b`
        - ld-decode-empty-key: `20 02 20 06 45 71 04 40 00 0b 0b`
    - ld-utf8-record: `{{size:ld-utf8-body}}`
      - ld-utf8-body: `00`
        - ld-utf8-ascii: `20 00 41 8001 49 04 40 20 00 10 04 0f 0b`
        - ld-utf8-two: `20 00 41 8010 49 04 40 20 00 41 06 76 41 c001 72 10 04`
          - ld-utf8-more: `05 20 00 41 808004 49 04 40 20 00 41 0c 76 41 e001 72 10 04`
            - ld-utf8-four: `05 20 00 41 12 76 41 f001 72 10 04 20 00 41 0c 76 41 3f 71 41 8001 72 10 04 0b`
          - ld-utf8-middle: `20 00 41 06 76 41 3f 71 41 8001 72 10 04 0b`
        - ld-utf8-last: `20 00 41 3f 71 41 8001 72 10 04 0b`
    - ld-format-record: `{{size:ld-format-body}}`
      - ld-format-body: `01 08 7f`
        - ld-format-start: `23 00 21 01 41 0f 21 02 20 00 21 05`
        - ld-format-scan: `02 40 03 40 20 05 20 01 4f 0d 01 20 05 2d 00 00 21 04`
          - ld-format-unquoted: `20 04 41 23 46 20 04 41 0a 46 72 20 04 41 0d 46 72 04 40 20 02 41 0e 71 21 02 0b`
          - ld-format-first: `20 05 20 00 46 04 40 20 04 41 20 46 20 04 41 09 46 72 20 04 41 22 46 72 20 04 41 27 46 72 20 04 41 e000 46 72 04 40 20 02 41 0e 71 21 02 0b 0b`
          - ld-format-single: `20 04 41 27 46 20 03 41 dc00 47 71 04 40 20 02 41 0d 71 21 02 0b`
          - ld-format-backtick: `20 04 41 e000 46 20 03 41 dc00 47 71 04 40 20 02 41 0b 71 21 02 0b`
          - ld-format-double: `20 04 41 22 46 20 03 41 dc00 47 71 20 03 41 dc00 46 20 04 41 ee00 46 20 04 41 f200 46 72 71 72 04 40 20 02 41 07 71 21 02 0b`
          - ld-format-cr: `20 04 41 0d 46 04 40 20 02 41 09 71 21 02 0b`
          - ld-format-next: `20 04 21 03 20 05 41 01 6a 21 05 0c 00 0b 0b`
        - ld-format-last-space: `20 03 41 20 46 20 03 41 09 46 72 04 40 20 02 41 0e 71 21 02 0b`
        - ld-format-last-slash: `20 03 41 dc00 46 04 40 20 02 41 01 71 21 02 0b`
        - ld-format-choice: `20 02 41 01 71 04 40 41 00 21 06 05 20 02 41 08 71 04 40 41 22 21 06 05 20 02 41 02 71 04 40 41 27 21 06 05 20 02 41 04 71 04 40 41 e000 21 06 05 00 0b 0b 0b 0b`
        - ld-format-render-start: `23 00 21 07 20 06 04 40 20 06 10 04 0b 20 00 21 05`
        - ld-format-render: `02 40 03 40 20 05 20 01 4f 0d 01 20 05 2d 00 00 21 04`
          - ld-format-render-newline: `20 06 41 22 46 20 04 41 0a 46 20 04 41 0d 46 72 71 04 40 41 dc00 10 04 20 04 41 0a 46 04 7f 41 ee00 05 41 f200 0b 10 04 05 20 04 10 04 0b`
          - ld-format-render-next: `20 05 41 01 6a 21 05 0c 00 0b 0b`
        - ld-format-render-close: `20 06 04 40 20 06 10 04 0b`
        - ld-format-fence: `20 06 41 27 46 20 06 41 e000 46 72 04 40 20 07 23 00 10 0b 0b`
        - ld-format-copy: `23 00 20 07 6b 21 08 20 00 20 07 20 08 fc 0a 00 00 20 00 20 08 6a 24 00 0b`
    - ld-unique-record: `{{size:ld-unique-body}}`
      - ld-unique-body: `01 01 7f 02 40 03 40 20 00 20 01 4f 0d 01 20 00 10 05 21 03 20 00 20 03 20 01 20 02 10 01 04 40 00 0b 20 03 41 01 6a 10 05 41 01 6a 21 00 0c 00 0b 0b 0b`
    - ld-name-byte-record: `{{size:ld-name-byte-body}}`
      - ld-name-byte-body: `00 20 00 41 c100 6b 41 19 4d 20 00 41 e100 6b 41 19 4d 72 20 00 41 30 6b 41 09 4d 72 20 00 41 df00 46 72 20 00 41 2e 46 72 20 00 41 2d 46 72 0b`
    - ld-fence-size-record: `{{size:ld-fence-size-body}}`
      - ld-fence-size-body: `01 02 7f 02 40 03 40 20 00 20 01 4f 0d 01`
        - ld-fence-newline: `20 00 2d 00 00 41 0a 46 04 40 20 00 41 01 6a 21 02 41 00 21 03`
          - ld-fence-indent: `02 40 03 40 20 02 20 01 4f 20 03 41 03 4f 72 0d 01 20 02 2d 00 00 41 20 47 0d 01 20 03 41 01 6a 21 03 20 02 41 01 6a 21 02 0c 00 0b 0b 41 00 21 03`
          - ld-fence-ticks: `02 40 03 40 20 02 20 01 4f 0d 01 20 02 2d 00 00 41 e000 47 0d 01 20 03 41 01 6a 21 03 20 02 41 01 6a 21 02 0c 00 0b 0b`
          - ld-fence-candidate: `20 03 41 03 4f 04 40`
            - ld-fence-trailing: `02 40 03 40 20 02 20 01 4f 0d 01 20 02 2d 00 00 41 20 46 20 02 2d 00 00 41 09 46 72 45 0d 01 20 02 41 01 6a 21 02 0c 00 0b 0b`
            - ld-fence-required: `20 02 20 01 49 04 40 20 02 2d 00 00 41 0a 46 20 03 23 03 4f 71 04 40 20 03 41 01 6a 24 03 0b 0b 0b 0b`
        - ld-fence-next: `20 00 41 01 6a 21 00 0c 00 0b 0b 0b`

Decode locals: source cursor/end 0/1, key flag 2, pending surrogate 3,
scalar 4, low surrogate 5, count 6. Format locals: raw start/end 0/1,
candidate flags 2 (unquoted 1, single 2, backtick 4, double 8), previous byte 3,
current byte 4, cursor 5, delimiter 6, rendered start 7, rendered length 8.
