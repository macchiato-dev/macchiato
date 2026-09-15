# Hierarchical Markdown sections to INI

Tool 21 writes an `ini` fence from a two-level object: section names contain
objects whose values are strings. This is the representation produced by the
[INI reader](20-ini-to-list.md), not an arbitrary tree flattened into paths.

```text
- {}
  - "" {}
    - name Ben
  - server {}
    - host localhost
    - port "3030"
  - empty {}
```

becomes:

```ini
name = Ben
[server]
host = localhost
port = 3030
[empty]
```

## Preserve what this dialect can represent

INI dialects differ. This writer targets the reader's explicit dialect:
case-sensitive names, no interpolation, no interpretation of quoted values,
no inline value comments and no type inference. Quotes and backslashes are
ordinary value characters. A string `false` stays a string; a typed Boolean
is rejected rather than silently converted to one.

The empty section name means assignments before the first header. It must
come first and contain at least one assignment: an empty unnamed section
cannot be represented by this dialect. Named empty sections are preserved.
The empty root object becomes an empty INI fence. Other ordering is retained.
Duplicate decoded section names and keys within a section are rejected.

Names and values may not begin or end with spaces or tabs, because the reader
would trim them. Empty values are allowed, empty assignment keys are not.
Section names cannot contain `[` or `]`. Assignment keys cannot contain `=`
or `:`, or start with `[`, `#` or `;`. Values may contain these characters.
Raw or escaped line breaks, other C0 controls except tab, DEL and lone
surrogates are rejected. Internal tabs, Unicode, literal quotes, backslashes
and comment-looking value text are preserved.

There is no invented quoting scheme to conceal an unrepresentable value.
For those values, use one of the JSON, TOML or YAML transformations instead.

## Pattern: decode once, validate for the destination position

The list compiler first validates the Markdown tree and emits compact JSON.
Its body is copied to the final memory page. A two-level traversal checks
section and assignment shapes. A shared string decoder combines surrogate
pairs and emits UTF-8 while checking the restrictions for a section name,
assignment key or value. The JSON scanner only visits already validated
JSON, so it need not be a second parser.

```text
compile the list; copy its compact JSON body to scratch
require an object root
for each section:
  reject a duplicate decoded section name
  unnamed: require first position and a nonempty object
  named: emit '[' + decoded section name + ']' and a newline
  require an object of assignments
  for each assignment:
    reject a duplicate decoded key
    require a string value
    emit decoded key + ' = ' + decoded value and a newline
```

Duplicate checks rescan earlier members of the current object, skipping
their values. This costs quadratic time for wide objects but needs no key
table or heap. Only two collection levels are traversed by this writer.
Input and compact intermediate JSON each have a 64 KiB limit; output has a
128 KiB limit. The fixed four-page memory preserves the input. The temporary
JSON replaces the list compiler's stack after compilation has finished.
A failed run may leave partial output; the UI keeps its previous successful
output instead. The next run rebuilds the list stack and resets the writer.

## Module

Imports: list-run 0, equal 1, next-unit 2, and shared memory. Definitions:
run 3, emit 4, scan 5, string 6, UTF-8 7, mapping 8, unique 9.
Globals: output 0, source cursor 1, source end 2. The scan and UTF-8 patterns
are repeated visibly from the TOML writer, not hidden in the assembler.

`[microwasm]`

- li-header: `0061736d 01000000`
- li-type-section: `01 {{size:li-types}}`
  - li-types: `05 60 01 7f 01 7f 60 04 7f 7f 7f 7f 01 7f 60 03 7f 7f 7f 03 7f 7f 7f 60 01 7f 00 60 03 7f 7f 7f 00`
- li-import-section: `02 {{size:li-imports}}`
  - li-imports: `04 01 6c 03 72756e 00 00 01 6b 05 657175616c 00 01 01 6b 04 6e657874 00 02 01 6c 06 6d656d6f7279 02 01 04 04`
- li-function-section: `03 {{size:li-functions}}`
  - li-functions: `07 00 03 00 04 03 03 04`
- li-global-section: `06 {{size:li-globals}}`
  - li-globals: `03 7f 01 41 00 0b 7f 01 41 00 0b 7f 01 41 00 0b`
- li-export-section: `07 {{size:li-exports}}`
  - li-exports: `02 03 72756e 00 03 06 6d656d6f7279 02 00`
- li-code-section: `0a {{size:li-code}}`
  - li-code: `07`
    - li-run-record: `{{size:li-run-body}}`
      - li-run-body: `01 01 7f`
        - li-compile: `20 00 10 00 41 0d 6b 21 01`
        - li-source-bound: `20 01 45 20 01 41 808004 4b 72 04 40 00 0b`
        - li-source-copy: `41 80800c 41 888004 20 01 fc 0a 00 00`
        - li-reset: `41 808004 24 00 41 80800c 24 01 41 80800c 20 01 6a 24 02`
        - li-fence: `41 e000 10 04 41 e000 10 04 41 e000 10 04 41 e900 10 04 41 ee00 10 04 41 e900 10 04 41 0a 10 04`
        - li-root: `41 00 10 08 23 01 23 02 47 04 40 00 0b`
        - li-close: `41 e000 10 04 41 e000 10 04 41 e000 10 04 41 0a 10 04 23 00 41 808004 6b 0b`
    - li-emit-record: `{{size:li-emit-body}}`
      - li-emit-body: `00 23 00 41 80800c 4f 04 40 00 0b 23 00 20 00 3a 00 00 23 00 41 01 6a 24 00 0b`
    - li-scan-record: `{{size:li-scan-body}}`
      - li-scan-body: `01 03 7f`
        - li-scan-exit: `02 40`
          - li-scan-loop: `03 40`
            - li-scan-bound: `20 00 23 02 4f 0d 01`
            - li-scan-byte: `20 00 2d 00 00 21 03`
            - li-scan-string: `20 02 04 40`
              - li-scan-escape: `20 03 41 dc00 46 04 40 20 00 41 01 6a 21 00`
                - li-scan-string-close: `05 20 03 41 22 46 04 40 41 00 21 02 0b 0b`
              - li-scan-outside: `05 20 03 41 22 46 04 40 41 01 21 02`
                - li-scan-structure: `05`
                - li-scan-stop: `20 01 45 20 03 41 2c 46 20 03 41 3a 46 72 20 03 41 dd00 46 72 20 03 41 fd00 46 72 71 0d 03`
                - li-scan-open: `20 03 41 db00 46 20 03 41 fb00 46 72 04 40 20 01 41 01 6a 21 01 0b`
                - li-scan-close: `20 03 41 dd00 46 20 03 41 fd00 46 72 04 40 20 01 41 01 6b 21 01 0b 0b 0b`
            - li-scan-next: `20 00 41 01 6a 21 00 0c 00 0b 0b`
        - li-scan-result: `20 00 0b`
    - li-string-record: `{{size:li-string-body}}`
      - li-string-body: `01 05 7f`
        - li-string-open: `20 00 41 01 6a 21 00 20 01 41 01 6b 21 01`
        - li-string-exit: `02 40`
          - li-string-loop: `03 40`
            - li-string-unit: `20 00 20 01 20 03 10 02 21 03 21 00 21 04`
            - li-string-end: `20 04 41 7f 46 0d 01`
            - li-string-high: `20 04 41 80b003 6b 41 ff07 4d 04 40`
              - li-string-low: `20 00 20 01 20 03 10 02 21 03 21 00 21 05`
              - li-string-low-check: `20 05 41 80b803 6b 41 ff07 4b 04 40 00 0b`
              - li-string-pair: `20 04 41 80b003 6b 41 0a 74 20 05 41 80b803 6b 6a 41 808004 6a 21 04`
              - li-string-lone-low: `05 20 04 41 80b803 6b 41 ff07 4d 04 40 00 0b 0b`
            - li-string-control: `20 04 41 20 49 20 04 41 09 47 71 20 04 41 ff00 46 72 04 40 00 0b`
            - li-string-first-space: `20 06 45 20 04 41 20 46 20 04 41 09 46 72 71 04 40 00 0b`
            - li-string-section: `20 02 45 04 40 20 04 41 db00 46 20 04 41 dd00 46 72 04 40 00 0b 0b`
            - li-string-key: `20 02 41 01 46 04 40`
              - li-string-key-separator: `20 04 41 3d 46 20 04 41 3a 46 72 04 40 00 0b`
              - li-string-key-first: `20 06 45 20 04 41 db00 46 20 04 41 23 46 72 20 04 41 3b 46 72 71 04 40 00 0b 0b`
            - li-string-emit: `20 04 10 07 20 04 21 07 20 06 41 01 6a 21 06`
            - li-string-next: `0c 00 0b 0b`
        - li-string-empty: `20 02 41 02 47 20 06 45 71 04 40 00 0b`
        - li-string-last-space: `20 07 41 20 46 20 07 41 09 46 72 04 40 00 0b 0b`
    - li-utf8-record: `{{size:li-utf8-body}}`
      - li-utf8-body: `00`
        - li-utf8-ascii: `20 00 41 8001 49 04 40 20 00 10 04 0f 0b`
        - li-utf8-two: `20 00 41 8010 49 04 40 20 00 41 06 76 41 c001 72 10 04`
          - li-utf8-more: `05 20 00 41 808004 49 04 40 20 00 41 0c 76 41 e001 72 10 04`
            - li-utf8-four: `05 20 00 41 12 76 41 f001 72 10 04 20 00 41 0c 76 41 3f 71 41 8001 72 10 04 0b`
          - li-utf8-middle: `20 00 41 06 76 41 3f 71 41 8001 72 10 04 0b`
        - li-utf8-last: `20 00 41 3f 71 41 8001 72 10 04 0b`
    - li-mapping-record: `{{size:li-mapping-body}}`
      - li-mapping-body: `01 04 7f`
        - li-mapping-kind: `23 01 2d 00 00 41 fb00 47 04 40 00 0b 23 01 41 01 6a 24 01`
        - li-mapping-empty: `23 01 2d 00 00 41 fd00 46 04 40 23 01 41 01 6a 24 01 0f 0b`
        - li-mapping-start: `23 01 21 01`
        - li-mapping-loop: `03 40`
          - li-mapping-key: `23 01 21 02 23 01 10 05 21 03 20 01 20 02 20 03 10 09`
          - li-mapping-section: `20 00 45 04 40`
            - li-section-unnamed: `20 03 20 02 6b 41 02 46 22 04 04 40 20 02 20 01 47 04 40 00 0b`
              - li-section-named: `05 41 db00 10 04 20 02 20 03 41 00 10 06 41 dd00 10 04 41 0a 10 04 0b`
            - li-section-value: `20 03 41 01 6a 24 01`
            - li-section-unnamed-empty: `20 04 23 01 41 01 6a 2d 00 00 41 fd00 46 71 04 40 00 0b`
            - li-section-entries: `41 01 10 08`
          - li-mapping-assignment: `05`
            - li-assignment-key: `20 02 20 03 41 01 10 06 41 20 10 04 41 3d 10 04 41 20 10 04 20 03 41 01 6a 24 01`
            - li-assignment-string: `23 01 2d 00 00 41 22 47 04 40 00 0b 23 01 10 05 21 03 23 01 20 03 41 02 10 06 20 03 24 01 41 0a 10 04 0b`
          - li-mapping-close: `23 01 2d 00 00 41 fd00 46 04 40 23 01 41 01 6a 24 01 0f 0b`
          - li-mapping-next: `23 01 41 01 6a 24 01 0c 00 0b 0b`
    - li-unique-record: `{{size:li-unique-body}}`
      - li-unique-body: `01 01 7f`
        - li-unique-exit: `02 40 03 40 20 00 20 01 4f 0d 01`
          - li-unique-previous: `20 00 10 05 21 03 20 00 20 03 20 01 20 02 10 01 04 40 00 0b`
          - li-unique-next: `20 03 41 01 6a 10 05 41 01 6a 21 00 0c 00 0b 0b 0b`

String locals: cursor/end 0/1, position kind 2 (section 0, key 1, value 2),
pending low surrogate 3, current scalar 4, low surrogate 5, count 6, last
scalar 7. Mapping locals: kind 0 (root 0, section 1), first key 1, current
key start/end 2/3, unnamed flag 4. Unique locals: earlier key start 0,
current key start/end 1/2, earlier key end 3.
