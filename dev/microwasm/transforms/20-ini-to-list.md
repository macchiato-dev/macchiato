# INI sections and assignments to a Markdown data list

Tool 20 reads an `ini` fenced block and emits a two-level object list:
sections contain string-valued assignments. Assignments before the first
header go in the unnamed section, represented by the empty string key.
Named empty sections remain present. An entirely empty document becomes
the empty root object, not an invented unnamed section.

```ini
name = Ben

[server]
host = localhost
port: 3030

[paths]
root = C:\projects
```

becomes:

```text
- {}
  - "" {}
    - "name" "Ben"
  - "server" {}
    - "host" "localhost"
    - "port" "3030"
  - "paths" {}
    - "root" "C:\\projects"
```

## An explicit INI dialect

INI has dialects, not a single universally implemented grammar. This reader
uses the first `=` or `:` on an assignment line as its delimiter. Surrounding
spaces and tabs are stripped from keys, values and section names. Internal
spaces remain. Names are case-sensitive. Duplicate keys in one section and
repeated section headers are errors instead of silently overwriting values.

Blank lines and whole-line `#` or `;` comments are ignored. A section header
may have a whitespace-separated trailing comment. Assignment values do not
have inline comments: `value = a # b` contains the literal string `a # b`.
Quotes and backslashes are literal too; there is no interpolation, escaping,
type inference or special `DEFAULT` section. Thus `false`, `123`, `"quoted"`
and `%(name)s` all remain their exact strings after outer whitespace trimming.

Empty named headers, nested brackets in headers, valueless keys and
continuation lines are not supported. Each non-comment physical line must
be a header or assignment. Newlines may be LF or CRLF, not bare CR. Raw
controls other than tab and malformed UTF-8 are rejected, including in
comments. The fence uses exactly three backticks and `ini`; no prose surrounds
it. This dialect is deliberately documented rather than called universal INI.

## Pattern: sections provide the only structural state

```text
write the root object marker
for each significant line:
  header:
    parse and validate its name and optional trailing comment
    reject a previous section with the same name
    emit its object marker; remember the start of its entries
  assignment:
    split at the first '=' or ':'; trim both spans
    create the unnamed section if no section has been encountered
    reject an earlier key in the current section
    emit the JSON-quoted key and JSON-quoted value
```

The line scanner validates UTF-8 once, before any line is classified.
Quoting then only needs to escape quotes, backslashes and tabs. The existing
Wasm string comparator checks earlier emitted keys; indentation distinguishes
section names from assignment names. This avoids a retained object tree or
reference table, at the cost of quadratic scans for wide sections.

The original input occupies the first 64 KiB; output occupies the next
128 KiB. Seven fixed fence bytes sit in the last page. Every output store is
bounded. A trap may leave partial output, which the host must not publish.
Every run resets its state and can recover after an error without a new
instance. No JavaScript conversion or host-side INI parsing is involved.

## Module

Imports: equal 0, next-unit 1 and memory from `k`. Functions: run 2, emit 3,
prefix 4, next-line 5, quote 6, duplicate 7, quote-end 8, whitespace 9,
trim 10, section 11, assignment 12.
Globals: output 0, next line 1, body end 2, line start/end 3/4, line present 5,
current section's first output entry 6 (zero when there is no section yet).

`[microwasm]`

- il-header: `0061736d 01000000`
- il-type-section: `01 {{size:il-types}}`
  - il-types: `09 60 04 7f 7f 7f 7f 01 7f 60 03 7f 7f 7f 03 7f 7f 7f 60 01 7f 01 7f 60 01 7f 00 60 00 00 60 02 7f 7f 00 60 05 7f 7f 7f 7f 7f 00 60 02 7f 7f 01 7f 60 02 7f 7f 02 7f 7f`
- il-import-section: `02 {{size:il-imports}}`
  - il-imports: `03 01 6b 05 657175616c 00 00 01 6b 04 6e657874 00 01 01 6b 06 6d656d6f7279 02 01 04 04`
- il-function-section: `03 {{size:il-functions}}`
  - il-functions: `0b 02 03 03 04 05 06 07 02 08 04 04`
- il-global-section: `06 {{size:il-globals}}`
  - il-globals: `07 7f 01 41 00 0b 7f 01 41 00 0b 7f 01 41 00 0b 7f 01 41 00 0b 7f 01 41 00 0b 7f 01 41 00 0b 7f 01 41 00 0b`
- il-export-section: `07 {{size:il-exports}}`
  - il-exports: `02 03 72756e 00 02 06 6d656d6f7279 02 00`
- il-code-section: `0a {{size:il-code}}`
  - il-code: `0b`
    - il-run-record: `{{size:il-run-body}}`
      - il-run-body: `01 02 7f`
        - il-run-bound: `20 00 41 0a 49 20 00 41 808004 4b 72 04 40 00 0b`
        - il-run-prefix: `03 40 20 01 2d 00 00 20 01 41 81820c 6a 2d 00 00 47 04 40 00 0b 20 01 41 01 6a 22 01 41 06 49 0d 00 0b`
        - il-run-opening: `41 06 24 01 41 06 2d 00 00 41 0d 46 04 40 41 07 24 01 0b 23 01 2d 00 00 41 0a 47 04 40 00 0b 23 01 41 01 6a 24 01 20 00 21 01`
        - il-run-trim: `02 40 03 40 20 01 45 0d 01 20 01 41 01 6b 2d 00 00 10 09 45 0d 01 20 01 41 01 6b 21 01 0c 00 0b 0b`
        - il-run-closing-bound: `20 01 23 01 41 03 6a 49 04 40 00 0b 20 01 41 03 6b 24 02`
        - il-run-closing: `03 40 23 02 20 02 6a 2d 00 00 41 e000 47 04 40 00 0b 20 02 41 01 6a 22 02 41 03 49 0d 00 0b`
        - il-run-closing-line: `23 02 23 01 47 04 40 23 02 41 01 6b 2d 00 00 41 0a 47 04 40 00 0b 0b`
        - il-run-root: `41 808004 24 00 41 00 24 06 41 00 10 04 41 fb00 10 03 41 fd00 10 03 41 0a 10 03 10 05`
        - il-run-loop: `02 40 03 40 23 05 45 0d 01 23 03 2d 00 00 41 db00 46 04 40 10 0b 05 10 0c 0b 10 05 0c 00 0b 0b`
        - il-run-result: `23 00 41 808004 6b 0b`
    - il-emit-record: `{{size:il-emit-body}}`
      - il-emit-body: `00 23 00 41 80800c 4f 04 40 00 0b 23 00 20 00 3a 00 00 23 00 41 01 6a 24 00 0b`
    - il-prefix-record: `{{size:il-prefix-body}}`
      - il-prefix-body: `00 02 40 03 40 20 00 45 0d 01 41 20 10 03 41 20 10 03 20 00 41 01 6b 21 00 0c 00 0b 0b 41 2d 10 03 41 20 10 03 0b`
    - il-line-record: `{{size:il-line-body}}`
      - il-line-body: `01 02 7f`
        - il-line-reset: `41 00 24 05`
        - il-line-loop: `03 40`
          - il-line-bound: `23 01 23 02 4f 04 40 0f 0b 23 01 24 03 23 01 21 00`
          - il-line-scan: `02 40 03 40 20 00 23 02 4f 0d 01 20 00 2d 00 00 41 0a 46 0d 01 20 00 41 01 6a 21 00 0c 00 0b 0b`
          - il-line-advance: `20 00 20 00 23 02 49 6a 24 01`
          - il-line-cr: `20 00 23 03 4b 04 40 20 00 41 01 6b 2d 00 00 41 0d 46 04 40 20 00 41 01 6b 21 00 0b 0b 20 00 24 04 23 03 21 00`
          - il-line-validate: `02 40 03 40 20 00 23 04 4f 0d 01 20 00 2d 00 00 21 01`
            - il-line-control: `20 01 41 20 49 20 01 41 09 47 71 20 01 41 ff00 46 72 04 40 00 0b`
            - il-line-unicode: `20 01 41 8001 4f 04 40 20 00 23 04 41 00 10 01 1a 21 00 1a`
              - il-line-ascii: `05 20 00 41 01 6a 21 00 0b`
            - il-line-validate-next: `0c 00 0b 0b`
          - il-line-trim: `23 03 23 04 10 0a 24 04 24 03`
          - il-line-empty: `23 03 23 04 46 0d 00`
          - il-line-comment: `23 03 2d 00 00 41 23 46 23 03 2d 00 00 41 3b 46 72 0d 00`
          - il-line-ready: `41 01 24 05 0f 0b 0b`
    - il-quote-record: `{{size:il-quote-body}}`
      - il-quote-body: `01 01 7f 41 22 10 03`
        - il-quote-exit: `02 40 03 40 20 00 20 01 4f 0d 01 20 00 2d 00 00 21 02`
          - il-quote-tab: `20 02 41 09 46 04 40 41 dc00 10 03 41 f400 10 03`
            - il-quote-other: `05 20 02 41 22 46 20 02 41 dc00 46 72 04 40 41 dc00 10 03 0b 20 02 10 03 0b`
          - il-quote-next: `20 00 41 01 6a 21 00 0c 00 0b 0b 41 22 10 03 0b`
    - il-duplicate-record: `{{size:il-duplicate-body}}`
      - il-duplicate-body: `01 03 7f`
        - il-duplicate-exit: `02 40 03 40`
          - il-duplicate-bound: `20 00 20 01 4f 0d 01 20 00 21 05`
          - il-duplicate-line: `03 40 20 05 2d 00 00 41 0a 46 04 40 05 20 05 41 01 6a 21 05 0c 01 0b 0b`
          - il-duplicate-indent-start: `20 00 21 06`
          - il-duplicate-indent: `02 40 03 40 20 06 20 05 4f 0d 01 20 06 2d 00 00 41 20 47 0d 01 20 06 41 01 6a 21 06 0c 00 0b 0b`
          - il-duplicate-child: `20 06 20 00 6b 20 04 41 02 6c 46 04 40 20 06 41 02 6a 22 06 20 05 10 08 21 07 20 06 20 07 20 02 20 03 10 00 04 40 00 0b 0b`
          - il-duplicate-next: `20 05 41 01 6a 21 00 0c 00 0b 0b 0b`
    - il-quoted-record: `{{size:il-quoted-body}}`
      - il-quoted-body: `00 20 00 41 01 6a 21 00 03 40 20 00 20 01 4f 04 40 00 0b 20 00 2d 00 00 41 22 46 04 40 20 00 41 01 6a 0f 0b 20 00 2d 00 00 41 dc00 46 04 40 20 00 41 01 6a 21 00 0b 20 00 41 01 6a 21 00 0c 00 0b 00 0b`
    - il-whitespace-record: `{{size:il-whitespace-body}}`
      - il-whitespace-body: `00 20 00 41 20 46 20 00 41 09 46 72 20 00 41 0a 46 72 20 00 41 0d 46 72 0b`
    - il-trim-record: `{{size:il-trim-body}}`
      - il-trim-body: `00`
        - il-trim-start: `02 40 03 40 20 00 20 01 4f 0d 01 20 00 2d 00 00 41 20 46 20 00 2d 00 00 41 09 46 72 45 0d 01 20 00 41 01 6a 21 00 0c 00 0b 0b`
        - il-trim-end: `02 40 03 40 20 00 20 01 4f 0d 01 20 01 41 01 6b 2d 00 00 41 20 46 20 01 41 01 6b 2d 00 00 41 09 46 72 45 0d 01 20 01 41 01 6b 21 01 0c 00 0b 0b 20 00 20 01 0b`
    - il-section-record: `{{size:il-section-body}}`
      - il-section-body: `01 07 7f`
        - il-section-start: `23 03 41 01 6a 21 00`
        - il-section-scan: `02 40 03 40 20 00 23 04 4f 04 40 00 0b 20 00 2d 00 00 41 dd00 46 0d 01 20 00 2d 00 00 41 db00 46 04 40 00 0b 20 00 41 01 6a 21 00 0c 00 0b 0b`
        - il-section-name: `23 03 41 01 6a 20 00 10 0a 21 02 21 01 20 01 20 02 46 04 40 00 0b`
        - il-section-after: `20 00 41 01 6a 21 06 20 06 23 04 49 04 40`
          - il-section-separation: `20 06 2d 00 00 41 20 47 20 06 2d 00 00 41 09 47 71 04 40 00 0b`
          - il-section-comment: `20 06 23 04 10 0a 1a 21 06 20 06 23 04 49 04 40 20 06 2d 00 00 41 23 47 20 06 2d 00 00 41 3b 47 71 04 40 00 0b 0b 0b`
        - il-section-prefix: `23 00 21 03 41 01 10 04 23 00 21 04 20 01 20 02 10 06 23 00 21 05`
        - il-section-unique: `41 858004 20 03 20 04 20 05 41 01 10 07`
        - il-section-marker: `41 20 10 03 41 fb00 10 03 41 fd00 10 03 41 0a 10 03 23 00 24 06 0b`
    - il-assignment-record: `{{size:il-assignment-body}}`
      - il-assignment-body: `01 08 7f`
        - il-assignment-start: `23 03 21 00`
        - il-assignment-scan: `02 40 03 40 20 00 23 04 4f 04 40 00 0b 20 00 2d 00 00 41 3d 46 20 00 2d 00 00 41 3a 46 72 0d 01 20 00 41 01 6a 21 00 0c 00 0b 0b`
        - il-assignment-key: `23 03 20 00 10 0a 21 02 21 01 20 01 20 02 46 04 40 00 0b`
        - il-assignment-value: `20 00 41 01 6a 23 04 10 0a 21 04 21 03`
        - il-assignment-global: `23 06 45 04 40 41 01 10 04 41 00 41 00 10 06 41 20 10 03 41 fb00 10 03 41 fd00 10 03 41 0a 10 03 23 00 24 06 0b`
        - il-assignment-prefix: `23 00 21 05 41 02 10 04 23 00 21 06 20 01 20 02 10 06 23 00 21 07`
        - il-assignment-unique: `23 06 20 05 20 06 20 07 41 02 10 07`
        - il-assignment-output: `41 20 10 03 20 03 20 04 10 06 41 0a 10 03 0b`
- il-data-section: `0b {{size:il-data}}`
  - il-data: `01 00 41 80820c 0b {{size:il-literals}}`
    - il-literals: `06 606060696e69`

Section locals: closing bracket 0, source name start/end 1/2, output line
start 3, output key start/end 4/5, trailing cursor 6. Assignment locals:
delimiter 0, source key start/end 1/2, source value start/end 3/4, output line
start 5, output key start/end 6/7. Line locals: cursor 0, byte 1.
